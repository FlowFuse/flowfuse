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
        if (options.settings?.env){
            // derive the project's service env but not the rest
            const service_env = ["FF_INSTANCE_ID", "FF_INSTANCE_NAME", "FF_PROJECT_ID", "FF_PROJECT_NAME"]
            snapshotOptions.settings.env = {
                ...options.settings.env,
                ...service_env.reduce((obj, key) => {
                    if(key in snapshotOptions.settings.env) {
                        obj[key] = snapshotOptions.settings.env[key];
                    }
                    return obj;
                }, {})}
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
    },
    /**
     * Export specific snapshot.
     * @param {*} app
     * @param {*} project project-originator of this snapshot
     * @snapshot {*} snapshot snapshot object to export
     * @options {*} options.
     * Must include: credentialSecret.
     * Optional: credentials of the target Project (either encrypted or raw).
     * If not given, credentials of the current project will be re-encrypted, with credentialSecret.
     */
    exportSnapshot: async function (app, project, snapshot, options) {

        let snapshotObj = snapshot.get()
        const ctx = `ProjectSnapshotController.exportSnapshot. projectId=${project.id}. Snapshot id=${snapshotObj.hashid}`

        if (!options.credentialSecret){
            console.error(`${ctx}. credentialSecret is missing`)
            return null
        }

        console.log(`${ctx}. Request received`);

        const user = await snapshot.getUser()
        if (user) {
            snapshotObj.user = app.db.views.User.userSummary(user)
            const { UserId, id, ...newSnapshotObj } = snapshotObj;
            snapshotObj = newSnapshotObj;
            snapshotObj.id = snapshotObj.hashid;
        }
        console.log(`${ctx}. Snapshot is extracted`);

        const proj_env_anonymization_list = ['FF_INSTANCE_ID', 'FF_INSTANCE_NAME', 'FF_PROJECT_ID', 'FF_PROJECT_NAME']
        proj_env_anonymization_list.forEach((key) => {
            delete snapshotObj.settings.env[key];
        });

        let result = null;
        try{
            result = {
                ...snapshotObj
            }
        }
        catch(error){
            console.log(`${ctx}: ${error}`)
            throw error
        }

        const projectSecret = await project.getCredentialSecret()
        const credentials = options.credentials? options.credentials: result.flows.credentials

        // if provided credentials already encrypted: "exportCredentials" will just return the same credentials
        // if provided credentials are raw: "exportCredentials" will encrypt them with the secret provided
        // if credentials are not provided: project's flows credentials will be used, they will be encrypted with the provided secret
        const keyToDecrypt = (options.credentials && options.credentials.$) ? options.credentialSecret : projectSecret
        result.flows.credentials = app.db.controllers.Project.exportCredentials(credentials || {}, keyToDecrypt, options.credentialSecret)

        return result
    }
}
