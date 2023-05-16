module.exports = {
    /**
     * Creates a snapshot of the current state of a project
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
        const snapshot = await app.db.models.ProjectSnapshot.create(snapshotOptions)
        await snapshot.save()
        return snapshot
    },

    /**
     * Creates a snapshot of the specified device
     * @param {*} app
     * @param {*} project
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
        if (deviceConfig.flows) {
            const projectSecret = await project.getCredentialSecret()
            snapshotOptions.flows.flows = deviceConfig.flows
            snapshotOptions.flows.credentials = app.db.controllers.Project.exportCredentials(deviceConfig.credentials || {}, device.credentialSecret, projectSecret)
        }
        if (deviceConfig.package?.modules) {
            snapshotOptions.settings.modules = deviceConfig.package.modules
        }
        const snapshot = await app.db.models.ProjectSnapshot.create(snapshotOptions)
        await snapshot.save()
        return snapshot
    }
}
