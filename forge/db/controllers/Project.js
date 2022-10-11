const crypto = require('crypto')

/**
 * inflightProjectState - when projects are transitioning between states, there
 * is no need to store that in the database. But we do need to know it so the
 * information can be returned on the API.
 */
const inflightProjectState = { }

module.exports = {
    /**
     * Get the in-flight state of a project
     * @param {*} app
     * @param {*} project
     * @returns the in-flight state
     */
    getInflightState: function (app, project) {
        return inflightProjectState[project.id]
    },

    /**
     * Set the in-flight state of a project
     * @param {*} app
     * @param {*} project
     * @param {*} state
     */
    setInflightState: function (app, project, state) {
        inflightProjectState[project.id] = state
    },
    /**
     * Set the in-flight state of a project
     * @param {*} app
     * @param {*} project
     */
    clearInflightState: function (app, project) {
        delete inflightProjectState[project.id]
    },
    /**
     * Get the settings object that should be passed to nr-launcher so it can
     * start Node-RED with the proper project configuration.
     *
     * This merges the Project Template settings with the Project's own settings.
     *
     * @param {*} app the forge app
     * @param {*} project the project to get the settings for
     * @returns the runtime settings object
     */
    getRuntimeSettings: async function (app, project) {
        // This assumes the project has been loaded via `byId` so that
        // it has the template and ProjectSettings attached
        let result = {}
        const env = {}
        if (project.ProjectTemplate) {
            result = project.ProjectTemplate.settings
            if (result.env) {
                result.env.forEach(envVar => {
                    env[envVar.name] = envVar.value
                })
            }
        }
        if (project.ProjectSettings[0]?.key === 'settings') {
            const projectSettings = project.ProjectSettings[0].value
            result = app.db.controllers.ProjectTemplate.mergeSettings(result, projectSettings)
            if (result.env) {
                result.env.forEach(envVar => {
                    env[envVar.name] = envVar.value
                })
            }
        }

        result.env = env
        return result
    },

    exportProject: async function (app, project, components) {
        components = components || {
            flows: true,
            credentials: true,
            settings: true,
            envVars: true
        }
        const projectExport = {}
        if (components.flows) {
            const flows = await app.db.models.StorageFlow.byProject(project.id)
            projectExport.flows = !flows ? [] : JSON.parse(flows.flow)
            if (components.credentials) {
                const origCredentials = await app.db.models.StorageCredentials.byProject(project.id)
                if (origCredentials) {
                    const encryptedCreds = JSON.parse(origCredentials.credentials)
                    if (components.credentialSecret) {
                        // This code path is currently unused. It is here
                        // for a future item where a user wants to export a project
                        // out of the plaform. They will provide their own
                        // credentialSecret value - which we will used to re-encrypt
                        // the project credentials
                        const projectSecret = await project.getCredentialSecret()
                        const exportSecret = components.credentialSecret
                        projectExport.credentials = app.db.controllers.Project.exportCredentials(encryptedCreds, projectSecret, exportSecret)
                    } else {
                        projectExport.credentials = encryptedCreds
                    }
                }
            }
        }
        if (components.settings || components.envVars) {
            const settings = await app.db.controllers.Project.getRuntimeSettings(project)
            const envVars = settings.env
            delete settings.env
            if (components.settings) {
                projectExport.settings = settings
            }
            if (components.envVars) {
                projectExport.env = envVars
            }
        }
        const NRSettings = await app.db.models.StorageSettings.byProject(project.id)
        if (NRSettings) {
            projectExport.modules = {}
            try {
                const nodeList = JSON.parse(NRSettings.settings).nodes || {}
                Object.entries(nodeList).forEach(([key, value]) => {
                    projectExport.modules[key] = value.version
                })
            } catch (err) {}
        }
        return projectExport
    },

    importProjectSnapshot: async function restoreSnapshot (app, project, snapshot) {
        const t = await app.db.sequelize.transaction() // start a transaction
        try {
            if (snapshot?.flows?.flows) {
                const currentProjectFlows = await app.db.models.StorageFlow.byProject(project.id)
                currentProjectFlows.flow = JSON.stringify(!snapshot.flows.flows ? [] : snapshot.flows.flows)
                if (snapshot.flows.credentials) {
                    const origCredentials = await app.db.models.StorageCredentials.byProject(project.id)
                    origCredentials.credentials = JSON.stringify(snapshot.flows.credentials)
                    await origCredentials.save({ transaction: t })
                }
                await currentProjectFlows.save({ transaction: t })
            }
            if (snapshot?.settings?.settings || snapshot?.settings?.env) {
                const snapshotSettings = JSON.parse(JSON.stringify(snapshot.settings.settings || {}))
                snapshotSettings.env = []
                const envVarKeys = Object.keys(snapshot.settings.env || {})
                if (envVarKeys?.length) {
                    envVarKeys.forEach(key => {
                        snapshotSettings.env.push({
                            name: key,
                            value: snapshot.settings.env[key]
                        })
                    })
                }
                const newSettings = app.db.controllers.ProjectTemplate.validateSettings(snapshotSettings, project.ProjectTemplate)
                const currentProjectSettings = await project.getSetting('settings') || {} // necessary?
                const updatedSettings = app.db.controllers.ProjectTemplate.mergeSettings(currentProjectSettings, newSettings) // necessary?
                await project.updateSetting('settings', updatedSettings, { transaction: t }) // necessary?
            }
            await t.commit() // all good, commit the transaction
        } catch (error) {
            await t.rollback() // rollback the transaction.
            throw error
        }
    },

    /**
     * Takes a credentials object and re-encrypts it with a new key
     */
    exportCredentials: function (app, original, oldKey, newKey) {
        const newHash = crypto.createHash('sha256').update(newKey).digest()
        const oldHash = crypto.createHash('sha256').update(oldKey).digest()
        return encryptCreds(newHash, decryptCreds(oldHash, original))
    },

    /**
     *
     * @param {*} app
     * @param {*} project
     * @param {*} components
     */
    importProject: async function (app, project, components) {
        const t = await app.db.sequelize.transaction()
        try {
            if (components.flows) {
                let currentProjectFlows = await app.db.models.StorageFlow.byProject(project.id)
                if (currentProjectFlows) {
                    currentProjectFlows.flows = components.flows
                    await currentProjectFlows.save({ transaction: t })
                } else {
                    currentProjectFlows = app.db.models.StorageFlow.create({
                        ProjectId: project.id,
                        flow: components.flows
                    }, { transaction: t })
                }
            }
            if (components.credentials) {
                const projectSecret = await project.getCredentialSecret()
                console.log('project secret', projectSecret)
                const credSecretsHash = crypto.createHash('sha256').update(components.credsSecret).digest()
                const projectSecretHash = crypto.createHash('sha256').update(projectSecret).digest()

                const decryptedCreds = decryptCreds(credSecretsHash, JSON.parse(components.credentials))
                console.log('decrypted', decryptedCreds)
                const encryptedCreds = encryptCreds(projectSecretHash, decryptedCreds)
                console.log('re-encrypted', encryptedCreds)
                let origCredentials = await app.db.models.StorageCredentials.byProject(project.id)
                if (origCredentials) {
                    console.log('replace creds')
                    origCredentials.credentials = JSON.stringify(encryptedCreds)
                    await origCredentials.save({ transaction: t })
                } else {
                    console.log('new creds')
                    origCredentials = await app.db.models.StorageCredentials.create({
                        ProjectId: project.id,
                        credentials: JSON.stringify(encryptedCreds)
                    }, { transaction: t })
                }
            }
            await t.commit()
        } catch (error) {
            t.rollback()
            throw error
        }
        if (project.state === 'running') {
            app.db.controllers.Project.setInflightState(project, 'restarting')
            project.state = 'running'
            await project.save()
            const result = await app.containers.restartFlows(project)
            app.db.controllers.Project.clearInflightState(project)
            return result
        }
    }
}

function decryptCreds (key, cipher) {
    let flows = cipher.$
    const initVector = Buffer.from(flows.substring(0, 32), 'hex')
    flows = flows.substring(32)
    const decipher = crypto.createDecipheriv('aes-256-ctr', key, initVector)
    const decrypted = decipher.update(flows, 'base64', 'utf8') + decipher.final('utf8')
    return JSON.parse(decrypted)
}

function encryptCreds (key, plain) {
    const initVector = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-ctr', key, initVector)
    return { $: initVector.toString('hex') + cipher.update(JSON.stringify(plain), 'utf8', 'base64') + cipher.final('base64') }
}
