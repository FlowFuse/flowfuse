module.exports = async function (app) {
    app.get('/catalogue',{
        config:{
            allowAnonymous: true
        }
    }, async (request, reply) => {
        if (request.params.teamId && request.query.teamId) {
            const team = await app.db.models.Team.byId(request.params.teamId)
            reply.header('Access-Control-Allow-Origin', '*')
            reply.send({
                name: `FlowFuse Team ${team.name} catalogue`,
                updated_at: "2025-02-23T11:00:00.000Z",
                modules: [
                    {
                        id: '@foobar/hello-world',
                        version: "0.0.1",
                        updated_at: "2025-02-23T11:00:00.000Z",
                        description: 'HelloWorld'
                    }
                ]
            })
        } else {
            reply.status(404).send({error: 'not_found', message: "not found"})
        }
        
    })
}