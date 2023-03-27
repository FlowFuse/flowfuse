const crypto = require('crypto')
const { Roles } = require('../../lib/roles')
const ProjectActions = require('./projectActions')
const ProjectDevices = require('./projectDevices')
const ProjectSnapshots = require('./projectSnapshots')

const { KEY_HOSTNAME, KEY_SETTINGS } = require('../../db/models/ProjectSettings')
const { isFQDN } = require('../../lib/validate')

/**
 * Instance api routes
 *
 * - /api/v1/project
 *
 * - Any route that has a :projectId parameter will:
 *    - Ensure the session user is either admin or has a role on the corresponding team
 *    - request.project prepopulated with the team object
 *    - request.teamMembership prepopulated with the user role ({role: XYZ})
 *      (unless they are admin)
 *
 * @namespace project
 * @memberof forge.routes.api
 */

const bannedNameList = [
    'www',
    'node-red',
    'nodered',
    'forge',
    'support',
    'help',
    'accounts',
    'account',
    'status',
    'billing',
    'mqtt',
    'broker'
]

module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.projectId !== undefined) {
            if (request.params.projectId) {
                try {
                    request.project = await app.db.models.Project.byId(request.params.projectId)
                    if (!request.project) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    if (request.session.User) {
                        request.teamMembership = await request.session.User.getTeamMembership(request.project.Team.id)
                        if (!request.teamMembership && !request.session.User.admin) {
                            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                            return
                        }
                    } else if (request.session.ownerId !== request.params.projectId) {
                        // AccesToken being used - but not owned by this project
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                } catch (err) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })

    app.register(ProjectDevices, { prefix: '/:projectId/devices' })
    app.register(ProjectActions, { prefix: '/:projectId/actions' })
    app.register(ProjectSnapshots, { prefix: '/:projectId/snapshots' })

    /**
     * Get the details of a given project
     * @name /api/v1/project/:projectId
     * @static
     * @memberof forge.routes.api.project
     */
    app.get('/:projectId', {
        preHandler: app.needsPermission('project:read')
    }, async (request, reply) => {
        const [result, projectFlow] = await Promise.all([
            await app.db.views.Project.project(request.project),
            await app.db.models.StorageFlow.byProject(request.project.id)
        ])
        const inflightState = app.db.controllers.Project.getInflightState(request.project)

        result.flowLastUpdatedAt = projectFlow?.updatedAt

        if (inflightState) {
            result.meta = {
                state: inflightState
            }
        } else if (request.project.state === 'suspended') {
            result.meta = {
                state: 'suspended'
            }
        } else {
            result.meta = await app.containers.details(request.project) || { state: 'unknown' }
        }
        // result.team = await app.db.views.Team.team(request.project.Team)
        reply.send(result)
    })

    /**
     * Create a project
     * @name /api/v1/projects
     * @memberof forge.routes.api.project
     */
    app.post('/', {
        preHandler: [
            async (request, reply) => {
                request.application = await app.db.models.Application.byId(request.body.applicationId)
                if (!request.application) {
                    return reply.code(404).send({ code: 'not_found', error: 'application not found' })
                }

                request.teamMembership = await request.session.User.getTeamMembership(request.application.Team.id)
                if (!request.teamMembership && !request.session.User.admin) {
                    return reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                }
            },
            app.needsPermission('project:create')
        ],
        schema: {
            body: {
                type: 'object',
                required: ['name', 'projectType', 'stack', 'template', 'applicationId'],
                properties: {
                    name: { type: 'string' },
                    applicationId: { anyOf: [{ type: 'string' }, { type: 'number' }] },
                    projectType: { type: 'string' },
                    stack: { type: 'string' },
                    template: { type: 'string' },
                    sourceProject: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            options: { type: 'object' }
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const team = await request.teamMembership.getTeam()

        const projectType = await app.db.models.ProjectType.byId(request.body.projectType)
        if (!projectType) {
            reply.code(400).send({ code: 'invalid_project_type', error: 'Invalid project type' })
            return
        }

        if (app.license.active() && app.billing) {
            if (!await app.billing.isProjectCreateAllowed(team, projectType)) {
                reply.code(402).send({ code: 'billing_required', error: 'Team billing not configured' })
                return
            }
        }

        let sourceProject
        if (request.body.sourceProject && request.body.sourceProject.id) {
            sourceProject = await app.db.models.Project.byId(request.body.sourceProject.id)
            if (!sourceProject) {
                reply.code(400).send({ code: 'invalid_source_project', error: 'Source Project Not Found' })
                return
            } else if (sourceProject.Team.hashid !== request.body.team) {
                reply.code(403).send({ code: 'invalid_source_project', error: 'Source Project Not in Same Team' })
                return
            }
        }

        const stack = await app.db.models.ProjectStack.byId(request.body.stack)

        if (!stack || stack.ProjectTypeId !== projectType.id) {
            reply.code(400).send({ code: 'invalid_stack', error: 'Invalid stack' })
            return
        }

        const template = await app.db.models.ProjectTemplate.byId(request.body.template)

        if (!template) {
            reply.code(400).send({ code: 'invalid_template', error: 'Invalid template' })
            return
        }

        const name = request.body.name?.trim()
        const safeName = name?.toLowerCase()
        if (bannedNameList.includes(safeName)) {
            reply.status(409).type('application/json').send({ code: 'invalid_project_name', error: 'name not allowed' })
            return
        }

        if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(safeName) === false) {
            reply.status(409).type('application/json').send({ code: 'invalid_project_name', error: 'name not allowed' })
            return
        }

        if (await app.db.models.Project.isNameUsed(safeName)) {
            reply.status(409).type('application/json').send({ code: 'invalid_project_name', error: 'name in use' })
            return
        }

        let project
        try {
            project = await app.db.models.Project.create({
                name,
                ApplicationId: request.application.id,
                type: '',
                url: ''
            })
        } catch (err) {
            console.error(err)

            reply.status(400).type('application/json').send({ code: 'unexpected_error', error: err.message })
            return
        }

        await team.addProject(project)
        await project.setProjectStack(stack)
        await project.setProjectTemplate(template)
        await project.setProjectType(projectType)
        await project.reload({
            include: [
                { model: app.db.models.Team },
                { model: app.db.models.ProjectType },
                { model: app.db.models.ProjectStack },
                { model: app.db.models.ProjectTemplate }
            ]
        })

        if (app.license.active() && app.billing) {
            await app.billing.initialiseProjectBillingState(team, project)
        }

        if (sourceProject) {
            // need to copy values over
            const settingsString = (await app.db.models.StorageSettings.byProject(sourceProject.id))?.settings
            const newSettings = {
                users: {}
            }
            const sourceSettings = JSON.parse(settingsString)
            if (settingsString) {
                newSettings.nodes = sourceSettings.nodes
            }
            const options = request.body.sourceProject.options
            const newCredentialSecret = generateCredentialSecret()
            if (options.flows) {
                const sourceFlows = await app.db.models.StorageFlow.byProject(sourceProject.id)
                if (sourceFlows) {
                    const newFlow = await app.db.models.StorageFlow.create({
                        flow: sourceFlows.flow,
                        ProjectId: project.id
                    })
                    await newFlow.save()
                }

                if (options.credentials) {
                    // To copy over the credentials, we have to:
                    //  - get the existing credentials + credentialSecret
                    //  - generate a new credentialSecret for the new project
                    //    (this is normally left to NR to do itself)
                    //  - re-encrypt the credentials using the new key
                    const origCredentials = await app.db.models.StorageCredentials.byProject(sourceProject.id)
                    if (origCredentials) {
                        // There are existing credentials to copy
                        const srcCredentials = JSON.parse(origCredentials.credentials)
                        const srcCredentialSecret = await sourceProject.getSetting('credentialSecret') || sourceSettings._credentialSecret
                        const newCredentials = app.db.controllers.Project.exportCredentials(srcCredentials, srcCredentialSecret, newCredentialSecret)
                        const credentials = await app.db.models.StorageCredentials.create({
                            credentials: JSON.stringify(newCredentials),
                            ProjectId: project.id
                        })
                        await credentials.save()
                    }
                }
            }
            await project.updateSetting('credentialSecret', newCredentialSecret)
            const settings = await app.db.models.StorageSettings.create({
                settings: JSON.stringify(newSettings),
                ProjectId: project.id
            })
            await settings.save()

            const sourceProjectSettings = await sourceProject.getSetting(KEY_SETTINGS) || { env: [] }
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
            newProjectSettings.header = { title: name }
            await project.updateSetting(KEY_SETTINGS, newProjectSettings)
        } else {
            const newProjectSettings = { header: { title: name } }
            await project.updateSetting(KEY_SETTINGS, newProjectSettings)
            await project.updateSetting('credentialSecret', generateCredentialSecret())
        }

        await app.containers.start(project)
        await app.auditLog.Project.project.created(request.session.User, null, team, project)

        if (sourceProject) {
            await app.auditLog.Team.project.duplicated(request.session.User, null, team, sourceProject, project)
        } else {
            await app.auditLog.Team.project.created(request.session.User, null, team, project)
        }

        const result = await app.db.views.Project.project(project)

        if (project.state === 'suspended') {
            result.meta = {
                state: 'suspended'
            }
        } else {
            result.meta = await app.containers.details(project) || { state: 'unknown' }
        }

        reply.send(result)
    })
    /**
     * Delete a project
     * @name /api/v1/project/:id
     * @memberof forge.routes.api.project
     */
    app.delete('/:projectId', { preHandler: app.needsPermission('project:delete') }, async (request, reply) => {
        try {
            await app.containers.remove(request.project)

            if (app.comms) {
                app.comms.devices.sendCommandToProjectDevices(request.project.Team.hashid, request.project.id, 'update', {
                    project: null
                })
            }

            await request.project.destroy()
            await app.auditLog.Team.project.deleted(request.session.User, null, request.project.Team, request.project)
            await app.auditLog.Project.project.deleted(request.session.User, null, request.project.Team, request.project)
            reply.send({ status: 'okay' })
        } catch (err) {
            reply.code(500).send({ code: 'unexpected_error', error: err.toString() })
        }
    })

    /**
     * Update a project
     * @name /api/v1/project/:id
     * @memberof forge.routes.api.project
     */
    app.put('/:projectId', {
        preHandler: async (request, reply) => {
            // First, check what is being set & check permissions accordingly.
            // * If the only value sent is `request.body.settings.env`, then we only need 'project:edit-env' permission
            // * Otherwise, everything else requires 'project:edit' permission
            const bodyKeys = Object.keys(request.body || {})
            const settingsKeys = Object.keys(request.body?.settings || {})
            if (bodyKeys.length === 1 && bodyKeys[0] === 'settings' && settingsKeys.length === 1 && settingsKeys[0] === 'env') {
                return app.needsPermission('project:edit-env')(request, reply)
            } else {
                return app.needsPermission('project:edit')(request, reply).then(res => {
                    request.allSettingsEdit = true
                    return res
                })
            }
        }
    }, async (request, reply) => {
        // Export this one project over another
        if (request.body.sourceProject) {
            const sourceProject = await app.db.models.Project.byId(request.body.sourceProject.id)
            const targetProject = request.project
            const options = request.body.sourceProject.options
            if (!sourceProject) {
                reply.code(404).send('Source Project not found')
            }
            if (sourceProject.Team.id !== request.project.Team.id) {
                reply.code(403).send('Source Project and Target not in same team')
            }

            app.db.controllers.Project.setInflightState(request.project, 'importing')
            await app.auditLog.Project.project.copied(request.session.User.id, null, sourceProject, request.project)
            await app.auditLog.Project.project.imported(request.session.User.id, null, request.project, sourceProject)

            // Early return, status is loaded async
            reply.code(200).send({})

            exportProjectToExistingProject(sourceProject, targetProject, options) // runs async

            return
        }

        /// Validation of changes
        const changesToPersist = {}

        // Name
        const reqName = request.body.name?.trim()
        const reqSafeName = reqName?.toLowerCase()
        const projectName = request.project.name?.trim()
        if (reqName && projectName !== reqName) {
            if (bannedNameList.includes(reqSafeName)) {
                reply.status(409).type('application/json').send({ code: 'invalid_project_name', error: 'name not allowed' })
                return
            }
            if (await app.db.models.Project.isNameUsed(reqSafeName)) {
                reply.status(409).type('application/json').send({ code: 'invalid_project_name', error: 'name in use' })
                return
            }

            changesToPersist.name = { from: projectName, to: reqName }
        }

        // Hostname
        const newHostname = request.body.hostname?.toLowerCase().replace(/\.$/, '') // trim trailing .
        const oldHostname = await request.project.getSetting(KEY_HOSTNAME)
        if (newHostname && newHostname !== oldHostname) {
            if (!isFQDN(newHostname)) {
                reply.status(409).type('application/json').send({ code: 'invalid_hostname', error: 'Hostname is not an FQDN' })
                return
            }

            const hostnameInUse = await app.db.models.ProjectSettings.isHostnameUsed(newHostname)
            const hostnameMatchesDomain = (app.config.domain && newHostname.endsWith(app.config.domain.toLowerCase()))
            if (hostnameInUse || hostnameMatchesDomain) {
                reply.status(409).type('application/json').send({ code: 'invalid_hostname', error: 'Hostname is already in use' })
                return
            }

            changesToPersist.hostname = { from: oldHostname, to: newHostname }
        }

        // Settings
        if (request.body.settings) {
            let bodySettings
            if (request.allSettingsEdit) {
                // store all body settings if user is owner
                bodySettings = request.body.settings
            } else {
                // only store settings.env if user is member
                bodySettings = {
                    env: request.body.settings.env
                }
            }
            const newSettings = app.db.controllers.ProjectTemplate.validateSettings(bodySettings, request.project.ProjectTemplate)
            // Merge the settings into the existing values
            const currentProjectSettings = await request.project.getSetting(KEY_SETTINGS) || {}
            const updatedSettings = app.db.controllers.ProjectTemplate.mergeSettings(currentProjectSettings, newSettings)

            changesToPersist.settings = { from: currentProjectSettings, to: updatedSettings }
        }

        // Project Type
        if (request.body.projectType) {
            const newProjectType = await app.db.models.ProjectType.byId(request.body.projectType)
            if (!newProjectType) {
                reply.code(400).send({ code: 'invalid_project_type', error: 'Invalid project type' })
                return
            }

            // Setting of project type for first time only (legacy)
            const legacyFirstUpdate = !request.project.ProjectType
            if (legacyFirstUpdate) {
                const existingStackProjectType = request.project.ProjectStack.ProjectTypeId
                if (existingStackProjectType && newProjectType.id !== existingStackProjectType) {
                    reply.code(400).send({ code: 'invalid_request', error: 'Mismatch between stack project type and new project type' })
                    return
                }
            } else {
                // Must specify stack if changing project
                const newStack = request.body.stack
                if (!newStack) {
                    reply.code(400).send({ code: 'invalid_request', error: 'Stack must be set when changing project type' })
                    return
                }
            }

            changesToPersist.projectType = { from: request.project.projectType, to: newProjectType, firstUpdate: legacyFirstUpdate }
        }

        // Project Stack
        if (request.body.stack) {
            const stack = await app.db.models.ProjectStack.byId(request.body.stack)
            if (!stack) {
                reply.code(400).send({ code: 'invalid_stack', error: 'Invalid stack' })
                return
            }

            changesToPersist.stack = { from: request.project.stack, to: stack }
        }

        /// Persist the changes
        const updates = new app.auditLog.formatters.UpdatesCollection()
        const transaction = await app.db.sequelize.transaction() // start a transaction
        const changesToProjectDefinition = (changesToPersist.stack || changesToPersist.projectType) && !changesToPersist.projectType?.firstUpdate
        let repliedEarly = false
        try {
            let resumeProject, targetState
            if (changesToProjectDefinition) {
                // Early return and complete the rest async
                app.db.controllers.Project.setInflightState(request.project, 'starting') // TODO: better inflight state needed
                reply.code(200).send({})
                repliedEarly = true

                const suspendOptions = {
                    skipBilling: changesToPersist.stack && !changesToPersist.projectType
                }

                const result = await suspendProject(request.project, suspendOptions)
                resumeProject = result.resumeProject
                targetState = result.targetState
            }

            if (changesToPersist.name) {
                request.project.name = changesToPersist.name.to
                await request.project.save({ transaction })

                updates.push('name', changesToPersist.name.from, changesToPersist.name.to)
            }

            if (changesToPersist.hostname) {
                await request.project.updateSetting(KEY_HOSTNAME, changesToPersist.hostname.to, { transaction })

                updates.push('hostname', changesToPersist.hostname.from, changesToPersist.hostname.to)
            }

            if (changesToPersist.settings) {
                await request.project.updateSetting(KEY_SETTINGS, changesToPersist.settings.to, { transaction })

                if (request.allSettingsEdit) {
                    updates.pushDifferences(changesToPersist.settings.from, changesToPersist.settings.to)
                } else {
                    updates.pushDifferences({ env: changesToPersist.settings.from.env }, { env: changesToPersist.settings.to.env })
                }
            }

            if (changesToPersist.stack || changesToPersist.projectType) {
                if (changesToPersist.projectType && changesToPersist.stack) {
                    app.log.info(`Updating project ${request.project.id} to type: '${changesToPersist.projectType.to.hashid}',  stack: '${changesToPersist.stack.to.hashid}'`)
                } else if (changesToPersist.projectType) {
                    app.log.info(`Updating project ${request.project.id} to use type ${changesToPersist.projectType.to.hashid} for the first time (legacy)`)
                } else {
                    app.log.info(`Updating project ${request.project.id} to use stack ${changesToPersist.stack.to.hashid}`)
                }

                if (changesToPersist.projectType?.to) {
                    await request.project.setProjectType(changesToPersist.projectType.to, { transaction })
                }

                if (changesToPersist.stack?.to) {
                    await request.project.setProjectStack(changesToPersist.stack.to, { transaction })
                }
            }

            await transaction.commit() // all good, commit the transaction

            // Log the updates
            if (updates.length > 0) {
                await app.auditLog.Project.project.settings.updated(request.session.User.id, null, request.project, updates)
            }
            if (changesToPersist.projectType) {
                await app.auditLog.Project.project.type.changed(request.session.User, null, request.project, changesToPersist.projectType.to)
            }
            if (changesToPersist.stack) {
                await app.auditLog.Project.project.stack.changed(request.session.User, null, request.project, changesToPersist.stack.to)
            }

            // Awaken the project
            if (changesToProjectDefinition) {
                await unSuspendProject(resumeProject, targetState)
            }
        } catch (error) {
            app.log.error('Error while updating project:')
            app.log.error(error)

            await transaction.rollback() // rollback the transaction.

            if (!repliedEarly) {
                reply.code(500).send({ code: 'unexpected_error', error: error.message })
            }
            return
        }

        if (repliedEarly) {
            // No further response needed
            return
        }

        // Bust sequelize caching on project settings
        if (changesToPersist.hostname || changesToPersist.settings) {
            await request.project.reload({
                include: [
                    { model: app.db.models.ProjectSettings }
                ]
            })
        }

        // Result
        const project = await app.db.models.Project.byId(request.project.id) // Reload project entirely
        const projectView = await app.db.views.Project.project(request.project)
        let result
        if (request.teamMembership.role >= Roles.Owner) {
            result = projectView
        } else {
            // exclude template object in response when not owner
            result = {
                createdAt: projectView.createdAt,
                id: projectView.id,
                name: projectView.name,
                links: projectView.links,
                projectType: projectView.projectType,
                stack: projectView.stack,
                team: projectView.team,
                updatedAt: projectView.updatedAt,
                url: projectView.url,
                settings: {
                    env: projectView.settings?.env
                }
            }
        }

        result.meta = await app.containers.details(project) || { state: 'unknown' }
        result.team = await app.db.views.Team.teamSummary(project.Team)

        reply.send(result)

        async function unSuspendProject (resumeProject, targetState) {
            if (resumeProject) {
                app.log.info(`Restarting project ${request.project.id}`)
                request.project.state = targetState
                await request.project.save()
                // Ensure the project has the full stack object
                await request.project.reload()
                const startResult = await app.containers.start(request.project)
                startResult.started.then(async () => {
                    await app.auditLog.Project.project.started(request.session.User, null, request.project)
                    app.db.controllers.Project.clearInflightState(request.project)
                })
            } else {
                app.db.controllers.Project.clearInflightState(request.project)
            }
        }

        async function suspendProject (project = request.project, options) {
            let resumeProject = false
            const targetState = project.state
            if (project.state !== 'suspended') {
                resumeProject = true
                app.log.info(`Stopping project ${project.id}`)
                await app.containers.stop(project, options)
                await app.auditLog.Project.project.suspended(request.session.User, null, project)
            }
            return { resumeProject, targetState }
        }

        async function exportProjectToExistingProject (sourceProject, targetProject, options) {
            const { resumeProject, targetState } = await suspendProject(targetProject)

            // Nodes
            const sourceSettingsString = ((await app.db.models.StorageSettings.byProject(sourceProject.id))?.settings) || '{}'
            const sourceSettings = JSON.parse(sourceSettingsString)

            let targetStorageSettings = await app.db.models.StorageSettings.byProject(targetProject.id)
            const targetSettingString = targetStorageSettings?.settings || '{}'
            const targetSettings = JSON.parse(targetSettingString)

            targetSettings.nodes = sourceSettings.nodes
            if (targetStorageSettings) {
                targetStorageSettings.settings = JSON.stringify(targetSettings)
            } else {
                targetStorageSettings = await app.db.models.StorageSettings.create({
                    settings: JSON.stringify(targetSettings),
                    ProjectId: targetProject.id
                })
            }
            await targetStorageSettings.save()

            // Flows
            if (options.flows) {
                let sourceFlow = await app.db.models.StorageFlow.byProject(sourceProject.id)
                let targetFlow = await app.db.models.StorageFlow.byProject(targetProject.id)
                if (!sourceFlow) {
                    sourceFlow = {
                        flow: '[]'
                    }
                }
                if (targetFlow) {
                    targetFlow.flow = sourceFlow.flow
                } else {
                    targetFlow = await app.db.models.StorageFlow.create({
                        flow: sourceFlow.flow,
                        ProjectId: targetProject.id
                    })
                }
                await targetFlow.save()
            }

            // Credentials
            if (options.credentials) {
                /*
                    To copy over the credentials, we have to:
                    - get the source credentials + credentialSecret
                    - get the target credentials + credentialSecret
                    - decrypt credentials from src and re-encrypt the
                    - credentials using the target key for target StorageCredentials
                */
                const origCredentials = await app.db.models.StorageCredentials.byProject(sourceProject.id)
                if (origCredentials) {
                    let trgCredentialSecret = await targetProject.getSetting('credentialSecret')
                    if (trgCredentialSecret == null) {
                        trgCredentialSecret = targetSettings?._credentialSecret || generateCredentialSecret()
                        targetProject.updateSetting('credentialSecret', trgCredentialSecret)
                        delete targetSettings._credentialSecret
                    }
                    const srcCredentials = JSON.parse(origCredentials.credentials)
                    const srcCredentialSecret = await sourceProject.getSetting('credentialSecret') || sourceSettings._credentialSecret
                    let targetCreds = await app.db.models.StorageCredentials.byProject(targetProject.id)
                    if (targetCreds && srcCredentials) {
                        targetCreds.credentials = JSON.stringify(app.db.controllers.Project.exportCredentials(srcCredentials, srcCredentialSecret, trgCredentialSecret))
                        await targetCreds.save()
                    } else if (srcCredentials) {
                        targetCreds = await app.db.models.StorageCredentials.create({
                            credentials: JSON.stringify(app.db.controllers.Project.exportCredentials(srcCredentials, srcCredentialSecret, trgCredentialSecret)),
                            ProjectId: targetProject.id
                        })
                        await targetCreds.save()
                    }
                }
            }

            // Template
            if (options.template) {
                targetProject.ProjectTemplateId = sourceProject.ProjectTemplateId
                await targetProject.save()
                await targetProject.reload()
            }

            // Settings
            let updateSettings = false
            const sourceProjectSettings = await sourceProject.getSetting(KEY_SETTINGS) || { env: [] }
            let targetProjectSettings = await targetProject.getSetting(KEY_SETTINGS) || { env: [] }
            const targetProjectEnvVars = targetProjectSettings.env
            if (options.settings) {
                targetProjectSettings = sourceProjectSettings
                if (!options.envVars) {
                    // Need to keep the existing env vars
                    targetProjectSettings.env = targetProjectEnvVars
                }
                updateSettings = true
            }

            if (options.envVars) {
                targetProjectSettings.env = mergeEnvVars(options, sourceProjectSettings.env, targetProjectEnvVars)
                updateSettings = true
            }

            if (updateSettings) {
                await targetProject.updateSetting(KEY_SETTINGS, targetProjectSettings)
            }

            await unSuspendProject(resumeProject, targetState)
        }
    })

    /**
     * Provide Project specific settings.js
     *
     * @name /api/v1/project/:id/settings
     * @memberof forge.routes.api.project
     */
    app.get('/:projectId/settings', {
        preHandler: (request, reply, done) => {
            // check accessToken is project scope
            // (ownerId already checked at top-level preHandler)
            if (request.session.ownerType !== 'project') {
                reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
            } else {
                done()
            }
        }
    }, async (request, reply) => {
        if (request.project.state === 'suspended') {
            reply.code(400).send({ code: 'project_suspended', error: 'Project suspended' })
            return
        }
        const settings = await app.containers.settings(request.project)
        settings.env = settings.env || {}
        settings.baseURL = request.project.url
        settings.forgeURL = app.config.base_url
        settings.fileStore = app.config.fileStore ? { ...app.config.fileStore } : null
        settings.teamID = request.project.Team.hashid
        settings.storageURL = request.project.storageURL
        settings.auditURL = request.project.auditURL
        settings.state = request.project.state
        settings.stack = request.project.ProjectStack?.properties || {}
        settings.settings = await app.db.controllers.Project.getRuntimeSettings(request.project)
        if (settings.settings.env) {
            settings.env = Object.assign({}, settings.settings.env, settings.env)
            delete settings.settings.env
        }
        reply.send(settings)
    })

    /**
     * Get project logs
     *  - returns most recent 30 entries
     *  - ?cursor= can be used to set the 'most recent log entry' to query from
     *  - ?limit= can be used to modify how many entries to return
     * @name /api/v1/project/:id/log
     * @memberof forge.routes.api.project
     */
    app.get('/:projectId/logs', {
        preHandler: app.needsPermission('project:log')
    }, async (request, reply) => {
        if (request.project.state === 'suspended') {
            reply.code(400).send({ code: 'project_suspended', error: 'Project suspended' })
            return
        }
        const paginationOptions = app.getPaginationOptions(request, { limit: 30 })

        let logs = await app.containers.logs(request.project)
        const firstLogCursor = logs.length > 0 ? logs[0].ts : null
        const fullLogLength = logs.length
        if (!paginationOptions.cursor) {
            logs = logs.slice(-paginationOptions.limit)
        } else {
            let cursor = paginationOptions.cursor
            let cursorDirection = true // 'next'
            if (cursor[0] === '-') {
                cursorDirection = false
                cursor = cursor.substring(1)
            }
            let i = 0
            for (;i < fullLogLength; i++) {
                if (logs[i].ts === cursor) {
                    break
                }
            }
            if (i === fullLogLength) {
                // cursor not found
                logs = []
            } else if (cursorDirection) {
                // logs *after* cursor
                logs = logs.slice(i + 1, i + 1 + paginationOptions.limit)
            } else {
                // logs *before* cursor
                logs = logs.slice(Math.max(0, i - 1 - paginationOptions.limit), i)
            }
        }
        const result = {
            meta: {
                // next_cursor - are there more recent logs to get?
                next_cursor: logs.length > 0 ? logs[logs.length - 1].ts : undefined,
                previous_cursor: logs.length > 0 && logs[0].ts !== firstLogCursor ? ('-' + logs[0].ts) : undefined
            },
            log: logs
        }
        reply.send(result)
    })

    /**
     * TODO: Add support for filtering by instance param when this is migrated to application API
     * @name /api/v1/project/:id/audit-log
     * @memberof forge.routes.api.project
     */
    app.get('/:projectId/audit-log', { preHandler: app.needsPermission('project:audit-log') }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const logEntries = await app.db.models.AuditLog.forProject(request.project.id, paginationOptions)
        const result = app.db.views.AuditLog.auditLog(logEntries)
        // console.log(logEntries);
        reply.send(result)
    })

    /**
     *
     * @name /api/v1/project/:id/import
     * @memberof forge.routes.api.project
     */
    app.post('/:projectId/import', {
        preHandler: app.needsPermission('project:edit'),
        schema: {
            body: {
                type: 'object',
                properties: {
                    flows: { type: 'string' },
                    credentials: { type: 'string' },
                    credsSecret: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const projectImport = await app.db.controllers.Project.importProject(request.project, request.body)
            await app.auditLog.Project.project.flowImported(request.session.User, null, request.project)
            reply.send(projectImport)
        } catch (err) {
            if (err.name === 'SyntaxError') {
                reply.code(403).send({ code: 'credentials_bad_secret', error: 'incorrect credential secret' })
            } else {
                reply.code(500).send({ code: 'unknown_error', error: 'unknown error' })
            }
        }
    })

    /**
     * Merge env vars from 2 arrays.
     *
     * NOTE: When a var is found in both, currentVars will take precedence
     * @param {{envVars:boolean|string}} options the merge options. `true` will merge (existing), `'keys'` will merge only the key names from `incomingVars`
     * @param {[{name:string, value:string}]} incomingVars an array containing the vars to merge with currentVars
     * @param {[{name:string, value:string}]} currentVars an array containing the current vars
     * @returns {*} an object containing the merged vars
     */
    function mergeEnvVars (options, incomingVars, currentVars) {
        if (!options || options.envVars === false) {
            return currentVars
        }
        const incomingKV = Object.fromEntries((incomingVars || []).map(e => {
            return e && e.name ? [e.name, options.envVars === 'keys' ? '' : e.value || ''] : ['', '']
        }))
        const existingKV = Object.fromEntries((currentVars || []).map(e => {
            return e && e.name ? [e.name, e.value || ''] : ['', '']
        }))
        const mergedKV = Object.assign({}, incomingKV, existingKV)
        return Object.entries(mergedKV).filter(e => !!e[0]).map(([k, v]) => { return { name: k, value: v } })
    }

    function generateCredentialSecret () {
        return crypto.randomBytes(32).toString('hex')
    }
}
