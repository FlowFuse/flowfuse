const crypto = require('crypto')

/**
 * inflightProjectState - when projects are transitioning between states, there
 * is no need to store that in the database. But we do need to know it so the
 * information can be returned on the API.
 */
const inflightProjectState = { }

// Any variables added to RESERVED_ENV should also be added
// to  frontend/src/pages/admin/Template/sections/Environment.vue
const RESERVED_ENV = ['FF_PROJECT_ID', 'FF_PROJECT_NAME']

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
            const envVars = app.db.controllers.Project.insertPlatformSpecificEnvVars(project, result.env)
            // convert  [{name: 'a', value: '1'}, {name: 'b', value: '2'}]  >> to >>  { a: 1, b: 2 }
            envVars.forEach(envVar => {
                env[envVar.name] = envVar.value
            })
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
     * Remove platform specific environment variables
     * @param {[{name:string, value:string}]} envVars Environment variables array
     */
    removePlatformSpecificEnvVars: function (app, envVars) {
        if (!envVars || !Array.isArray(envVars)) {
            return []
        }
        return [...envVars.filter(e => RESERVED_ENV.indexOf(e.name) < 0)]
    },
    /**
     * Insert platform specific environment variables
     * @param {Project} project The device
     * @param {[{name:string, value:string}]} envVars Environment variables array
     */
    insertPlatformSpecificEnvVars: function (app, project, envVars) {
        if (!envVars || !Array.isArray(envVars)) {
            envVars = []
        }
        const makeVar = (name, value) => {
            return { name, value: value || '', platform: true } // add `platform` flag for UI
        }
        const result = []
        result.push(makeVar('FF_PROJECT_ID', project.id || ''))
        result.push(makeVar('FF_PROJECT_NAME', project.name || ''))
        result.push(...app.db.controllers.Project.removePlatformSpecificEnvVars(envVars))
        return result
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
