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

const { Roles } = require('../../lib/roles')

module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        if (request.method === 'GET') {
            return // no checks required other than user being logged in (handled by parent route)
        }
        try {
            const invitation = await app.db.models.Invitation.byId(request.params.invitationId, request.session.User)
            if (!invitation) {
                return reply.code(404).type('text/html').send('Not Found')
            }
            if (request.session.User.id === invitation.inviteeId) {
                // Add invitation to the req to avoid 2nd further lookups
                request.invitation = invitation
                return
            }
            const userRole = await app.db.models.TeamMember.getTeamMembership(request.session.User.id, invitation.teamId, false)
            if (userRole && [Roles.Admin, Roles.Owner].indexOf(userRole?.role) > -1) {
                // Add invitation to the req to avoid 2nd further lookups
                request.invitation = invitation
                return
            }
            return reply.code(403).type('text/html').send('Not Authorised')
        } catch (err) {
            console.log(err)
            reply.code(500).send({ error: err.toString() })
        }
    })

    /**
     * List users invitations
     * GET [/api/v1/user/invitations]/
     */
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
        await app.db.controllers.Invitation.acceptInvitation(request.invitation, request.session.User)
        reply.send({ status: 'okay' })
    })

    /**
     * Reject an invitation
     * DELETE [/api/v1/user/invitations]/:invitationId
     */
    app.delete('/:invitationId', async (request, reply) => {
        await app.db.controllers.Invitation.rejectInvitation(request.invitation, request.session.User)
        reply.send({ status: 'okay' })
    })
}
