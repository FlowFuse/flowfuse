const crypto = require('crypto')
const ProjectActions = require('./projectActions')
const ProjectDevices = require('./projectDevices')
const ProjectSnapshots = require('./projectSnapshots')

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
                        reply.code(404).type('text/html').send('Not Found')
                        return
                    }
                    if (request.session.User) {
                        request.teamMembership = await request.session.User.getTeamMembership(request.project.Team.id)
                        if (!request.teamMembership && !request.session.User.admin) {
                            reply.code(404).type('text/html').send('Not Found')
                            return
                        }
                    } else if (request.session.ownerId !== request.params.projectId) {
                        reply.code(404).type('text/html').send('Not Found')
                        return
                    }
                } catch (err) {
                    reply.code(404).type('text/html').send('Not Found')
                }
            } else {
                reply.code(404).type('text/html').send('Not Found')
            }
        }
    })

    if (app.config.features.enabled('devices')) {
        app.register(ProjectDevices, { prefix: '/:projectId/devices' })
    }
    app.register(ProjectActions, { prefix: '/:projectId/actions' })
    app.register(ProjectSnapshots, { prefix: '/:projectId/snapshots' })

    /**
     * Get the details of a given project
     * @name /api/v1/project/:projectId
     * @static
     * @memberof forge.routes.api.project
     */
    app.get('/:projectId', async (request, reply) => {
        const result = await app.db.views.Project.project(request.project)
        const inflightState = app.db.controllers.Project.getInflightState(request.project)
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
     * Create an new project
     * @name /api/v1/project
     * @memberof forge.routes.api.project
     */
    app.post('/', {
        preHandler: [
            async (request, reply) => {
                if (request.body && request.body.team) {
                    request.teamMembership = await request.session.User.getTeamMembership(request.body.team)
                }
            },
            app.needsPermission('project:create')
        ],
        schema: {
            body: {
                type: 'object',
                required: ['name', 'team', 'projectType', 'stack', 'template'],
                properties: {
                    name: { type: 'string' },
                    team: { type: ['string', 'number'] },
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
        const teamMembership = await request.session.User.getTeamMembership(request.body.team, true)
        // Assume membership is enough to allow project creation.
        // If we have roles that limit creation, that will need to be checked here.

        if (!teamMembership) {
            reply.code(401).send({ error: 'Current user not in team ' + request.body.team })
            return
        }

        const team = teamMembership.get('Team')

        let sourceProject
        if (request.body.sourceProject && request.body.sourceProject.id) {
            sourceProject = await app.db.models.Project.byId(request.body.sourceProject.id)
            if (!sourceProject) {
                reply.code(400).send({ error: 'Source Project Not Found' })
                return
            } else if (sourceProject.Team.hashid !== request.body.team) {
                reply.code(403).send({ error: 'Source Project Not in Same Team' })
                return
            }
        }

        const projectType = await app.db.models.ProjectType.byId(request.body.projectType)
        if (!projectType) {
            reply.code(400).send({ error: 'Invalid project type' })
            return
        }

        const stack = await app.db.models.ProjectStack.byId(request.body.stack)

        if (!stack || stack.ProjectTypeId !== projectType.id) {
            reply.code(400).send({ error: 'Invalid stack' })
            return
        }

        const template = await app.db.models.ProjectTemplate.byId(request.body.template)

        if (!template) {
            reply.code(400).send({ error: 'Invalid template' })
            return
        }

        const name = request.body.name

        if (bannedNameList.includes(name)) {
            reply.status(409).type('application/json').send({ error: 'name not allowed' })
            return
        }
        if (await app.db.models.Project.count({ where: { name: name } }) !== 0) {
            reply.status(409).type('application/json').send({ error: 'name in use' })
            return
        }

        const project = await app.db.models.Project.create({
            name: name,
            type: '',
            url: ''
        })

        // const authClient = await app.db.controllers.AuthClient.createClientForProject(project);
        // const projectToken = await app.db.controllers.AccessToken.createTokenForProject(project, null, ["project:flows:view","project:flows:edit"])
        // const containerOptions = {
        //     name: request.body.name,
        //     projectToken: projectToken.token,
        //     ...request.body.options,
        //     ...authClient
        // }

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

            const sourceProjectSettings = await sourceProject.getSetting('settings') || { env: [] }
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
            await project.updateSetting('settings', newProjectSettings)
        } else {
            await project.updateSetting('credentialSecret', generateCredentialSecret())
        }

        await app.containers.start(project)

        await app.db.controllers.AuditLog.projectLog(
            project.id,
            request.session.User.id,
            'project.created'
        )
        if (sourceProject) {
            await app.db.controllers.AuditLog.teamLog(
                team.id,
                request.session.User.id,
                'project.duplicated',
                {
                    sourceId: sourceProject.id,
                    sourceName: sourceProject.name,
                    newId: project.id,
                    newName: project.name
                }
            )
        } else {
            await app.db.controllers.AuditLog.teamLog(
                team.id,
                request.session.User.id,
                'project.created',
                { id: project.id, name: project.name }
            )
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
            await app.db.controllers.AuditLog.projectLog(
                request.project.id,
                request.session.User.id,
                'project.deleted'
            )
            await app.db.controllers.AuditLog.teamLog(
                request.project.Team.id,
                request.session.User.id,
                'project.deleted'
            )
            reply.send({ status: 'okay' })
        } catch (err) {
            reply.code(500).send({ error: err.toString() })
        }
    })

    /**
     * Update a project
     * @name /api/v1/project/:id
     * @memberof forge.routes.api.project
     */
    app.put('/:projectId', { preHandler: app.needsPermission('project:edit') }, async (request, reply) => {
        let changed = false
        if (request.body.stack) {
            if (request.body.stack !== request.project.ProjectStack?.id) {
                const stack = await app.db.models.ProjectStack.byId(request.body.stack)
                if (!stack) {
                    reply.code(400).send({ error: 'Invalid stack' })
                    return
                }
                app.log.info(`Updating project ${request.project.id} to use stack ${stack.hashid}`)

                // TODO: better inflight state needed
                app.db.controllers.Project.setInflightState(request.project, 'starting')

                // With the project stopped, respond to the request so the UI
                // can refresh to show 'progress'. We may want to move this even
                // earlier.

                reply.send({})

                let resumeProject = false
                // Remember the state to return the project back to
                const targetState = request.project.state
                if (request.project.state !== 'suspended') {
                    resumeProject = true
                    app.log.info(`Stopping project ${request.project.id}`)
                    await app.containers.stop(request.project)

                    await app.db.controllers.AuditLog.projectLog(
                        request.project.id,
                        request.session.User.id,
                        'project.suspended'
                    )
                }
                await request.project.setProjectStack(stack)
                await request.project.save()

                await app.db.controllers.AuditLog.projectLog(
                    request.project.id,
                    request.session.User.id,
                    'project.stack.changed',
                    { stack: stack.hashid, name: stack.name }
                )

                if (resumeProject) {
                    app.log.info(`Restarting project ${request.project.id}`)
                    request.project.state = targetState
                    await request.project.save()
                    // Ensure the project has the full stack object
                    await request.project.reload()
                    const startResult = await app.containers.start(request.project)
                    startResult.started.then(async () => {
                        await app.db.controllers.AuditLog.projectLog(
                            request.project.id,
                            request.session.User.id,
                            'project.started'
                        )
                        app.db.controllers.Project.clearInflightState(request.project)
                    })
                } else {
                    app.db.controllers.Project.clearInflightState(request.project)
                }
            }
        } else if (request.body.sourceProject) {
            const sourceProject = await app.db.models.Project.byId(request.body.sourceProject.id)
            const options = request.body.sourceProject.options
            if (!sourceProject) {
                reply.code(404).send('Source Project not found')
            }
            if (sourceProject.Team.id !== request.project.Team.id) {
                reply.code(403).send('Source Project and Target not in same team')
            }

            reply.send({})

            let resumeProject = false
            const targetState = request.project.state
            if (request.project.state !== 'suspended') {
                resumeProject = true
                app.log.info(`Stopping project ${request.project.id}`)
                await app.containers.stop(request.project)

                await app.db.controllers.AuditLog.projectLog(
                    request.project.id,
                    request.session.User.id,
                    'project.suspended'
                )
            }

            const sourceSettingsString = ((await app.db.models.StorageSettings.byProject(sourceProject.id))?.settings) || '{}'
            const sourceSettings = JSON.parse(sourceSettingsString)
            let targetStorageSettings = await app.db.models.StorageSettings.byProject(request.project.id)
            const targetSettingString = targetStorageSettings?.settings || '{}'
            const targetSettings = JSON.parse(targetSettingString)

            targetSettings.nodes = sourceSettings.nodes
            if (targetStorageSettings) {
                targetStorageSettings.settings = JSON.stringify(targetSettings)
            } else {
                targetStorageSettings = await app.db.models.StorageSettings.create({
                    settings: JSON.stringify(targetSettings),
                    ProjectId: request.project.id
                })
            }
            await targetStorageSettings.save()

            if (options.flows) {
                let sourceFlow = await app.db.models.StorageFlow.byProject(sourceProject.id)
                let targetFlow = await app.db.models.StorageFlow.byProject(request.project.id)
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
                        ProjectId: request.project.id
                    })
                }
                await targetFlow.save()
            }
            if (options.credentials) {
                // To copy over the credentials, we have to:
                //  - get the source credentials + credentialSecret
                //  - get the target credentials + credentialSecret
                //  - decrypt credentials from src and re-encrypt the
                //  - credentials using the target key for target StorageCredentials
                const origCredentials = await app.db.models.StorageCredentials.byProject(sourceProject.id)
                if (origCredentials) {
                    let trgCredentialSecret = await request.project.getSetting('credentialSecret')
                    if (trgCredentialSecret == null) {
                        trgCredentialSecret = targetSettings?._credentialSecret || generateCredentialSecret()
                        request.project.updateSetting('credentialSecret', trgCredentialSecret)
                        delete targetSettings._credentialSecret
                    }
                    const srcCredentials = JSON.parse(origCredentials.credentials)
                    const srcCredentialSecret = await sourceProject.getSetting('credentialSecret') || sourceSettings._credentialSecret
                    let targetCreds = await app.db.models.StorageCredentials.byProject(request.project.id)
                    if (targetCreds && srcCredentials) {
                        targetCreds.credentials = JSON.stringify(app.db.controllers.Project.exportCredentials(srcCredentials, srcCredentialSecret, trgCredentialSecret))
                        await targetCreds.save()
                    } else if (srcCredentials) {
                        targetCreds = await app.db.models.StorageCredentials.create({
                            credentials: JSON.stringify(app.db.controllers.Project.exportCredentials(srcCredentials, srcCredentialSecret, trgCredentialSecret)),
                            ProjectId: request.project.id
                        })
                        await targetCreds.save()
                    }
                }
            }
            if (options.template) {
                request.project.ProjectTemplateId = sourceProject.ProjectTemplateId
                await request.project.save()
                await request.project.reload()
            }
            // Get the source project settings
            const sourceProjectSettings = await sourceProject.getSetting('settings') || { env: [] }
            // Get the target project settings
            let targetProjectSettings = await request.project.getSetting('settings') || { env: [] }
            const targetProjectEnvVars = targetProjectSettings.env

            let updateSettings = false

            if (options.settings) {
                // The target project needs to pickup the source project settings
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
                await request.project.updateSetting('settings', targetProjectSettings)
            }

            if (resumeProject) {
                app.log.info(`Restarting project ${request.project.id}`)
                request.project.state = targetState
                await request.project.save()
                await request.project.reload()
                const startResult = await app.containers.start(request.project)
                startResult.started.then(async () => {
                    await app.db.controllers.AuditLog.projectLog(
                        request.project.id,
                        request.session.User.id,
                        'project.started'
                    )
                    app.db.controllers.Project.clearInflightState(request.project)
                })
            } else {
                app.db.controllers.Project.clearInflightState(request.project)
            }
        } else if (request.body.projectType) {
            if (request.project.ProjectType) {
                reply.code(400).send({ error: 'Cannot change project type' })
                return
            }
            const existingStackProjectType = request.project.ProjectStack.ProjectTypeId
            const newProjectType = await app.db.models.ProjectType.byId(request.body.projectType)
            if (!newProjectType) {
                reply.code(400).send({ error: 'Invalid project type' })
                return
            }
            if (existingStackProjectType && newProjectType.id !== existingStackProjectType) {
                reply.code(400).send({ error: 'Mismatch between stack project type and new project type' })
                return
            }

            await request.project.setProjectType(newProjectType)

            reply.code(200).send({})
        } else {
            if (request.body.name && request.project.name !== request.body.name) {
                request.project.name = request.body.name
                changed = true
            }
            if (request.body.settings) {
                // Validate the settings
                //  1. only store known keys
                //  2. only store values for keys the template policy allows to be set
                const newSettings = app.db.controllers.ProjectTemplate.validateSettings(request.body.settings, request.project.ProjectTemplate)
                // Merge the settings into the existing values
                const currentProjectSettings = await request.project.getSetting('settings') || {}
                const updatedSettings = app.db.controllers.ProjectTemplate.mergeSettings(currentProjectSettings, newSettings)
                await request.project.updateSetting('settings', updatedSettings)
                changed = true
            }
            if (changed) {
                await request.project.save()
                await app.db.controllers.AuditLog.projectLog(
                    request.project.id,
                    request.session.User.id,
                    'project.settings.updated'
                )
            }

            const result = await app.db.views.Project.project(request.project)
            result.meta = await app.containers.details(request.project) || { state: 'unknown' }
            result.team = await app.db.views.Team.team(request.project.Team)
            reply.send(result)
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
            if (request.session.ownerType !== 'project') {
                reply.code(401).send({ error: 'unauthorised' })
            } else {
                done()
            }
        }
    }, async (request, reply) => {
        if (request.project.state === 'suspended') {
            reply.code(400).send({ error: 'Project suspended' })
            return
        }
        const settings = await app.containers.settings(request.project)
        settings.env = settings.env || {}
        settings.baseURL = request.project.url
        settings.forgeURL = app.config.base_url
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
    app.get('/:projectId/logs', async (request, reply) => {
        if (request.project.state === 'suspended') {
            reply.code(400).send({ error: 'Project suspended' })
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
     *
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
     * @name /api/v1/project/:id/export
     * @memberof forge.routes.api.project
     */
    // app.get('/:projectId/export', async (request, reply) => {
    //     const components = request.body?.components
    //     // reply.header('content-disposition', 'attachment; filename="project.json"')
    //     const projectExport = await app.db.controllers.Project.exportProject(request.project, components)
    //     reply.send(projectExport)
    // })

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
