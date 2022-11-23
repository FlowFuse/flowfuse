/**
 * Team Invitations api routes
 *
 * - /api/v1/teams/:teamId/invitations
 *
 * By the time these handlers are invoked, :teamApi will have been validated
 * and 404'd if it doesn't exist. `request.team` will contain the team object
 *
 * @namespace teamInvitations
 * @memberof forge.routes.api
 */

const { TeamRoles, Roles } = require('../../lib/roles')

module.exports = async function (app) {
    // All routes require user to be owner of team
    app.addHook('preHandler', app.needsPermission('team:user:invite'))

    app.get('/', async (request, reply) => {
        const invitations = await app.db.models.Invitation.forTeam(request.team)
        const result = app.db.views.Invitation.invitationList(invitations)
        reply.send({
            meta: {}, // For future pagination
            count: result.length,
            invitations: result
        })
    })

    /**
     * Create an invitation
     * POST [/api/v1/teams/:teamId/invitations]/
     */
    app.post('/', async (request, reply) => {
        const userDetails = request.body.user.split(',').map(u => u.trim()).filter(Boolean)
        const role = request.body.role || Roles.Member
        if (!TeamRoles.includes(role)) {
            reply.code(400).send({ code: 'invalid_team_role', error: 'invalid team role' })
            return
        }
        let invites = []
        try {
            invites = await app.db.controllers.Invitation.createInvitations(request.session.User, request.team, userDetails, role)
        } catch (err) {
            reply.code(400).send({ code: 'invitation_failed', error: err.message })
            return
        }

        const result = {
            status: 'okay',
            message: {}
        }
        let errorCount = 0

        for (const [user, invite] of Object.entries(invites)) {
            if (typeof invite === 'string') {
                errorCount++
                result.message[user] = invite
            } else {
                try {
                    // controllers.Invitation.createInvitations will have already
                    // rejected external requests if team:user:invite:external set to false
                    if (invite.external) {
                        await app.postoffice.send(
                            invite,
                            'UnknownUserInvitation',
                            {
                                invite,
                                signupLink: `${app.config.base_url}/account/create?email=${encodeURIComponent(invite.email)}`
                            }
                        )
                        await app.auditLog.Team.team.user.invited(request.session.User, null, request.team, invite, role)
                    } else {
                        if (app.postoffice.enabled()) {
                            await app.postoffice.send(
                                invite.invitee,
                                'TeamInvitation',
                                {
                                    invite,
                                    signupLink: `${app.config.base_url}/account/teams/invitations`
                                }
                            )
                        }
                        await app.auditLog.Team.team.user.invited(request.session.User, null, request.team, invite.invitee, role)
                    }
                } catch (err) {
                    errorCount++
                    result.message[user] = 'Error sending invitation email'
                }
            }
        }
        if (errorCount > 0) {
            result.code = 'invitation_failed'
            result.error = result.message
            delete result.status
            await app.auditLog.Team.team.user.invited(request.session.User, result, request.team, null, role)
        }
        delete result.message
        reply.send(result)
    })

    /**
     * Delete an invitation
     * DELETE [/api/v1/teams/:teamId/invitations]/:invitationId
     */
    app.delete('/:invitationId', async (request, reply) => {
        const invitation = await app.db.models.Invitation.byId(request.params.invitationId)
        if (invitation) {
            const role = invitation.role || Roles.Member
            const invitedUser = app.auditLog.formatters.userObject(invitation.external ? invitation : invitation.invitee)
            await invitation.destroy()
            await app.auditLog.Team.team.user.uninvited(request.session.User, null, request.team, invitedUser, role)
            reply.send({ status: 'okay' })
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })
}
