const SemVer = require('semver')
const { literal } = require('sequelize')

module.exports = {
    isDeploying: function (app, device) {
        // Needs to have a target to be considered deploying
        if (!device.targetSnapshotId) {
            return false
        }

        // Active snapshot does not match target, consider this device deploying
        return device.activeSnapshotId !== device.targetSnapshotId
    },
    updateState: async function (app, device, state) {
        device.set('lastSeenAt', literal('CURRENT_TIMESTAMP'))
        if (!state) {
            // We have received a `null` state from the device. That means it
            // is busy updating itself. Update our local state to infer as much
            // as we can from that
            device.set('state', 'updating')
        } else {
            if (state.state) {
                device.set('state', state.state)
            }
            if (state.agentVersion) {
                device.set('agentVersion', state.agentVersion)
            }
            if (!state.snapshot || state.snapshot === '0') {
                if (device.activeSnapshotId !== null) {
                    device.set('activeSnapshotId', null)
                }
            } else {
                // Update the activeSnapshotId if valid and not already set
                const snapshotId = app.db.models.ProjectSnapshot.decodeHashid(state.snapshot)
                // hashid.decode returns an array of values, not the raw value.
                if (snapshotId?.length > 0 && snapshotId !== device.activeSnapshotId) {
                    // Check to see if snapshot exists
                    if (await app.db.models.ProjectSnapshot.count({ where: { id: snapshotId }, limit: 1 }) > 0) {
                        device.set('activeSnapshotId', snapshotId[0])
                    }
                }
            }
        }
        await device.save()
    },
    /**
     * Sends the project id, snapshot hash and settings hash to the device
     * so that the device can determine what/if it needs to update
     * @param {forge.db.models.Device} device The device to send an "update" command to
     */
    sendDeviceUpdateCommand: async function (app, device) {
        if (app.comms) {
            let snapshotId = device.targetSnapshot?.hashid || null
            if (snapshotId) {
                // device.targetSnapshot is a limited view so we need to load the it from the db
                // If this device is owned by an instance, check it has an associated instance and that it matches the device's project
                if (!device.isApplicationOwned) {
                    const targetSnapshot = (await app.db.models.ProjectSnapshot.byId(snapshotId))
                    if (!targetSnapshot || !targetSnapshot.ProjectId || targetSnapshot.ProjectId !== device.ProjectId) {
                        snapshotId = null // target snapshot is not associated with this project (possibly orphaned), set it to null
                    }
                }
            }
            const payload = {
                ownerType: device.ownerType,
                application: device.Application?.hashid || null,
                project: device.Project?.id || null,
                snapshot: snapshotId,
                settings: device.settingsHash || null,
                mode: device.mode,
                licensed: app.license.active()
            }
            // if the device is assigned to an application but has no snapshot we need to send enough
            // info to start the device in application mode so that it can start node-red and
            // permit the user to generate new flows and submit a snapshot
            if (device.isApplicationOwned) {
                delete payload.project // exclude project property to avoid triggering the wrong kind of update on the device
                if (!device.agentVersion || SemVer.lt(device.agentVersion, '1.11.0')) {
                    // device is running an agent version < 1.11.0 we need to clear it
                    payload.snapshot = null
                    payload.project = null
                    payload.settings = null
                } else if (payload.snapshot === null) {
                    payload.snapshot = '0' // '0' indicates that the application owned device should start with starter flows
                }
            } else {
                delete payload.application // exclude application property to avoid triggering the wrong kind of update on the device
            }

            // ensure the device has a team association
            let team = device.Team
            if (!team) {
                // reload the device with the team association
                const _device = await app.db.models.Device.byId(device.id)
                team = _device?.Team
                if (!team) {
                    app.log.warn(`Failed to send update command to device ${device.hashid} as it has no team association`)
                    return
                }
            }
            // send out update command
            app.comms.devices.sendCommand(team.hashid, device.hashid, 'update', payload)
        }
    },
    /**
     * Remove platform specific environment variables
     * @param {[{name:string, value:string}]} envVars Environment variables array
     */
    removePlatformSpecificEnvVars: function (app, envVars) {
        if (!envVars || !Array.isArray(envVars)) {
            return []
        }
        return [...envVars.filter(e => e.name.startsWith('FF_') === false)]
    },
    /**
     * Insert platform specific environment variables
     * @param {Device} device The device
     * @param {[{name:string, value:string}]} envVars Environment variables array
     */
    insertPlatformSpecificEnvVars: function (app, device, envVars) {
        if (!envVars || !Array.isArray(envVars)) {
            envVars = []
        }
        const makeVar = (name, value) => {
            return { name, value: value || '', platform: true } // add `platform` flag for UI
        }
        const result = []
        let snapshotId
        let snapshotName

        if (device.isApplicationOwned) {
            snapshotId = device.targetSnapshot ? device.targetSnapshot.hashid : '0' // '0' indicates that the device should start in application mode with starter flows
            snapshotName = device.targetSnapshot ? device.targetSnapshot.name : 'None'
            result.push(makeVar('FF_APPLICATION_ID', device.Application?.hashid || ''))
            result.push(makeVar('FF_APPLICATION_NAME', device.Application?.name || ''))
        } else {
            // assume older device / part of an instance (i.e. NOT at application level)
            snapshotId = device.targetSnapshot?.hashid || ''
            snapshotName = device.targetSnapshot?.name || ''
        }
        result.push(makeVar('FF_DEVICE_ID', device.hashid || ''))
        result.push(makeVar('FF_DEVICE_NAME', device.name || ''))
        result.push(makeVar('FF_DEVICE_TYPE', device.type || ''))
        result.push(makeVar('FF_SNAPSHOT_ID', snapshotId))
        result.push(makeVar('FF_SNAPSHOT_NAME', snapshotName))
        result.push(...app.db.controllers.Device.removePlatformSpecificEnvVars(envVars))
        return result
    },

    /**
     * Export a device config for snapshotting back up to the forge
     * @param {import('../../forge').forge} app Forge app instance
     * @param {Object} device The device to export the config from
     */
    exportConfig: async function (app, device) {
        // request config and flows from device
        if (app.comms) {
            const config = await app.comms.devices.sendCommandAwaitReply(device.Team.hashid, device.hashid, 'upload', { timeout: 10000 })
            if (config) {
                return config
            }
        }
        return null
    },

    /**
     * Takes a comma separated list of key:value,name:smith pairs to an object
     */
    parseFiltersFromString (app, filterString = '') {
        const filters = Object.fromEntries(filterString.split(',').map((filterString) => filterString.split(':')))

        return {
            ...(filters.status ? { state: filters.status } : null),
            ...(filters.lastseen ? { lastseen: filters.lastseen } : null)
        }
    },

    /**
     * Return pagination options for the request including status flag, filters, and order
     * On top of the standard limit/cursor/query
     * @param {import('../../forge').forge} app Forge app instance
     * @param {FastifyRequest} request request
     * @returns {Object}
     */
    getDevicePaginationOptions: function (app, request) {
        const paginationOptions = { ...request.query }
        if (paginationOptions.query) {
            paginationOptions.query = paginationOptions.query.trim()
        }

        paginationOptions.statusOnly = !!paginationOptions.statusOnly

        if (paginationOptions.statusOnly) {
            delete paginationOptions.limit
        }

        if (paginationOptions.filters) {
            paginationOptions.filters = app.db.controllers.Device.parseFiltersFromString(paginationOptions.filters)
        }

        if (paginationOptions.sort) {
            paginationOptions.order = {
                [paginationOptions.sort]: paginationOptions.order
            }
            delete paginationOptions.sort
            delete paginationOptions.dir
        }

        return paginationOptions
    }
}
