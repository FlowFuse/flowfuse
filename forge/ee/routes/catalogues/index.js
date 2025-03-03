const axios = require('axios')

module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.teamId !== undefined || request.params.teamSlug !== undefined) {
            if (!request.team) {
                // For a :teamId route, we can now lookup the full team object
                request.team = await app.db.models.Team.byId(request.params.teamId)
                if (!request.team) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return
                }

                const teamType = await request.team.getTeamType()
                if (!teamType.getFeatureProperty('npm', false)) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return // eslint-disable-line no-useless-return
                }
            }
            if (!request.teamMembership && request.session.User) {
                request.teamMembership = await request.session.User.getTeamMembership(request.team.id)
            }
        }
    })

    /**
     * Get Teams npm packages
     * @name /api/v1/teams/:teamId/npm/packages
     * @static
     * @memberof forge.routes.api.team.npm
     */
    app.get('/npm/packages', {
        preHandler: app.needsPermission('team:packages:read'),
        schema: {
            summary: 'Gets the private packages owned by this team',
            tags: ['NPM Packages']
        }
    }, async (request, reply) => {
        try {
            const packageList = await axios.get(`${app.config.npmRegistry?.url}/-/all`, {
                // If we can swap this for a teams creds or token then the
                // filtering will all be done in the npm repo
                auth: {
                    username: app.config.npmRegistry.admin.username,
                    password: app.config.npmRegistry.admin.password
                }
            })

            const packages = {}
            for (const package in packageList.data) {
                if (package === '_updated') {
                    continue
                }
                if (package.startsWith(`@${request.params.teamId}/`)) {
                    packages[package] = packageList.data[package]
                }
            }

            reply.send(packages)
        } catch (err) {
            reply.status(500).send({ error: 'unknown_error', message: err.toString() })
        }
    })

    /**
     * Test is user already has a npm password
     *
     * @name /api/v1/teams/:teamId/npm/userToken
     * @memberof forge.routes.api.team.npm
     */
    app.get('/npm/userToken', {
        preHandler: app.needsPermission('team:packages:manage'),
        schema: {
            summary: 'Check if user already has a NPM auth token',
            tags: ['NPM packages'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    userId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object'
                },
                404: {
                    type: 'object'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const token = await app.db.models.AccessToken.findOne({
            where: {
                scope: 'npm',
                ownerId: `${request.session.User.hashid}@${request.params.teamId}`
            }
        })
        if (token) {
            reply.status(200).send({})
        } else {
            reply.status(404).send({})
        }
    })

    /**
     * Test is user already has a npm password
     *
     * @name /api/v1/teams/:teamId/npm/userToken
     * @memberof forge.routes.api.team.npm
     */
    app.post('/npm/userToken', {
        preHandler: app.needsPermission('team:packages:manage'),
        schema: {
            summary: 'Generate a new user password for NPM registry',
            tags: ['NPM packages'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    userId: { type: 'string' }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        username: { type: 'string' },
                        token: { type: 'string' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const token = await app.db.controllers.AccessToken.createTokenForNPM(request.session.User, request.team, ['team:packages:manage'])
        reply.status(201).send(token)
    })

    /**
     * Get Team catalogue
     * @name /api/v1/teams/:teamId/npm/catalogue
     * @static
     * @memberof forge.routes.api.team.npm
     */
    app.get('/npm/catalogue', {
        config: {
            allowAnonymous: true
        }
    }, async (request, reply) => {
        if (request.params.teamId && (request.query.device || request.query.instance)) {
            const team = await app.db.models.Team.byId(request.params.teamId)

            let clientTeam
            if (request.query.device) {
                const device = await app.db.models.Device.byId(request.query.device)
                if (device) {
                    clientTeam = device.Team.hashid
                }
            } else if (request.query.instance) {
                const instance = await app.db.models.Project.byId(request.query.instance)
                if (instance) {
                    clientTeam = instance.Team.hashid
                }
            }
            // Might not need the first test as undefined !== teamid...
            if (!clientTeam || clientTeam !== request.params.teamId) {
                reply.status(401).send({ error: 'not_authorized', message: 'Not Authorized' })
                return
            }

            try {
                const packageList = await axios.get(`${app.config.npmRegistry?.url}/-/all`, {
                    // If we can swap this for a teams creds or token then the
                    // filtering will all be done in the npm repo
                    auth: {
                        username: app.config.npmRegistry.admin.username,
                        password: app.config.npmRegistry.admin.password
                    }
                })

                const modules = []
                for (const package in packageList.data) {
                    if (package === '_updated') {
                        continue
                    }
                    if (package.startsWith(`@${request.params.teamId}/`)) {
                        modules.push({
                            id: package,
                            description: packageList.data[package].description,
                            version: packageList.data[package]['dist-tags'].latest,
                            updated_at: packageList.data[package].time.modified,
                            keywords: packageList.data[package].keywords
                        })
                    }
                }

                reply.header('Access-Control-Allow-Origin', '*')
                reply.send({
                    name: `FlowFuse Team ${team.name} catalogue`,
                    updated_at: '2025-02-23T11:00:00.000Z',
                    modules
                })
            } catch (err) {
                reply.status(500).send({ error: 'unknown_error', message: err.toString() })
            }
        } else {
            reply.status(404).send({ error: 'not_found', message: 'not found' })
        }
    })
}
