module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)

    app.addHook('preHandler', async (request, reply) => {
        if (request.params.teamId !== undefined || request.params.teamSlug !== undefined) {
            let teamId = request.params.teamId
            if (request.params.teamSlug) {
                // If :teamSlug is provided, need to lookup the team to get
                // its id for subsequent checks
                request.team = await app.db.models.Team.bySlug(request.params.teamSlug)
                if (!request.team) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return
                }
                teamId = request.team.hashid
            }

            if (!request.team) {
                // For a :teamId route, we can now lookup the full team object
                request.team = await app.db.models.Team.byId(request.params.teamId)
                if (!request.team) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            }
        }
    })

    app.get('/users', {

    }, async (request, reply) => {
        console.log('team', request.team)
        console.log(app.db.models.TeamBrokerUser)
        reply.send(await app.db.models.TeamBrokerUser.byTeam(request.team.hashid))
    })

    app.post('/user', {

    }, async (request, reply) => {
        
    })

    app.get('/user/:username', {

    }, async (request, reply) => {

    })

    app.delete('/user/:username', {

    }, async (request, reply) => {
        
    })
}