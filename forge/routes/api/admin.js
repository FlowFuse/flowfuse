module.exports = async function(app) {
    app.addHook('preHandler',app.verifyAdmin);


    app.get('/stats', async (request, reply) => {
        const userCount = await app.db.models.User.count({attributes:['admin'],group:'admin'});
        const result = {
            userCount: 0,
            inviteCount: await app.db.models.Invitation.count(),
            adminCount: 0,
            teamCount: await app.db.models.Team.count(),
            projectCount: await app.db.models.Project.count()
        }
        userCount.forEach(u => {
            result.userCount += u.count
            if (u.admin === 1) {
                result.adminCount = u.count
            }
        })
        reply.send(result);
    })

    app.get('/license', async (request, reply) => {
        reply.send(app.license.get() || {});
    });

    app.put('/license', {
        schema: {
            body: {
                type: 'object',
                required: ['license','action'],
                properties: {
                    license: { type: 'string' },
                    action: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        try {
            if (request.body.action === "apply") {
                await app.license.apply(request.body.license);
                reply.send(app.license.get() || {});
            } else if (request.body.action === "inspect") {
                reply.send(await app.license.inspect(request.body.license))
            } else {
                reply.code(400).send({error:"Invalid action"})
            }
        } catch(err) {
            let responseMessage = err.toString();
            if (/malformed/.test(responseMessage)) {
                responseMessage = "Failed to parse license";
            }
            reply.code(400).send({error:responseMessage})
        }
    });

    app.get('/invitations', async (request, reply) => {
        // TODO: Pagination
        const invitations = await app.db.models.Invitation.get()
        const result = app.db.views.Invitation.invitationList(invitations);
        reply.send({
            count: result.length,
            invitations:result
        })
    })
}
