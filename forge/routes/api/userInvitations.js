/**
 * User Invitations api routes
 *
 * - /api/v1/user/invitations
 *
 * These routes all operate in the context of the logged-in user
 * req.session.User
 * @namespace userInvitations
 * @memberof forge.routes.api
 */
module.exports = async function(app) {

    app.get('/', async (request, reply) => {
        const invitations = await app.db.models.Invitation.forUser(request.session.User)
        const result = app.db.views.Invitation.invitationList(invitations);
        reply.send({
            count: result.length,
            invitations:result
        })
        reply.send(result)
    })

    /**
     * Accept an invitation
     * PATCH [/api/v1/user/invitations]/:invitationId
     */
    app.patch('/:invitationId', async (request, reply) => {
        const invitation = await app.db.models.Invitation.byId(request.params.invitationId);
        if (invitation) {
            await invitation.team.addUser(request.session.User, { through: { role:"member" } })
            await invitation.destroy()
            reply.send({status:'okay'})
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
        return
    })

    /**
     * Reject an invitation
     * DELETE [/api/v1/user/invitations]/:invitationId
     */
    app.delete('/:invitationId', async (request, reply) => {
        const invitation = await app.db.models.Invitation.byId(request.params.invitationId);
        if (invitation) {
            await invitation.destroy();
            reply.send({status:'okay'})
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })


}
