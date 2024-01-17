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
    }
}
