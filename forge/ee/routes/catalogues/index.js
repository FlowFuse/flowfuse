const axios = require('axios')

module.exports = async function (app) {
    app.get('/catalogue', {
        config: {
            allowAnonymous: true
        }
    }, async (request, reply) => {
        if (request.params.teamId && request.query.teamId) {
            const team = await app.db.models.Team.byId(request.params.teamId)

            try {
                const packageList = await axios.get(`${app.config.npmRegistry?.url}/-/all`, {
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
                    if (package.startsWith(`@${request.teamId}/`)) {
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
                reply.status(500).send({ error: 'unkown_error', message: err.toString() })
            }
        } else {
            reply.status(404).send({ error: 'not_found', message: 'not found' })
        }
    })
}
