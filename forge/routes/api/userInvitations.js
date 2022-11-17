const { getUserLogger } = require('../../lib/audit-logging')

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
    app.addHook('preHandler', app.needsPermission('user:edit'))
    const userAuditLog = getUserLogger(app)

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
            await userAuditLog.user.invitation.accepted(request.session.User, null)
            reply.send({ status: 'okay' })
        } else {
            const resp = { code: 'not_found', error: 'Not Found' }
            await userAuditLog.user.invitation.accepted(request.session.User, resp)
            reply.code(404).send(resp)
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
            await userAuditLog.user.invitation.deleted(request.session.User, null)
            reply.send({ status: 'okay' })
        } else {
            const resp = { code: 'not_found', error: 'Not Found' }
            await userAuditLog.user.invitations.deleteInvite(request.session.User, resp)
            reply.code(404).send(resp)
        }
    })
}
