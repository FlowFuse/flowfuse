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
            const resp = { status: 'okay' }
            await userLog(request.session.User.id, 'accept-invite', resp, invitation.inviteeId)
            reply.send(resp)
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
            const resp = { status: 'okay' }
            await userLog(request.session.User.id, 'delete-invite', resp, invitation.inviteeId)
            reply.send(resp)
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })

    /**
     * Log events against the entityType `users.x.y`
     * @param {number} userId User performing the action
     * @param {string} event The name of the event
     * @param {*} body The body/data for the log entry
     * @param {string|number} [entityId] The ID of the user being affected (where available)
     */
    async function userLog (userId, event, body, entityId) {
        try {
            // function userLog (app, UserId, event, body, entityId)
            await app.db.controllers.AuditLog.userLog(
                userId,
                `user.invitations.${event}`,
                body,
                entityId || userId
            )
        } catch (error) {
            console.error(error)
        }
    }
}
