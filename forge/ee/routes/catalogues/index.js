const axios = require('axios')

module.exports = async function (app) {
    const preHandler = async (request, reply) => {
        if (request.params.teamId !== undefined || request.params.teamSlug !== undefined) {
            if (!request.team) {
                // For a :teamId route, we can now lookup the full team object
                request.team = await app.db.models.Team.byId(request.params.teamId)
                if (!request.team) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return
                }

                // TODO When team type enabled
                // const teamType = await request.team.getTeamType()
                // if (!teamType.getFeatureProperty('teamNPM', false)) {
                //     reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                //     return // eslint-disable-line no-useless-return
                // }
            }
            if (!request.teamMembership && request.session.User) {
                request.teamMembership = await request.session.User.getTeamMembership(request.team.id)
            }
        }
    }
    /**
     * Get Teams npm packages
     * @name /api/v1/teams/:teamId/npm/packages
     * @static
     * @memberof forge.routes.api.team.npm
     */
    app.get('/npm/packages', {
        preHandler: [
            preHandler,
            app.needsPermission('team:packages:read')
        ],
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
     * Get Team catlogue
     * @name /api/v1/teams/:teamId/npm/catalogue
     * @static
     * @memberof forge.routes.api.team.npm
     */
    app.get('/npm/catalogue', {
        config: {
            allowAnonymous: true
        }
    }, async (request, reply) => {
        if (request.params.teamId && request.query.teamId) {
            const team = await app.db.models.Team.byId(request.params.teamId)

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
