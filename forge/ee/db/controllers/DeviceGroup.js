const { Op, ValidationError } = require('sequelize')

const { ControllerError } = require('../../../lib/errors')

const hasProperty = (obj, key) => obj && Object.prototype.hasOwnProperty.call(obj, key)

class DeviceGroupMembershipValidationError extends ControllerError {
    /**
     * @param {string} code
     * @param {string} message
     * @param {number} statusCode
     * @param {Object} options
     */
    constructor (code, message, statusCode, options) {
        super(code, message, statusCode, options)
        this.name = 'DeviceGroupMembershipValidationError'
    }
}

module.exports = {

    /**
     * Create a Device Group
     * @param {import("../../../forge").ForgeApplication} app The application object
     * @param {string} name The name of the Device Group
     * @param {Object} options
     * @param {Object} [options.application] The application this Device Group will belong to
     * @param {string} [options.description] The description of the Device Group
     * @returns {Promise<Object>} The created Device Group
     */
    createDeviceGroup: async function (app, name, { application = null, description } = {}) {
        // Create a Device Group that devices can be linked to
        // * name is required
        // * application, description are optional
        // * FUTURE: colors (background, border, text) and icon will be optional

        return await app.db.models.DeviceGroup.create({
            name,
            description,
            ApplicationId: application?.id
        })
    },

    /**
     * Update a Device Group.
     *
     * NOTE: If the targetSnapshotId is updated, devices in the group will be informed of the change via `sendUpdateCommand`
     *
     * @param {*} app - The application object
     * @param {*} deviceGroup - The Device Group to update
     * @param {Object} [options] - The options to update the Device Group
     * @param {string} [options.name] - The new name of the Device Group. Exclude to keep the current name.
     * @param {string} [options.description] - The new description of the Device Group. Exclude to keep the current description.
     * @param {number} [options.targetSnapshotId] - The new target snapshot id of the Device Group. Exclude to keep the current snapshot. Send null to clear the current target snapshot.
     */
    updateDeviceGroup: async function (app, deviceGroup, { name = undefined, description = undefined, targetSnapshotId = undefined, settings = undefined } = {}) {
        // * deviceGroup is required.
        // * name, description, color are optional
        if (!deviceGroup) {
            throw new Error('DeviceGroup is required')
        }
        let changed = false
        let saved = false
        if (typeof name !== 'undefined') {
            deviceGroup.name = name
            changed = true
        }
        if (typeof description !== 'undefined') {
            deviceGroup.description = description
            changed = true
        }

        if (typeof settings !== 'undefined' && hasProperty(settings, 'env')) {
            // NOTE: For now, device group settings only support environment variables

            // validate settings
            if (!Array.isArray(settings.env)) {
                throw new ValidationError('Invalid settings')
            }
            settings.env.forEach((envVar) => {
                if (!envVar?.name?.match(/^[a-zA-Z_]+[a-zA-Z0-9_]*$/)) {
                    throw new ValidationError(`Invalid Env Var name '${envVar.name}'`)
                }
            })
            // find duplicates
            const seen = new Set()
            const duplicates = settings.env.some(item => { return seen.size === seen.add(item.name).size })
            if (duplicates) {
                throw new ValidationError('Duplicate Env Var names provided')
            }

            deviceGroup.settings = {
                ...deviceGroup.settings,
                env: settings.env
            }
            changed = true
        }

        if (typeof targetSnapshotId !== 'undefined') {
            let snapshotId = targetSnapshotId
            // ensure the snapshot exists (if targetSnapshotId is not null)
            if (targetSnapshotId) {
                const snapshot = await app.db.models.ProjectSnapshot.byId(targetSnapshotId)
                if (!snapshot) {
                    throw new ValidationError('Snapshot does not exist')
                }
                snapshotId = snapshot.id
            }

            const devices = await deviceGroup.getDevices()
            const transaction = await app.db.sequelize.transaction()

            try {
                deviceGroup.targetSnapshotId = snapshotId
                await deviceGroup.save({ transaction })
                if (devices?.length) {
                    const deviceIds = devices.map(d => d.id)
                    await app.db.models.Device.update({ targetSnapshotId: snapshotId }, { where: { id: deviceIds }, transaction })
                }
                await transaction.commit()
                saved = true
                changed = true
            } catch (err) {
                await transaction.rollback()
                throw err
            }
        }

        if (changed && !saved) {
            await deviceGroup.save()
        }
        await deviceGroup.reload()

        if (changed) {
            await this.sendUpdateCommand(app, deviceGroup)
        }
        return deviceGroup
    },

    updateDeviceGroupMembership: async function (app, deviceGroup, { addDevices, removeDevices, setDevices } = {}) {
        // * deviceGroup is required. The object must be a Sequelize model instance and must include the Devices
        // * addDevices, removeDevices, setDevices are optional
        // * if setDevices is provided, this will be used to set the devices assigned to the group, removing any devices that are not in the set
        // * if addDevices is provided, these devices will be added to the group
        // * if removeDevices is provided, these devices will be removed from the group
        // if a device appears in both addDevices and removeDevices, it will be removed from the group (remove occurs after add)
        if (!setDevices && !addDevices && !removeDevices) {
            return // nothing to do
        }
        if (!deviceGroup || typeof deviceGroup !== 'object') {
            throw new Error('DeviceGroup is required')
        }
        let actualRemoveDevices = []
        let actualAddDevices = []
        const currentMembers = await deviceGroup.getDevices()
        // from this point on, all IDs need to be numeric (convert as needed)
        const currentMemberIds = deviceListToIds(currentMembers, app.db.models.Device.decodeHashid)
        setDevices = setDevices && deviceListToIds(setDevices, app.db.models.Device.decodeHashid)
        addDevices = addDevices && deviceListToIds(addDevices, app.db.models.Device.decodeHashid)
        removeDevices = removeDevices && deviceListToIds(removeDevices, app.db.models.Device.decodeHashid)

        // setDevices is an atomic operation, it will replace the current list of devices with the specified list
        if (typeof setDevices !== 'undefined') {
            // create a list of devices that are currently assigned to the group, minus the devices in the set, these are the ones to remove
            actualRemoveDevices = currentMemberIds.filter(d => !setDevices.includes(d))
            // create a list of devices that are in the set, minus the devices that are currently assigned to the group, these are the ones to add
            actualAddDevices = setDevices.filter(d => !currentMemberIds.includes(d))
        } else {
            if (typeof removeDevices !== 'undefined') {
                actualRemoveDevices = currentMemberIds.filter(d => removeDevices.includes(d))
            }
            if (typeof addDevices !== 'undefined') {
                actualAddDevices = addDevices.filter(d => !currentMemberIds.includes(d))
            }
        }
        let changeCount = 0
        // wrap the operations in a transaction to avoid inconsistent state
        const t = await app.db.sequelize.transaction()
        const targetSnapshotId = deviceGroup.targetSnapshotId || undefined
        try {
            // add devices
            if (actualAddDevices.length > 0) {
                changeCount += actualAddDevices.length
                await this.assignDevicesToGroup(app, deviceGroup, actualAddDevices, targetSnapshotId, t)
            }
            // remove devices
            if (actualRemoveDevices.length > 0) {
                changeCount += actualRemoveDevices.length
                await this.removeDevicesFromGroup(app, deviceGroup, actualRemoveDevices, targetSnapshotId, t)
            }

            // commit the transaction
            await t.commit()
        } catch (err) {
            // Rollback transaction if any errors were encountered
            await t.rollback()
            // if the error is a DeviceGroupMembershipValidationError, rethrow it
            if (err instanceof DeviceGroupMembershipValidationError) {
                throw err
            }
            // otherwise, throw a friendly error message along with the original error
            throw new Error(`Failed to update device group membership: ${err.message}`)
        }
        if (changeCount > 0) {
            // clean up where necessary
            // check to see if the group is now empty
            const remainingDevices = await deviceGroup.deviceCount()
            if (remainingDevices === 0) {
                deviceGroup.targetSnapshotId = null
            }
            await deviceGroup.save()
            // finally, inform the devices an update may be required
            await this.sendUpdateCommand(app, deviceGroup, actualRemoveDevices)
        }
    },

    assignDevicesToGroup: async function (app, deviceGroup, deviceList, applyTargetSnapshot, transaction = null) {
        const deviceIds = await validateDeviceList(app, deviceGroup, deviceList, null)
        const updates = { DeviceGroupId: deviceGroup.id }
        if (typeof applyTargetSnapshot !== 'undefined') {
            updates.targetSnapshotId = applyTargetSnapshot
        }
        await app.db.models.Device.update(updates, { where: { id: deviceIds.addList }, transaction })
    },

    /**
     * Remove 1 or more devices from the specified DeviceGroup
     * Specifying `activeDeviceGroupTargetSnapshotId` will null the `targetSnapshotId` of each device in `deviceList` where it matches
     * This is used to remove the project from a device when being removed from a group where the active snapshot is the one applied by the DeviceGroup
     * @param {*} app The application object
     * @param {number} deviceGroupId The device group id
     * @param {number[]} deviceList A list of devices to remove from the group
     * @param {number} activeDeviceGroupTargetSnapshotId If specified, null devices `targetSnapshotId` where it matches
     */
    removeDevicesFromGroup: async function (app, deviceGroup, deviceList, activeDeviceGroupTargetSnapshotId, transaction = null) {
        const deviceIds = await validateDeviceList(app, deviceGroup, null, deviceList)
        // Before removing from the group, if activeDeviceGroupTargetSnapshotId is specified, null `targetSnapshotId` of each device in `deviceList`
        // where the device ACTUALLY DOES HAVE the matching targetsnapshotid
        if (typeof activeDeviceGroupTargetSnapshotId !== 'undefined') {
            await app.db.models.Device.update({ targetSnapshotId: null }, { where: { id: deviceIds.removeList, DeviceGroupId: deviceGroup.id, targetSnapshotId: activeDeviceGroupTargetSnapshotId }, transaction })
        }
        // null every device.DeviceGroupId row in device table where the id === deviceGroupId and device.id is in the deviceList
        await app.db.models.Device.update({ DeviceGroupId: null }, { where: { id: deviceIds.removeList, DeviceGroupId: deviceGroup.id }, transaction })
    },

    /**
     * Sends an update to all devices in the group and/or the specified list of devices
     * so that they can determine what/if it needs to be updated
     * NOTE: Since device groups only support application owned devices, this will only send updates to application owned devices
     * @param {forge.db.models.DeviceGroup} [deviceGroup] A device group to send an "update" command to
     * @param {Number[]} [deviceList] A list of device IDs to send an "update" command to
     */
    sendUpdateCommand: async function (app, deviceGroup, deviceList) {
        if (app.comms) {
            if (deviceGroup) {
                const devices = await deviceGroup.getDevices()
                if (devices?.length) {
                    // add them to the deviceList if not already present
                    deviceList = deviceList || []
                    for (const device of devices) {
                        if (!deviceList.includes(device.id)) {
                            deviceList.push(device.id)
                        }
                    }
                }
            }
            if (deviceList?.length) {
                const devices = await app.db.models.Device.getAll({}, { id: deviceList })
                if (!devices || !devices.devices || devices.devices.length === 0) {
                    return
                }
                const licenseActive = app.license.active()
                for (const device of devices.devices) {
                    if (device.ownerType !== 'application') {
                        continue // ensure we only send updates to application owned devices
                    }
                    const payload = {
                        ownerType: device.ownerType,
                        application: device.Application?.hashid || null,
                        snapshot: device.targetSnapshot?.hashid || '0', // '0' means starter snapshot + flows
                        settings: device.settingsHash || null,
                        mode: device.mode,
                        licensed: licenseActive
                    }
                    app.comms.devices.sendCommand(device.Team.hashid, device.hashid, 'update', payload)
                }
            }
        }
    },
    DeviceGroupMembershipValidationError
}

/**
 * Convert a list of devices to a list of device ids
 * @param {Object[]|String[]|Number[]} deviceList List of devices to convert to ids
 * @param {Function} decoderFn The decoder function to use on hashes
 * @returns {Number[]} Array of device IDs
 */
function deviceListToIds (deviceList, decoderFn) {
    // Convert a list of devices (object|id|hash) to a list of device ids
    const ids = deviceList?.map(device => {
        let id = device
        if (typeof device === 'string') {
            [id] = decoderFn(device)
        } else if (typeof device === 'object') {
            id = device.id
        }
        return id
    })
    return ids
}

/**
 * Verify devices are suitable for the specified group:
 *
 * * All devices in the list must either have DeviceGroupId===null or DeviceGroupId===deviceGroupId
 * * All devices in the list must belong to the same Application as the DeviceGroup
 * * All devices in the list must belong to the same Team as the DeviceGroup
 * @param {*} app The application object
 * @param {*} deviceGroupId The device group id
 * @param {*} deviceList A list of devices to verify
 */
async function validateDeviceList (app, deviceGroup, addList, removeList) {
    // check to ensure all devices in deviceList are not assigned to any group before commencing
    // Assign 1 or more devices to a DeviceGroup
    if (!deviceGroup || typeof deviceGroup !== 'object') {
        throw new Error('DeviceGroup is required')
    }

    // reload with the Application association if not already loaded
    if (!deviceGroup.Application) {
        await deviceGroup.reload({ include: [{ model: app.db.models.Application }] })
    }

    const teamId = deviceGroup.Application.TeamId
    if (!teamId) {
        throw new Error('DeviceGroup must belong to an Application that belongs to a Team')
    }

    const deviceIds = {
        addList: addList && deviceListToIds(addList, app.db.models.Device.decodeHashid),
        removeList: removeList && deviceListToIds(removeList, app.db.models.Device.decodeHashid)
    }
    const deviceGroupId = deviceGroup.id
    if (deviceIds.addList) {
        const okCount = await app.db.models.Device.count({
            where: {
                id: deviceIds.addList,
                [Op.or]: [
                    { DeviceGroupId: null },
                    { DeviceGroupId: deviceGroupId }
                ],
                ApplicationId: deviceGroup.ApplicationId,
                TeamId: teamId
            }
        })
        if (okCount !== deviceIds.addList.length) {
            throw new DeviceGroupMembershipValidationError('invalid_input', 'One or more devices cannot be added to the group', 400)
        }
    }
    if (deviceIds.removeList) {
        const okCount = await app.db.models.Device.count({
            where: {
                id: deviceIds.removeList,
                DeviceGroupId: deviceGroupId,
                ApplicationId: deviceGroup.ApplicationId,
                TeamId: teamId
            }
        })
        if (okCount !== deviceIds.removeList.length) {
            throw new DeviceGroupMembershipValidationError('invalid_input', 'One or more devices cannot be removed from the group', 400)
        }
    }
    return deviceIds
}
