const ProjectActions = require('./projectActions.js')
const crypto = require('crypto')

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
    'billing'
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

    app.register(ProjectActions, { prefix: '/:projectId/actions' })

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
            result.meta = await app.containers.details(request.project) || { state: 'unknownn' }
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
                required: ['name', 'team', 'stack', 'template'],
                properties: {
                    name: { type: 'string' },
                    team: { type: ['string', 'number'] },
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
                reply.code(400).send('Source Project Not Found')
                return
            } else if (sourceProject.Team.hashid !== request.body.team) {
                console.log(sourceProject.Team.hashid, request.body.team)
                reply.code(400).send('Source Project Not in Same Team')
                return
            }
        }

        const stack = await app.db.models.ProjectStack.byId(request.body.stack)

        if (!stack) {
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
            reply.status(409).type('application/json').send({ err: 'name not allowed' })
            return
        }
        if (await app.db.models.Project.count({ where: { name: name } }) !== 0) {
            reply.status(409).type('application/json').send({ err: 'name in use' })
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
        await project.reload({
            include: [
                { model: app.db.models.Team },
                { model: app.db.models.ProjectStack },
                { model: app.db.models.ProjectTemplate }
            ]
        })

        if (sourceProject) {
            // need to copy values over
            const settingsString = (await app.db.models.StorageSettings.byProject(sourceProject.id))?.settings
            const sourceSettings = JSON.parse(settingsString)
            const newSettings = {
                ...sourceSettings.nodes,
                users: {}
            }
            const options = request.body.sourceProject.options
            if (options.flows) {
                const sourceFlows = await app.db.models.StorageFlow.byProject(sourceProject.id)
                const newFlow = await app.db.models.StorageFlow.create({
                    flow: sourceFlows.flow,
                    ProjectId: project.id
                })
                await newFlow.save()

                if (options.creds) {
                    // need to work out how to insert the credentialsSecret
                    let newKey
                    if (options.creds === true) {
                        newKey = crypto.randomBytes(32).toString('hex')
                    } else {
                        newKey = options.creds
                    }
                    const origCredentials = await app.db.models.StorageCredentials.byProject(sourceProject.id)
                    if (origCredentials) {
                        const sourceCreds = JSON.parse(origCredentials.credentials)
                        const newCreds = recryptCreds(sourceCreds, sourceSettings._credentialSecret, newKey)
                        const creds = await app.db.models.StorageCredentials.create({
                            credentials: JSON.stringify(newCreds),
                            ProjectId: project.id
                        })
                        await creds.save()
                        newSettings._credentialSecret = newKey
                    }
                }
            }
            const settings = await app.db.models.StorageSettings.create({
                settings: JSON.stringify(newSettings),
                ProjectId: project.id
            })
            await settings.save()

            if (options.envVars) {
                const sourceProjectSettings = await app.db.controllers.Project.getRuntimeSettings(sourceProject)
                if (sourceProjectSettings && sourceProjectSettings.env) {
                    const newEnvVars = {
                        env: []
                    }
                    Object.keys(sourceProjectSettings.env).forEach(key => {
                        newEnvVars.env.push({
                            name: key,
                            value: options.envVarsKo ? '' : sourceProjectSettings.env[key]
                        })
                    })
                    await project.updateSetting('settings', newEnvVars)
                }
            }
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
            request.project.destroy()
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
            console.log('missing', err)
            console.log(err)
            reply.code(500).send({})
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
            if (request.body.stack !== request.project.ProjectStack.id) {
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
                reply.code(401).send({ err: 'unauthorised' })
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
    app.post('/:projectId/export', async (request, reply) => {
        const components = request.body.components
        reply.header('content-disposition', 'attachment; filename="project.json"')
        const projectExport = {}
        if (components.flows) {
            const flows = await app.db.models.StorageFlow.byProject(request.project.id)
            projectExport.flows = !flows ? [] : JSON.parse(flows.flow)

            if (components.creds) {
                const origCredentials = await app.db.models.StorageCredentials.byProject(request.project.id)
                if (origCredentials) {
                    const encryptedCreds = JSON.parse(origCredentials.credentials)
                    const settings = JSON.parse((await app.db.models.StorageSettings.byProject(request.project.id)).settings)
                    const key = crypto.createHash('sha256').update(settings._credentialSecret).digest()
                    const plainText = decryptCreds(key, encryptedCreds)
                    const newKey = crypto.createHash('sha256').update(components.creds).digest()
                    const newCreds = encryptCreds(newKey, plainText)

                    projectExport.credentials = newCreds
                }
            }
        }
        if (components.envVars) {
            const settings = await app.db.controllers.Project.getRuntimeSettings(request.project)
            if (components.envVarsKo) {
                projectExport.envVars = {}
                Object.keys(settings.env).forEach(key => {
                    projectExport.envVars[key] = ''
                })
            } else {
                if (settings.env) {
                    projectExport.envVars = settings.env
                }
            }
        }
        const NRSettings = await app.db.models.StorageSettings.byProject(request.project.id)
        if (NRSettings) {
            projectExport.nodes = JSON.parse(NRSettings.settings).nodes
        }
        reply.send(projectExport)
    })

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
}
