module.exports = {

    /**
     * Creates a snapshot of the specified device
     * @param {*} app
     * @param {*} application
     * @param {*} device
     * @param {*} user
     * @param {*} options
     */
    createSnapshotFromDevice: async function (app, application, device, user, options) {
        const deviceConfig = await app.db.controllers.Device.exportConfig(device)

        const snapshotOptions = {
            name: options.name || '',
            description: options.description || '',
            settings: {
                settings: {}, // TODO when device settings at application level are implemented
                env: {}, // TODO when device settings at application level are implemented
                modules: {} // TODO when device settings at application level are implemented
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
    }
}
