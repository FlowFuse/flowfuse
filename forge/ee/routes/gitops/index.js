// const axios = require('axios')

module.exports = async function (app) {
    // All routes are relative to /api/v1/teams/:teamId/git

    app.addHook('preHandler', async (request, reply) => {
        if (request.params.teamId !== undefined) {
            request.team = await app.db.models.Team.byId(request.params.teamId)
            if (!request.team) {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                return
            }
            const teamType = await request.team.getTeamType()
            if (!teamType.getFeatureProperty('gitIntegration', false)) {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                return // eslint-disable-line no-useless-return
            }
            if (!request.teamMembership) {
                request.teamMembership = await request.session.User.getTeamMembership(request.team.id)
            }
        }
        if (!request.team) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return // eslint-disable-line no-useless-return
        }
    })

    app.get('/tokens', {
        preHandler: app.needsPermission('team:git:tokens:list')
    }, async (request, reply) => {
        const tokens = await app.db.models.GitToken.byTeam(request.team.id)
        reply.send({
            meta: {},
            count: tokens.length,
            tokens: app.db.views.GitToken.tokenList(tokens)
        })
    })

    app.post('/tokens', {
        preHandler: app.needsPermission('team:git:tokens:create')
    }, async (request, reply) => {
        try {
            const body = request.body
            if (!body.name || !body.token) {
                reply.code(400).send({ code: 'invalid_request', error: 'Missing required fields' })
                return
            }
            const token = await app.db.models.GitToken.create({
                name: body.name,
                token: body.token,
                TeamId: request.team.id
            })
            // TODO: audit log
            // await app.auditLog.Project.project.httpToken.created(request.session.User, null, request.project, body)
            reply.send(app.db.views.GitToken.token(token))
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            reply.code(400).send(resp)
        }
    })

    app.delete('/tokens/:tokenId', {
        preHandler: app.needsPermission('team:git:tokens:delete')
    }, async (request, reply) => {
        try {
            const token = await app.db.models.GitToken.byId(request.params.tokenId, request.team.id)
            if (!token) {
                // Invalid token for this team
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                return
            }
            await token.destroy()
            reply.send({})
        } catch (err) {
            reply.status(500).send({ error: 'unknown_error', message: err.toString() })
        }
    })

    app.put('/tokens/:tokenId', {
        preHandler: app.needsPermission('team:git:tokens:edit')
    }, async (request, reply) => {
        try {
            const token = await app.db.models.GitToken.byId(request.params.tokenId, request.team.id)
            if (!token) {
                // Invalid token for this team
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                return
            }
            if (request.body.name && token.name !== request.body.name) {
                token.name = request.body.name
                await token.save()
            }
            reply.send(app.db.views.GitToken.token(token))
        } catch (err) {
            reply.status(500).send({ error: 'unknown_error', message: err.toString() })
        }
    })

    // app.get('/github/auth/setup', {
    // }, async (request, reply) => {
    //     console.log(request.query.code)
    //     const code = request.query.code
    //     const state = request.query.state
    //     console.log(`code:${code} state:${state}`)
    //     console.log(`https://api.github.com/app-manifests/${code}/conversions`)

    //     const response = await axios.post(`https://api.github.com/app-manifests/${code}/conversions`, '', {
    //         headers: {
    //             Accept: 'application/vnd.github.v3+json',
    //             'X-GitHub-Api-Version': '2022-11-28'
    //         }
    //     })
    //     console.log(response.data)
    //     console.log(response.status)
    //     console.log(response.statusText)
    //     reply.redirect(response.data.html_url)
    //     // reply.send({})
    // })
}
