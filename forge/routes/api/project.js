const { KEY_HOSTNAME, KEY_SETTINGS } = require('../../db/models/ProjectSettings')
const { Roles } = require('../../lib/roles')

const { isFQDN } = require('../../lib/validate')

const ProjectActions = require('./projectActions')
const ProjectDevices = require('./projectDevices')
const ProjectSnapshots = require('./projectSnapshots')

/**
 * Instance api routes
 *
 * Of note: Instances were previously called projects
 *
 * - /api/v1/projects
 *
 * - Any route that has a :instanceId parameter will:
 *    - Ensure the session user is either admin or has a role on the corresponding team
 *    - request.project prepopulated with the team object
 *    - request.teamMembership prepopulated with the user role ({role: XYZ})
 *      (unless they are admin)
 *
 * @namespace project
 * @memberof forge.routes.api
 */

module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.instanceId !== undefined) {
            if (request.params.instanceId) {
                try {
                    // StorageFlow needed for last updates time (live status)
                    request.project = await app.db.models.Project.byId(request.params.instanceId, { includeStorageFlows: true })
                    if (!request.project) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    if (request.session.User) {
                        request.teamMembership = await request.session.User.getTeamMembership(request.project.Team.id)
                        if (!request.teamMembership && !request.session.User.admin) {
                            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                            return // eslint-disable-line no-useless-return
                        }
                    } else if (request.session.ownerId !== request.params.instanceId) {
                        // AccesToken being used - but not owned by this project
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return // eslint-disable-line no-useless-return
                    }
                } catch (err) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })

    app.register(ProjectDevices, { prefix: '/:instanceId/devices' })
    app.register(ProjectActions, { prefix: '/:instanceId/actions' })
    app.register(ProjectSnapshots, { prefix: '/:instanceId/snapshots' })

    /**
     * Get the details of a given instance
     * @name /api/v1/projects/:instanceId
     * @static
     * @memberof forge.routes.api.project
     */
    app.get('/:instanceId', {
        preHandler: app.needsPermission('project:read'),
        schema: {
            summary: 'Get details of an instance',
            tags: ['Instances'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    allOf: [
                        { $ref: 'Instance' },
                        { $ref: 'InstanceStatus' }
                    ]
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // Storage flow needed for live status
        const projectPromise = app.db.views.Project.project(request.project)
        const projectStatePromise = request.project.liveState()

        const project = await projectPromise
        const projectState = await projectStatePromise

        reply.send({ ...project, ...projectState })
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
            summary: 'Create an instance',
            tags: ['Instances'],
            body: {
                type: 'object',
                required: ['name', 'projectType', 'stack', 'template', 'applicationId'],
                properties: {
                    name: { type: 'string' },
                    applicationId: { type: 'string' },
                    projectType: { type: 'string' },
                    stack: { type: 'string' },
                    flowBlueprintId: { type: 'string' },
                    template: { type: 'string' },
                    sourceProject: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            options: { type: 'object' }
                        }
                    }
                }
            },
            response: {
                200: {
                    allOf: [
                        { $ref: 'Instance' },
                        { $ref: 'InstanceStatus' }
                    ]
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const team = await request.application.getTeam()
        const application = request.application

        const projectType = await app.db.models.ProjectType.byId(request.body.projectType)
        const projectStack = await app.db.models.ProjectStack.byId(request.body.stack)
        const projectTemplate = await app.db.models.ProjectTemplate.byId(request.body.template)

        let flowBlueprint
        if (request.body.flowBlueprintId) {
            flowBlueprint = await app.db.models.FlowTemplate.byId(request.body.flowBlueprintId)
            if (!flowBlueprint) {
                reply.code(400).send({ code: 'invalid_flow_blueprint', error: 'Flow Blueprint not found' })
                return
            }
            // ensure this teams type is allowed to use this blueprint
            const teamType = await team.getTeamType()
            if (flowBlueprint.teamTypeScope && !flowBlueprint.teamTypeScope.includes(teamType.id)) {
                reply.code(400).send({ code: 'invalid_flow_blueprint', error: 'Flow Blueprint not allowed for this team' })
                return
            }
        }
        // Read in any source to copy from
        let sourceProject
        if (request.body.sourceProject?.id) {
            if (flowBlueprint) {
                reply.code(400).send({ code: 'invalid_request', error: 'Cannot use both sourceProject and flowBlueprintId' })
                return
            }
            sourceProject = await app.db.models.Project.byId(request.body.sourceProject.id)
            if (!sourceProject) {
                reply.code(400).send({ code: 'invalid_source_project', error: 'Source Project Not Found' })
                return
            }
        }

        // Create the real project (performs validation)
        let project
        try {
            project = await app.db.controllers.Project.create(
                team,
                application,
                request.session.User,
                projectType,
                projectStack,
                projectTemplate,
                {
                    name: request.body.name,
                    ha: request.body.ha,
                    sourceProject,
                    sourceProjectOptions: request.body.sourceProject?.options,
                    flowBlueprint
                }
            )
        } catch (err) {
            return reply
                .code(err.statusCode || 400)
                .send({
                    code: err.code || 'unexpected_error',
                    error: err.error || err.message
                })
        }

        const projectViewPromise = app.db.views.Project.project(project)
        const projectStatePromise = project.liveState()

        reply.send({ ...await projectViewPromise, ...await projectStatePromise })
    })
    /**
     * Delete a project
     * @name /api/v1/projects/:id
     * @memberof forge.routes.api.project
     */
    app.delete('/:instanceId', {
        preHandler: app.needsPermission('project:delete'),
        schema: {
            summary: 'Delete an instance',
            tags: ['Instances'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            try {
                await app.containers.remove(request.project)
            } catch (err) {
                // Swallow no such container error code (as it may have been removed from wrapper already)
                // https://github.com/apocas/dockerode/blob/edf29ccb2c2c7bfcdd1cf3cacbe861bd0f4bc87a/lib/network.js#L67
                if (err?.statusCode !== 404) {
                    throw err
                }
            }

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
     * @name /api/v1/projects/:id
     * @memberof forge.routes.api.project
     */
    app.put('/:instanceId', {
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
        },
        schema: {
            summary: 'Update an instance',
            tags: ['Instances'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    hostname: { type: 'string' },
                    settings: { type: 'object' },
                    projectType: { type: 'string' },
                    stack: { type: 'string' },
                    sourceProject: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            options: { type: 'object' }
                        }
                    }
                }
            },
            response: {
                200: {
                    allOf: [
                        { $ref: 'Instance' },
                        { $ref: 'InstanceStatus' }
                    ]
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
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
            app.db.controllers.Project.setInDeploy(request.project)

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
            if (app.db.models.Project.BANNED_NAME_LIST.includes(reqSafeName)) {
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
            let newSettings
            try {
                newSettings = app.db.controllers.ProjectTemplate.validateSettings(bodySettings, request.project.ProjectTemplate)
            } catch (err) {
                reply.code(400).send({ code: 'settings_validation', error: `${err.message}` })
                return
            }

            if (newSettings.httpNodeAuth?.type === 'flowforge-user') {
                const teamType = await request.project.Team.getTeamType()
                if (teamType.properties.features?.teamHttpSecurity === false) {
                    reply.code(400).send({ code: 'invalid_request', error: 'FlowFuse User Authentication not available for this team type' })
                    return
                }
            }

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
                    return true
                }).catch(err => {
                    app.log.info(`Failed to restart project ${request.project.id}`)
                    throw err
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
            const sourceSettingsString = ((await app.db.models.StorageSettings.byProject(sourceProject.id))?.settings) ?? '{}'
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
                        trgCredentialSecret = targetSettings?._credentialSecret || app.db.models.Project.generateCredentialSecret()
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
     * @name /api/v1/projects/:id/settings
     * @memberof forge.routes.api.project
     */
    app.get('/:instanceId/settings', {
        preHandler: (request, reply, done) => {
            // check accessToken is project scope
            // (ownerId already checked at top-level preHandler)
            if (request.session.ownerType !== 'project') {
                reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
            } else {
                done()
            }
        },
        schema: {
            summary: 'Get an instance runtime settings (instance tokens only)',
            tags: ['Instances'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                }
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

        const teamType = await request.project.Team.getTeamType()

        if (app.config.features.enabled('ha') && teamType.getFeatureProperty('ha', true)) {
            const ha = await request.project.getHASettings()
            if (ha && ha.replicas > 1) {
                settings.ha = ha
            }
        }
        const customCatalogsEnabledForTeam = app.config.features.enabled('customCatalogs') && teamType.getFeatureProperty('customCatalogs', false)
        if (!customCatalogsEnabledForTeam) {
            delete settings.settings?.palette?.npmrc
            delete settings.settings?.palette?.catalogue
        }
        settings.features = {
            'shared-library': app.config.features.enabled('shared-library') && teamType.getFeatureProperty('shared-library', true),
            projectComms: app.config.features.enabled('projectComms') && teamType.getFeatureProperty('projectComms', true)
        }
        reply.send(settings)
    })

    /**
     * Get project logs
     *  - returns most recent 30 entries
     *  - ?cursor= can be used to set the 'most recent log entry' to query from
     *  - ?limit= can be used to modify how many entries to return
     * @name /api/v1/projects/:id/logs
     * @memberof forge.routes.api.project
     */
    app.get('/:instanceId/logs', {
        preHandler: app.needsPermission('project:log'),
        schema: {
            summary: 'Get instance logs',
            tags: ['Instances'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            query: {
                $ref: 'PaginationParams'
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        log: { type: 'array', items: { type: 'object', additionalProperties: true } }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        if (request.project.state === 'suspended') {
            reply.code(400).send({ code: 'project_suspended', error: 'Project suspended' })
            return
        }
        try {
            const paginationOptions = app.getPaginationOptions(request, { limit: 30 })
            let logs = await app.containers?.logs(request.project)
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
                    } else if (logs[i].ts > cursor) {
                        if (i) { i-- }
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
        } catch (error) {
            let responseCode = error.response?.status || 500 // default to 500
            error.errorCode = 'unknown_error'
            error.errorMessage = error.message || 'Unknown error'
            if (error.code === 'ECONNREFUSED') {
                responseCode = 503 // service unavailable
                error.errorCode = 'connection_refused'
                error.errorMessage = 'Connection refused'
            } else if (error.code === 'ECONNRESET') {
                responseCode = 503 // service unavailable
                error.errorCode = 'connection_reset'
                error.errorMessage = 'Connection reset'
            } else if (error.code === 'ENOTFOUND') {
                responseCode = 503 // service unavailable
                error.errorCode = 'not_found'
                error.errorMessage = 'Not found'
            }
            const info = `Instance: ${request.project.id} (${request.project.name}), Error: ${error.errorMessage} (${responseCode})`
            app.log.warn(`Unable to get Node-RED instance logs from its Launcher. ${info}`)
            reply.code(responseCode).send({ code: error.errorCode, error: error.errorMessage })
        }
    })

    /**
     * TODO: Add support for filtering by instance param when this is migrated to application API
     * @name /api/v1/projects/:id/audit-log
     * @memberof forge.routes.api.project
     */
    app.get('/:instanceId/audit-log', {
        preHandler: app.needsPermission('project:audit-log'),
        schema: {
            summary: 'Get instance audit event entries',
            tags: ['Instances'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            query: {
                allOf: [
                    { $ref: 'PaginationParams' },
                    { $ref: 'AuditLogQueryParams' }
                ]
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        log: { $ref: 'AuditLogEntryList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const logEntries = await app.db.models.AuditLog.forProject(request.project.id, paginationOptions)
        const result = app.db.views.AuditLog.auditLog(logEntries)
        reply.send(result)
    })

    /**
     *
     * @name /api/v1/projects/:id/import
     * @memberof forge.routes.api.project
     */
    app.post('/:instanceId/import', {
        preHandler: app.needsPermission('project:edit'),
        schema: {
            summary: 'Import flows to the instance',
            tags: ['Instances'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    flows: { type: 'string' },
                    credentials: { type: 'string' },
                    credsSecret: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            await app.db.controllers.Project.importProject(request.project, request.body)
            await app.auditLog.Project.project.flowImported(request.session.User, null, request.project)
            reply.send({ status: 'okay' })
        } catch (err) {
            if (err.name === 'SyntaxError') {
                reply.code(403).send({ code: 'invalid_credentials_secret', error: 'incorrect credential secret' })
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

    // app.get('/:instanceId/ha', {
    //     preHandler: app.needsPermission('project:read')
    // }, async (request, reply) => {
    //     reply.send(await request.project.getHASettings())
    // })
}
