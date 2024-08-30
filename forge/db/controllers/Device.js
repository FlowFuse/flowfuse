const SemVer = require('semver')
const { literal } = require('sequelize')

const { ControllerError } = require('../../lib/errors')

/** @type {import('../../auditLog/team').getLoggers} */
const getTeamLogger = (app) => { return app.auditLog.Team }

module.exports = {
    isDeploying: function (app, device) {
        // Needs to have a target to be considered deploying
        if (!device.targetSnapshotId) {
            return false
        }

        // Active snapshot does not match target, consider this device deploying
        return device.activeSnapshotId !== device.targetSnapshotId
    },
    // Set the connected state of a device without needing to retrieve the model
    // first. This is used when the platform is shutting down to proactively mark
    // the devices as not-connected.
    setConnected: function (app, deviceHashId, isConnected) {
        const deviceId = app.db.models.Device.decodeHashid(deviceHashId)
        if (deviceId?.length > 0) {
            app.db.models.Device.update({
                editorConnected: isConnected
            }, {
                where: { id: deviceId }
            })
        }
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
            device.set('editorAffinity', state.affinity || null)
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
    },

    /**
     * Bulk delete devices.
     * Notes:
     *  * All devices must belong to the same team
     *  * All devices must be present in the database
     * @param {*} app - Forge app instance
     * @param {*} team - User's team
     * @param {Array<string>} deviceIds - Array of device hashids
     * @param {*} user - User performing the deletion (required for audit logging)
     */
    bulkDelete: async function (app, team, deviceIds, user) {
        if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
            throw new ControllerError('invalid_input', 'No devices specified', 400)
        }

        // convert hashids to ids
        const idsDecoded = deviceIds.map(hashid => hashid && app.db.models.Device.decodeHashid(hashid))
        const ids = idsDecoded.map(id => id && Array.isArray(id) ? id[0] : null).filter(id => id)

        // find all where id in ids
        const devices = await app.db.models.Device.findAll({ where: { id: ids } })
        if (devices.length === 0) {
            throw new ControllerError('not_found', 'No devices found', 404)
        }

        // ensure all devices are part of the same team
        const deviceTeam = await app.db.models.Team.byId(devices[0].TeamId)
        if (!deviceTeam || deviceTeam.id !== team.id) {
            throw new ControllerError('invalid_input', 'Devices must belong to the users team', 400)
        }
        if (devices.some(d => d.TeamId !== team.id)) {
            throw new ControllerError('invalid_input', 'All devices must belong to the same team', 400)
        }

        // delete all devices
        await app.db.models.Device.destroy({ where: { id: ids } })
        if (app.license.active() && app.billing) {
            await app.billing.updateTeamDeviceCount(team)
        }

        // Log the deletion
        const teamLogger = getTeamLogger(app)
        teamLogger.team.device.bulkDeleted(user, null, team, devices)
    },

    moveDevices: async function (app, deviceIds, targetApplicationId, targetInstanceId, user) {
        // target is either a project or an application
        if (targetApplicationId && targetInstanceId) {
            throw new ControllerError('invalid_input', 'Target must be either an application or an instance', 400)
        }

        // Get devices
        const idsDecoded = deviceIds.map(hashid => hashid && app.db.models.Device.decodeHashid(hashid))
        const ids = idsDecoded.map(id => id && Array.isArray(id) ? id[0] : null).filter(id => id)
        const devicesData = await app.db.models.Device.getAll({}, { id: ids }, { includeInstanceApplication: true })
        if (!devicesData?.count) {
            throw new ControllerError('not_found', 'No devices found', 404)
        }
        const devices = devicesData.devices

        // Check devices and the target are all part of the same team
        /** @type {'instance'|'application'|null} */
        const assignTo = targetInstanceId ? 'instance' : (targetApplicationId ? 'application' : null)
        const assignToApplication = assignTo === 'application' ? await app.db.models.Application.byId(targetApplicationId) : null
        const assignToProject = assignTo === 'instance' ? await app.db.models.Project.byId(targetInstanceId) : null
        const team = await app.db.models.Team.byId(devices[0].TeamId)
        if (!team) {
            throw new ControllerError('not_found', 'No team found', 404)
        }
        if (assignTo === 'application' && !assignToApplication) {
            throw new ControllerError('not_found', 'No application found', 404)
        }
        if (assignTo === 'instance' && !assignToProject) {
            throw new ControllerError('not_found', 'No instance found', 404)
        }
        if (assignToApplication && assignToApplication.TeamId !== team.id) {
            throw new ControllerError('invalid_application', 'Target application does not belong to the same team', 400)
        }
        if (assignToProject && assignToProject.TeamId !== team.id) {
            throw new ControllerError('invalid_instance', 'Target instance does not belong to the same team', 400)
        }
        if (devices.some(d => d.TeamId !== team.id)) {
            throw new ControllerError('invalid_input', 'All devices must belong to the same team', 400)
        }

        // Prepare the updates
        const logEntries = []
        const devicesToUpdate = []
        const projectSettings = await assignToProject?.getSetting('deviceSettings') || {}
        const projectTargetSnapshotId = projectSettings.targetSnapshot || null
        for (let index = 0; index < devices.length; index++) {
            const device = devices[index]
            if (!assignTo) {
                // ### Remove device from application/project ###
                let previousOwner
                if (!device.Project && device.Application) {
                    previousOwner = {
                        id: device.Application.id,
                        name: device.Application.name,
                        isApplicationOwned: true
                    }
                } else if (device.Project) {
                    previousOwner = {
                        id: device.Project.id,
                        name: device.Project.name,
                        isApplicationOwned: false
                    }
                } else {
                    continue // Device is already unassigned - nothing to do
                }
                device.ProjectId = null // unassign from project
                device.ApplicationId = null // unassign from application
                device.targetSnapshotId = null // clear the target snapshot
                device.DeviceGroupId = null // clear the deviceGroup
                // RE: disable developer mode - this behaviour is aligned with the device update API endpoint
                device.mode = 'autonomous' // disable developer mode
                devicesToUpdate.push(device)
                logEntries.push({
                    logger: app.auditLog.Team.team.device.unassigned,
                    params: [user, null, team, previousOwner, device]
                })
                if (previousOwner.isApplicationOwned) {
                    logEntries.push({
                        logger: app.auditLog.Application.application.device.unassigned,
                        params: [user, null, previousOwner, device]
                    })
                } else {
                    logEntries.push({
                        logger: app.auditLog.Project.project.device.unassigned,
                        params: [user, null, previousOwner, device]
                    })
                }
            } else if (assignTo === 'instance') {
                // ### Add device to instance ###
                if (device.ownerType === 'instance' && device.Project?.id === assignToProject.id) {
                    // Device is already assigned to this instance - nothing to do
                    continue
                } else {
                    device.ProjectId = assignToProject.id
                    device.ApplicationId = null
                    device.targetSnapshotId = projectTargetSnapshotId // inherit the target snapshot of the project
                    device.DeviceGroupId = null // not relevant to instance devices
                    devicesToUpdate.push(device)
                    logEntries.push({
                        logger: app.auditLog.Team.team.device.assigned,
                        params: [user, null, team, assignToProject, device]
                    })
                    logEntries.push({
                        logger: app.auditLog.Project.project.device.assigned,
                        params: [user, null, assignToProject, device]
                    })
                    logEntries.push({
                        logger: app.auditLog.Device.device.assigned,
                        params: [user, null, assignToProject, device]
                    })
                }
            } else if (assignTo === 'application') {
                // ### Add device to application ###
                if (device.ownerType === 'application' && device.Application?.id === assignToApplication.id) {
                    // Device is already assigned to this application - nothing to do
                    continue
                } else {
                    device.ApplicationId = assignToApplication.id
                    device.ProjectId = null
                    device.targetSnapshotId = null
                    device.DeviceGroupId = null
                    devicesToUpdate.push(device)
                    logEntries.push({
                        logger: app.auditLog.Team.team.device.assigned,
                        params: [user, null, team, assignToApplication, device]
                    })
                    logEntries.push({
                        logger: app.auditLog.Application.application.device.assigned,
                        params: [user, null, assignToApplication, device]
                    })
                    logEntries.push({
                        logger: app.auditLog.Device.device.assigned,
                        params: [user, null, assignToApplication, device]
                    })
                }
            }
        }

        // Save the updates in one transaction to ensure consistency
        const transaction = await app.db.sequelize.transaction()
        try {
            for (let index = 0; index < devicesToUpdate.length; index++) {
                const device = devicesToUpdate[index]
                await device.save({ transaction })
            }
            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        }

        // Send update command
        const updatedIds = devicesToUpdate.map(d => d.id)
        const updatedDevices = await app.db.models.Device.getAll(undefined, { id: updatedIds }, { includeInstanceApplication: true })
        if (!updatedDevices.count) {
            return updatedDevices
        }
        for (let index = 0; index < updatedDevices.devices.length; index++) {
            const device = updatedDevices.devices[index]
            await this.sendDeviceUpdateCommand(app, device)
        }

        // Log the changes
        for (let index = 0; index < logEntries.length; index++) {
            const logEntry = logEntries[index]
            await logEntry.logger(...logEntry.params)
        }

        return updatedDevices
    }
}
