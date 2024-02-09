const { Op } = require('sequelize')
const DEVICE_AUTO_SNAPSHOT_LIMIT = 10
const DEVICE_AUTO_SNAPSHOT_PREFIX = 'Auto Snapshot'

const deviceAutoSnapshotUtils = {
    deployTypeEnum: {
        full: 'Full',
        flows: 'Modified Flows',
        nodes: 'Modified Nodes'
    },
    // nameRegex should start with prefix then have - and then a date in the format YYYY-MM-DD HH:MM:SS
    nameRegex: new RegExp(`^${DEVICE_AUTO_SNAPSHOT_PREFIX} - \\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$`),
    prefix: DEVICE_AUTO_SNAPSHOT_PREFIX,
    autoBackupLimit: DEVICE_AUTO_SNAPSHOT_LIMIT,
    generateName: () => `${DEVICE_AUTO_SNAPSHOT_PREFIX} - ${new Date().toLocaleString('sv-SE')}`, // "base - YYYY-MM-DD HH:MM:SS"
    generateDescription: (deploymentType = '') => {
        const deployInfo = deviceAutoSnapshotUtils.deployTypeEnum[deploymentType]
            ? `'${deviceAutoSnapshotUtils.deployTypeEnum[deploymentType]}' deployment`
            : 'deployment'
        return `${deviceAutoSnapshotUtils.prefix} taken following a ${deployInfo} made on the Device`
    },
    isAutoSnapshot: function (snapshot) {
        return deviceAutoSnapshotUtils.nameRegex.test(snapshot.name)
    },
    getAutoSnapshots: async function (app, device, excludeInUse = true) {
        // const pattern = deviceAutoSnapshotUtils.nameRegex
        // ^ regex is not supported by sqlite!
        // instead, since we know how long the prefix is, we can just check the length is correct
        // and that it matches the pattern using the `like` operator
        const pattern = `${DEVICE_AUTO_SNAPSHOT_PREFIX} - %-%-% %:%:%`
        const expectedLength = 35 // 35 is the length of the "prefix - yyyy-mm-dd hh:mm:ss" string
        const snapshots = await app.db.models.ProjectSnapshot.findAll({
            where: {
                DeviceId: device.id,
                // name: { [Op.regexp]: pattern }
                name: {
                    [Op.and]: [
                        { [Op.like]: pattern },
                        { [Op.and]: { [Op.gte]: expectedLength } }
                    ]
                }
            },
            order: [['id', 'ASC']]
        })

        // ensure that the snapshots are actually auto snapshots (use the regex to verify)
        const snapshotsMatchingRegex = snapshots.filter(deviceAutoSnapshotUtils.isAutoSnapshot)

        // if we're not excluding "in use" snapshots, we can just return the matching snapshots
        if (!excludeInUse) {
            return snapshotsMatchingRegex
        }

        // candidates for deletion are those that are not in use
        let autoSnapshotIds = snapshotsMatchingRegex.map((snapshot) => snapshot.id)

        // utility function to remove items from an array
        const removeFromArray = (baseList, removeList) => baseList.filter((item) => !removeList.includes(item))

        // since we're excluding "in use" snapshots, we need to check the
        // device, device groups and pipeline stage device group tables
        // for any of these snapshots being set as the active/targetSnapshotId

        // get all devices that have this snapshot as the target or active snapshot
        const snapshotsInUseInDevices = await app.db.models.Device.findAll({
            where: {
                [Op.or]: [
                    { targetSnapshotId: { [Op.in]: autoSnapshotIds } },
                    { activeSnapshotId: { [Op.in]: autoSnapshotIds } }
                ]
            }
        })
        const inUseAsTarget = snapshotsInUseInDevices.map((device) => device.targetSnapshotId)
        const inUseAsActive = snapshotsInUseInDevices.map((device) => device.activeSnapshotId)
        autoSnapshotIds = removeFromArray(autoSnapshotIds, inUseAsTarget)
        autoSnapshotIds = removeFromArray(autoSnapshotIds, inUseAsActive)

        // get all device groups that have this snapshot as the target snapshot
        const snapshotsInUseInDeviceGroups = await app.db.models.DeviceGroup.findAll({
            where: {
                targetSnapshotId: { [Op.in]: autoSnapshotIds }
            }
        })
        const inGroupAsTarget = snapshotsInUseInDeviceGroups.map((group) => group.targetSnapshotId)
        autoSnapshotIds = removeFromArray(autoSnapshotIds, inGroupAsTarget)

        // get all pipeline stage device groups that have this snapshot as the target snapshot
        const snapshotsInUseInPipelineStage = await app.db.models.PipelineStageDeviceGroup.findAll({
            where: {
                targetSnapshotId: { [Op.in]: autoSnapshotIds }
            }
        })
        const inPipelineStageAsTarget = snapshotsInUseInPipelineStage.map((stage) => stage.targetSnapshotId)
        autoSnapshotIds = removeFromArray(autoSnapshotIds, inPipelineStageAsTarget)

        return snapshots.filter((snapshot) => autoSnapshotIds.includes(snapshot.id))
    },
    cleanupAutoSnapshots: async function (app, device, limit = DEVICE_AUTO_SNAPSHOT_LIMIT) {
        const snapshots = await app.db.controllers.ProjectSnapshot.getDeviceAutoSnapshots(device, true)
        if (snapshots.length > limit) {
            const toDelete = snapshots.slice(0, snapshots.length - limit)
            await Promise.all(toDelete.map((snapshot) => snapshot.destroy()))
        }
    },
    doAutoSnapshot: async function (app, device, deploymentType, options, meta) {
        // eslint-disable-next-line no-useless-catch
        try {
            const saneSnapshotOptions = {
                name: deviceAutoSnapshotUtils.generateName(),
                description: deviceAutoSnapshotUtils.generateDescription(deploymentType),
                setAsTarget: options?.setAsTarget === true
            }

            // things to do & consider:
            // 1. create a snapshot from the device
            // 2. log the snapshot creation in audit log
            // 3. delete older auto snapshots if the limit is reached (10)
            //    do NOT delete any snapshots that are currently in use by an target (instance/device/device group)
            const user = meta?.user || { id: null } // if no user is available, use `null` (system user)

            // 1. create a snapshot from the device
            const snapShot = await app.db.controllers.ProjectSnapshot.createDeviceSnapshot(
                device.Application,
                device,
                user,
                saneSnapshotOptions
            )
            snapShot.User = user

            // 2. log the snapshot creation in audit log
            // TODO: device snapshot:  implement audit log
            // await deviceAuditLogger.device.snapshot.created(request.session.User, null, request.device, snapShot)

            // 3. clean up older auto snapshots
            if (options?.clean === true) {
                await app.db.controllers.ProjectSnapshot.cleanupDeviceAutoSnapshots(device)
            }

            return snapShot
        } catch (error) {
            // TODO: device snapshot:  implement audit log
            // await deviceAuditLogger.device.snapshot.created(request.session.User, error, request.device, null)
            throw error
        }
    }
}

// freeze the object to prevent accidental changes
Object.freeze(deviceAutoSnapshotUtils)

module.exports = {
    /**
     * Creates a snapshot of the current state of a project.
     * Patches with flows, credentials, settings modules and env from request, if provided
     *
     * @param {*} app
     * @param {*} project
     */
    createSnapshot: async function (app, project, user, options) {
        const projectExport = await app.db.controllers.Project.exportProject(project)

        const snapshotOptions = {
            name: options.name || '',
            description: options.description || '',
            settings: {
                settings: projectExport.settings || {},
                env: projectExport.env || {},
                modules: projectExport.modules || {}
            },
            flows: {
                flows: projectExport.flows,
                credentials: projectExport.credentials
            },
            ProjectId: project.id,
            UserId: user.id
        }
        if (options.flows) {
            const projectSecret = await project.getCredentialSecret()
            snapshotOptions.flows.flows = options.flows
            snapshotOptions.flows.credentials = app.db.controllers.Project.exportCredentials(options.credentials || {}, options.credentialSecret, projectSecret)
        }
        if (options.settings?.modules) {
            snapshotOptions.settings.modules = options.settings.modules
        }
        if (options.settings?.env) {
            // derive the project's service env but not the rest
            const serviceEnv = ['FF_INSTANCE_ID', 'FF_INSTANCE_NAME', 'FF_PROJECT_ID', 'FF_PROJECT_NAME']
            snapshotOptions.settings.env = {
                ...options.settings.env,
                ...serviceEnv.reduce((obj, key) => {
                    if (key in snapshotOptions.settings.env) {
                        obj[key] = snapshotOptions.settings.env[key]
                    }
                    return obj
                }, { })
            }
        }
        const snapshot = await app.db.models.ProjectSnapshot.create(snapshotOptions)
        await snapshot.save()
        return snapshot
    },

    /**
     * Create a snapshot of an instance owned device
     * @param {*} app
     * @param {*} project
     * @param {*} device
     * @param {*} user
     * @param {*} options
     */
    createSnapshotFromDevice: async function (app, project, device, user, options) {
        const projectExport = await app.db.controllers.Project.exportProject(project)
        const deviceConfig = await app.db.controllers.Device.exportConfig(device)
        const snapshotOptions = {
            name: options.name || '',
            description: options.description || '',
            settings: {
                settings: projectExport.settings || {},
                env: projectExport.env || {},
                modules: projectExport.modules || {}
            },
            flows: {
                flows: projectExport.flows,
                credentials: projectExport.credentials
            },
            ProjectId: project.id,
            UserId: user.id
        }
        if (deviceConfig?.flows) {
            const projectSecret = await project.getCredentialSecret()
            snapshotOptions.flows.flows = deviceConfig.flows
            snapshotOptions.flows.credentials = app.db.controllers.Project.exportCredentials(deviceConfig.credentials || {}, device.credentialSecret, projectSecret)
        }
        if (deviceConfig?.package?.modules) {
            snapshotOptions.settings.modules = deviceConfig.package.modules
        }
        const snapshot = await app.db.models.ProjectSnapshot.create(snapshotOptions)
        await snapshot.save()
        return snapshot
    },

    /**
     * Create a snapshot of an application owned device
     * @param {*} app
     * @param {*} application
     * @param {*} device
     * @param {*} user
     * @param {*} options
     */
    createDeviceSnapshot: async function (app, application, device, user, options) {
        const deviceConfig = await app.db.controllers.Device.exportConfig(device)

        const snapshotOptions = {
            name: options.name || '',
            description: options.description || '',
            settings: {
                settings: {}, // TODO: when device settings at application level are implemented
                env: {}, // TODO: when device settings at application level are implemented
                modules: {} // TODO: when device settings at application level are implemented
            },
            flows: {},
            ApplicationId: application.id,
            DeviceId: device.id,
            UserId: user.id
        }
        if (deviceConfig.flows) {
            snapshotOptions.flows.flows = deviceConfig.flows
            // TODO: device snapshot:  Project.exportCredentials? does this need to refactored to a lib/util function?
            // TODO: device snapshot:  is this step necessary?
            if (deviceConfig.credentials) {
                // TODO: device snapshot:  reconsider when device settings at application level are implemented
                snapshotOptions.flows.credentials = app.db.controllers.Project.exportCredentials(deviceConfig.credentials || {}, device.credentialSecret, device.credentialSecret)
            }
        }
        if (deviceConfig.package?.modules) {
            snapshotOptions.settings.modules = deviceConfig.package.modules
        }
        // calling ProjectSnapshot.create because it's the same model as DeviceSnapshot (the one and only model for snapshots in the db)
        const snapshot = await app.db.models.ProjectSnapshot.create(snapshotOptions)
        await snapshot.save()
        return snapshot
    },
    /**
     * Export specific snapshot.
     * @param {*} app
     * @param {*} project project-originator of this snapshot
     * @param {*} snapshot snapshot object to export
     * @param {Object} options
     * @param {String} options.credentialSecret secret to encrypt credentials with
     * @param {Object} [options.credentials] (Optional) credentials to export. If omitted, credentials of the current project will be re-encrypted, with credentialSecret.
     */
    exportSnapshot: async function (app, project, snapshot, options) {
        let snapshotObj = snapshot.get()
        if (!options.credentialSecret) {
            return null
        }
        const user = await snapshot.getUser()
        if (user) {
            snapshotObj.user = app.db.views.User.userSummary(user)
            const { UserId, id, ...newSnapshotObj } = snapshotObj
            snapshotObj = newSnapshotObj
            snapshotObj.id = snapshotObj.hashid
        }
        const serviceEnv = ['FF_INSTANCE_ID', 'FF_INSTANCE_NAME', 'FF_PROJECT_ID', 'FF_PROJECT_NAME']
        serviceEnv.forEach((key) => {
            delete snapshotObj.settings.env[key]
        })
        const result = {
            ...snapshotObj
        }
        const projectSecret = await project.getCredentialSecret()
        const credentials = options.credentials ? options.credentials : result.flows.credentials

        // if provided credentials already encrypted: "exportCredentials" will just return the same credentials
        // if provided credentials are raw: "exportCredentials" will encrypt them with the secret provided
        // if credentials are not provided: project's flows credentials will be used, they will be encrypted with the provided secret
        const keyToDecrypt = (options.credentials && options.credentials.$) ? options.credentialSecret : projectSecret
        result.flows.credentials = app.db.controllers.Project.exportCredentials(credentials || {}, keyToDecrypt, options.credentialSecret)

        return result
    },

    getDeviceAutoSnapshotDescription: deviceAutoSnapshotUtils.generateDescription,
    getDeviceAutoSnapshotName: deviceAutoSnapshotUtils.generateName,
    getDeviceAutoSnapshots: deviceAutoSnapshotUtils.getAutoSnapshots,
    isDeviceAutoSnapshot: deviceAutoSnapshotUtils.isAutoSnapshot,
    cleanupDeviceAutoSnapshots: deviceAutoSnapshotUtils.cleanupAutoSnapshots,
    doDeviceAutoSnapshot: deviceAutoSnapshotUtils.doAutoSnapshot
}
