const crypto = require('crypto')

const { ControllerError } = require('../../lib/errors')
const { KEY_SETTINGS } = require('../models/ProjectSettings')

/**
 * inflightProjectState - when projects are transitioning between states, there
 * is no need to store that in the database. But we do need to know it so the
 * information can be returned on the API.
 */
const inflightProjectState = { }

const inflightDeploys = new Set()

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
     * Check whether an instance is currently flagged as deploying
     * @param {*} app
     * @param {*} instance
     */
    isDeploying: function (app, instance) {
        return inflightDeploys.has(instance.id)
    },

    /**
     * Mark an instance as currently being deployed
     * @param {*} app
     * @param {*} instance
     */
    setInDeploy: function (app, instance) {
        inflightDeploys.add(instance.id)
    },

    /**
     * Set the in-flight state of a project
     * @param {*} app
     * @param {*} project
     */
    clearInflightState: function (app, project) {
        delete inflightProjectState[project.id]
        inflightDeploys.delete(project.id)
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
            // special case for palette.modules - we don't want to inherit
            // the template's list of modules. We want to use the list that
            // is stored in the project's own settings.
            if (result.palette?.modules) {
                delete result.palette.modules
            }
        }
        const projectSettingsRow = project.ProjectSettings?.find((projectSetting) => projectSetting.key === KEY_SETTINGS)
        if (projectSettingsRow) {
            const projectSettings = projectSettingsRow.value
            result = app.db.controllers.ProjectTemplate.mergeSettings(result, projectSettings)
            const envVars = app.db.controllers.Project.insertPlatformSpecificEnvVars(project, result.env)
            // convert  [{name: 'a', value: '1'}, {name: 'b', value: '2'}]  >> to >>  { a: 1, b: 2 }
            envVars.forEach(envVar => {
                env[envVar.name] = envVar.value
            })
        }
        // If we don't have any modules listed in project settings. We should
        // look them up from StorageSettings in case this is a pre-existing project
        // that has nodes installed from before we started tracking them ourselves
        const moduleList = result.palette?.modules || await app.db.controllers.StorageSettings.getProjectModules(project) || []
        const modules = {}
        moduleList.forEach(module => {
            modules[module.name] = module.version
        })
        result.palette = result.palette || {}
        result.palette.modules = modules
        result.env = env
        return result
    },

    exportProject: async function (app, project, components = {
        flows: true,
        credentials: true,
        settings: true,
        envVars: true
    }) {
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
                        // out of the platform. They will provide their own
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

    importProjectSnapshot: async function restoreSnapshot (app, project, snapshot, { mergeEnvVars } = { mergeEnvVars: false }) {
        const t = await app.db.sequelize.transaction() // start a transaction
        try {
            if (snapshot?.flows?.flows) {
                const flows = JSON.stringify(!snapshot.flows.flows ? [] : snapshot.flows.flows)
                await app.db.controllers.StorageFlows.updateOrCreateForProject(project, flows, { transaction: t })

                if (snapshot.flows.credentials) {
                    await app.db.controllers.StorageCredentials.updateOrCreateForProject(project, snapshot.flows.credentials, { transaction: t })
                }
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
                if (snapshotSettings.palette?.modules) {
                    const moduleList = []
                    for (const [name, version] of Object.entries(snapshotSettings.palette.modules)) {
                        moduleList.push({ name, version, local: true })
                    }
                    snapshotSettings.palette.modules = moduleList
                } else {
                    snapshotSettings.palette = snapshotSettings.palette || {}
                    snapshotSettings.palette.modules = []
                }
                const newSettings = app.db.controllers.ProjectTemplate.validateSettings(snapshotSettings, project.ProjectTemplate)
                const currentProjectSettings = await project.getSetting('settings') || {} // necessary?
                const updatedSettings = app.db.controllers.ProjectTemplate.mergeSettings(currentProjectSettings, newSettings, { mergeEnvVars })
                await project.updateSetting('settings', updatedSettings, { transaction: t }) // necessary?
            }
            await t.commit() // all good, commit the transaction
        } catch (error) {
            await t.rollback() // rollback the transaction.
            throw error
        }
    },

    /**
     * Takes a credentials object and re-encrypts it with a new key.
     * If oldKey is blank or undefined, it assumes the credentials object is
     * unencrypted at this point and only needs to be re-encrypted
     */
    exportCredentials: function (app, original, oldKey, newKey) {
        if (oldKey && original.$) {
            const oldHash = crypto.createHash('sha256').update(oldKey).digest()
            original = decryptCreds(oldHash, original)
        }
        const newHash = crypto.createHash('sha256').update(newKey).digest()
        return encryptCreds(newHash, original)
    },

    /**
     * Helper for the above exportCredentials method
     * @param {*} existingCredentials
     * @param {*} oldCredentialSecret
     * @param {*} newCredentialSecret
     * @returns
     */
    reEncryptCredentials (app, existingCredentials, oldCredentialSecret, newCredentialSecret) {
        const newCredentials = app.db.controllers.Project.exportCredentials(existingCredentials, oldCredentialSecret, newCredentialSecret)
        return newCredentials
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
     * @param {Project} project The device
     * @param {[{name:string, value:string}]} envVars Environment variables array
     */
    insertPlatformSpecificEnvVars: function (app, project, envVars) {
        if (!envVars || !Array.isArray(envVars)) {
            envVars = []
        }
        const makeVar = (name, value, deprecated) => {
            return { name, value: value || '', platform: true, deprecated } // add `platform` and `deprecated` flags for UI
        }
        const result = []
        result.push(makeVar('FF_INSTANCE_ID', project.id || ''))
        result.push(makeVar('FF_INSTANCE_NAME', project.name || ''))
        result.push(makeVar('FF_PROJECT_ID', project.id || '', true)) // deprecated as of V1.6.0
        result.push(makeVar('FF_PROJECT_NAME', project.name || '', true)) // deprecated as of V1.6.0
        result.push(...app.db.controllers.Project.removePlatformSpecificEnvVars(envVars))
        return result
    },

    /**
     *
     * @param {*} app
     * @param {Team} team
     * @param {Application} application
     * @param {User} user
     * @param {ProjectType} type
     * @param {ProjectStack} stack
     * @param {ProjectTemplate} template
     * @param {{name: string, ha: {}, sourceProject: Project, sourceProjectOptions: {}, flowTemplate: FlowTemplate}} properties Props of the project to create
     * @returns
     */
    create: async function (
        app,
        team,
        application,
        user,
        type,
        stack,
        template,
        {
            name = '',
            ha = null,
            sourceProject = null,
            sourceProjectOptions = {},
            flowBlueprint = null
        } = {}
    ) {
        if (!user) {
            throw new ControllerError('invalid_user', 'Invalid user')
        }

        if (!team) {
            throw new ControllerError('invalid_team', 'Invalid team')
        }

        if (!application) {
            throw new ControllerError('invalid_application', 'Invalid application')
        }

        if (!type) {
            throw new ControllerError('invalid_project_type', 'Invalid project type')
        }

        // This will perform all checks needed to ensure this instance type can be created for this team.
        // Throws an exception if not allowed
        await team.checkInstanceTypeCreateAllowed(type)

        if (sourceProject && flowBlueprint) {
            throw new ControllerError('invalid_request', 'Source Project and Flow Blueprint cannot both be used')
        }

        if (sourceProject) {
            if (sourceProject.Team.id !== team.id) {
                throw new ControllerError('invalid_source_project', 'Source Project Not in Same Team', 403)
            } else if (sourceProject && sourceProject.Application.id !== application.id) {
                throw new ControllerError('invalid_source_project', 'Source Project Not in Same Application', 403)
            }
        }

        if (!stack || stack.ProjectTypeId !== type.id) {
            throw new ControllerError('invalid_stack', 'Invalid stack')
        }

        if (!template) {
            throw new ControllerError('invalid_template', 'Invalid template')
        }

        name = name.trim()
        const safeName = name?.toLowerCase()
        if (app.db.models.Project.BANNED_NAME_LIST.includes(safeName)) {
            throw new ControllerError('invalid_project_name', 'name not allowed', 409)
        }

        if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(safeName) === false) {
            throw new ControllerError('invalid_project_name', 'name not allowed', 409)
        }

        if (await app.db.models.Project.isNameUsed(safeName)) {
            throw new ControllerError('invalid_project_name', 'name in use', 409)
        }

        if (app.license.active() && app.ha) {
            if (ha && !await app.ha.isHAAllowed(team, type, ha)) {
                throw new ControllerError('invalid_ha', 'Invalid HA configuration')
            }
        }

        let instance
        try {
            instance = await app.db.models.Project.create({
                name,
                ApplicationId: application.id,
                type: '',
                url: ''
            })
        } catch (err) {
            throw new ControllerError('unexpected_error', err.message, null, { cause: err })
        }

        await team.addProject(instance)
        await instance.setProjectStack(stack)
        await instance.setProjectTemplate(template)
        await instance.setProjectType(type)

        if (app.license.active() && app.ha && ha) {
            await instance.updateHASettings(ha)
        }

        await instance.reload({
            include: [
                { model: app.db.models.Team },
                { model: app.db.models.ProjectType },
                { model: app.db.models.ProjectStack },
                { model: app.db.models.ProjectTemplate },
                { model: app.db.models.ProjectSettings }
            ]
        })

        if (sourceProject) {
            await app.db.controllers.Project.importFromInstance(instance, sourceProject, sourceProjectOptions)
        } else {
            const newProjectSettings = { header: { title: instance.name } }
            // Copy the palette modules from the template (if any)
            // This is an instance creation time only operation to avoid the complexities of
            // merging the palette modules from the template with the instance palette modules.
            if (template.settings.palette?.modules?.length > 0) {
                newProjectSettings.palette = { modules: [...template.settings.palette.modules] }
            }
            await instance.updateSetting(KEY_SETTINGS, newProjectSettings)
            await instance.updateSetting('credentialSecret', app.db.models.Project.generateCredentialSecret())
            if (flowBlueprint) {
                await app.db.controllers.Project.applyFlowBlueprint(instance, flowBlueprint)
            }
        }

        await app.containers.start(instance)
        await app.auditLog.Project.project.created(user, null, team, instance)

        if (sourceProject) {
            await app.auditLog.Team.project.duplicated(user, null, team, sourceProject, instance)
        } else {
            await app.auditLog.Team.project.created(user, null, team, instance)
        }

        return instance
    },

    /**
     * This method imports from an existing instance, whereas importProject imports from a representation of an instance
     * Long term, these two method should be combined.
     *
     * @param {*} app
     * @param {Project} targetInstance
     * @param {Project} sourceInstance
     * @param {{flows: boolean, credentials: boolean, envVars: boolean}} options
     */
    importFromInstance: async function (app, targetInstance, sourceInstance, options = {}) {
        // need to copy values over
        const settingsString = (await app.db.models.StorageSettings.byProject(sourceInstance.id))?.settings ?? '{}'
        const newSettings = {
            users: {}
        }
        const sourceSettings = JSON.parse(settingsString)
        if (settingsString) {
            newSettings.nodes = sourceSettings.nodes
        }
        const newCredentialSecret = app.db.models.Project.generateCredentialSecret()
        if (options.flows) {
            const sourceFlows = await app.db.models.StorageFlow.byProject(sourceInstance.id)
            if (sourceFlows) {
                const newFlow = await app.db.models.StorageFlow.create({
                    flow: sourceFlows.flow,
                    ProjectId: targetInstance.id
                })
                await newFlow.save()
            }

            if (options.credentials) {
                // To copy over the credentials, we have to:
                //  - get the existing credentials + credentialSecret
                //  - generate a new credentialSecret for the new project
                //    (this is normally left to NR to do itself)
                //  - re-encrypt the credentials using the new key
                const origCredentialsModel = await app.db.models.StorageCredentials.byProject(sourceInstance.id)
                if (origCredentialsModel) {
                    const origCredentials = JSON.parse(origCredentialsModel.credentials) // .credentials is stored as text in the DB
                    const origCredentialSecret = await sourceInstance.getSetting('credentialSecret') || sourceSettings._credentialSecret // Legacy
                    const newCredentials = await app.db.controllers.Project.reEncryptCredentials(origCredentials, origCredentialSecret, newCredentialSecret)
                    await app.db.models.StorageCredentials.create({
                        credentials: JSON.stringify(newCredentials),
                        ProjectId: targetInstance.id
                    })
                }
            }
        }
        await targetInstance.updateSetting('credentialSecret', newCredentialSecret)
        const settings = await app.db.models.StorageSettings.create({
            settings: JSON.stringify(newSettings),
            ProjectId: targetInstance.id
        })
        await settings.save()

        const sourceProjectSettings = await sourceInstance.getSetting(KEY_SETTINGS) || { env: [] }
        const sourceProjectEnvVars = sourceProjectSettings.env || []
        const newProjectSettings = { ...sourceProjectSettings }
        newProjectSettings.env = []

        if (options.envVars) {
            sourceProjectEnvVars.forEach(envVar => {
                newProjectSettings.env.push({
                    name: envVar.name,
                    value: options.envVars === 'keys' ? '' : envVar.value
                })
            })
        }
        newProjectSettings.header = { title: targetInstance.name }
        await targetInstance.updateSetting(KEY_SETTINGS, newProjectSettings)

        return targetInstance
    },

    /**
     * Imports settings, flows and credentials from a project export object
     *
     * @param {*} app
     * @param {*} project
     * @param {*} components
     */
    importProject: async function (app, project, components) {
        const transaction = await app.db.sequelize.transaction()
        try {
            if (components.flows) {
                await app.db.controllers.StorageFlows.updateOrCreateForProject(project, components.flows, { transaction })
            }
            if (components.credentials) {
                const projectSecret = await project.getCredentialSecret()
                const encryptedCreds = app.db.controllers.Project.exportCredentials(JSON.parse(components.credentials), components.credsSecret, projectSecret)
                await app.db.controllers.StorageCredentials.updateOrCreateForProject(project, encryptedCreds, { transaction })
            }
            await transaction.commit()
        } catch (error) {
            transaction.rollback()
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
    },

    /**
     * Add a module to the list of project modules.
     */
    addProjectModule: async function (app, project, module, version) {
        return app.db.controllers.Project.mergeProjectModules(project, [{
            name: module,
            version,
            local: true
        }], true)
    },
    /**
     * Remove a module from the list of project modules.
     */
    removeProjectModule: async function (app, project, module) {
        let changed = false
        let newProjectModuleList
        const currentProjectSettings = await project.getSetting('settings') || {}
        if (currentProjectSettings?.palette?.modules) {
            newProjectModuleList = currentProjectSettings?.palette?.modules.filter(m => {
                if (m.name === module) {
                    changed = true
                    return false
                }
                return true
            })
        }
        if (changed) {
            currentProjectSettings.palette = currentProjectSettings.palette || {}
            currentProjectSettings.palette.modules = newProjectModuleList
            await project.updateSetting('settings', currentProjectSettings)
        }
    },
    /**
     * Updates the project settings.palette.modules value based on the
     * module list Node-RED has provided to the StorageSettings api.
     */
    mergeProjectModules: async function (app, project, moduleList, updateExisting = false) {
        let changed = false
        let newProjectModuleList
        const currentProjectSettings = await project.getSetting('settings') || {}
        if (currentProjectSettings?.palette?.modules) {
            // The project has an existing list of modules - need to resolve any
            // changes between the two lists

            // As the moduleList comes from Node-RED's runtimeSettings object,
            // it will only contain the modules that include Node-RED nodes.
            // Regular npm modules that do not include nodes (nrlint for eg)
            // will not be included.
            // So we don't want to remove anything from the current list just
            // because it isn't listed in what moduleList provides.
            // We use the nodes.remove audit event to remove entries relating
            // to node modules.
            // For modules we already know about, we only update the recorded
            // version if explicitly asked to. That only happens when triggered
            // by the 'nodes.install' audit event.

            // This is the list of modules from ProjectSettings
            const existingModulesList = currentProjectSettings?.palette?.modules
            const existingModules = {}
            existingModulesList.forEach(m => { existingModules[m.name] = m })

            const newModules = {}
            moduleList.forEach(m => {
                newModules[m.name] = m
                if (!existingModules[m.name] || updateExisting) {
                    changed = true
                    existingModules[m.name] = m
                    if (/^\d/.test(m.version)) {
                        m.version = `~${m.version}`
                    }
                }
            })
            newProjectModuleList = Object.values(existingModules)
        } else {
            // No existing modules - so updated with the list as provided
            changed = true
            newProjectModuleList = moduleList.map(m => {
                if (/^\d/.test(m.version)) {
                    m.version = `~${m.version}`
                }
                return m
            })
        }
        if (changed) {
            currentProjectSettings.palette = currentProjectSettings.palette || {}
            currentProjectSettings.palette.modules = newProjectModuleList
            await project.updateSetting('settings', currentProjectSettings)
        }
    },
    /**
     * Applies the contents of a FlowTemplate to an Instance. We assume this
     * is being invoked when the Instance is being created - so it will overwrite
     * any existing flows and will merge any modules with those provided by the ProjectTemplate.
     * @param {*} app
     * @param {*} instance
     * @param {*} flowBlueprint
     */
    applyFlowBlueprint: async function (app, instance, flowBlueprint) {
        const flows = flowBlueprint.flows || { flows: [], credentials: {} }
        if (flows.flows) {
            await app.db.controllers.StorageFlows.updateOrCreateForProject(instance, JSON.stringify(flows.flows))
        }
        if (flows.credentials) {
            const projectSecret = await instance.getCredentialSecret()
            const encryptedCreds = app.db.controllers.Project.exportCredentials(flows.credentials, null, projectSecret)
            await app.db.controllers.StorageCredentials.updateOrCreateForProject(instance, encryptedCreds)
        }

        const modules = flowBlueprint.modules || {}
        for (const [moduleName, version] of Object.entries(modules)) {
            await app.db.controllers.Project.addProjectModule(instance, moduleName, version)
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
