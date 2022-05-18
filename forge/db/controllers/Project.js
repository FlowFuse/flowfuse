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
                        const settings = JSON.parse((await app.db.models.StorageSettings.byProject(project.id))?.settings || '{}')
                        // const newCredentialSecrect = components.credentialSecret || crypto.randomBytes(32).toString('hex')
                        projectExport.credentials = recryptCreds(encryptedCreds, settings._credentialSecret, components.credentialSecret)
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
    }
}

function recryptCreds (original, oldKey, newKey) {
    const newHash = crypto.createHash('sha256').update(newKey).digest()
    const oldHash = crypto.createHash('sha256').update(oldKey).digest()
    return encryptCreds(newHash, decryptCreds(oldHash, original))
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
