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
module.exports = async function (app) {
    app.get('/', async (request, reply) => {
        const invitations = await app.db.models.Invitation.forUser(request.session.User)
        const result = app.db.views.Invitation.invitationList(invitations)
        reply.send({
            meta: {}, // For future pagination
            count: result.length,
            invitations: result
        })
    })

    /**
     * Accept an invitation
     * PATCH [/api/v1/user/invitations]/:invitationId
     */
    app.patch('/:invitationId', async (request, reply) => {
        const invitation = await app.db.models.Invitation.byId(request.params.invitationId, request.session.User)
        if (invitation) {
            await app.db.controllers.Invitation.acceptInvitation(invitation, request.session.User)
            reply.send({ status: 'okay' })
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })

    /**
     * Reject an invitation
     * DELETE [/api/v1/user/invitations]/:invitationId
     */
    app.delete('/:invitationId', async (request, reply) => {
        const invitation = await app.db.models.Invitation.byId(request.params.invitationId, request.session.User)
        if (invitation) {
            await app.db.controllers.Invitation.rejectInvitation(invitation, request.session.User)
            reply.send({ status: 'okay' })
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })
}
