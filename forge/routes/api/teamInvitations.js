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
        let invites = []
        try {
            invites = await app.db.controllers.Invitation.createInvitations(request.session.User, request.team, userDetails)
        } catch (err) {
            reply.code(400).send({ status: 'error', message: err.message })
            return
        }

        const result = {
            status: 'okay',
            message: {}
        }
        let errorCount = 0
        const successfulInvites = []

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
                                invite: invite,
                                signupLink: `${app.config.base_url}/account/create?email=${invite.email}`
                            }
                        )
                        successfulInvites.push(invite.email)
                    } else {
                        if (app.postoffice.enabled()) {
                            await app.postoffice.send(
                                invite.invitee,
                                'TeamInvitation',
                                {
                                    invite: invite,
                                    signupLink: `${app.config.base_url}`
                                }
                            )
                        }
                        successfulInvites.push(invite.invitee.username)
                    }
                } catch (err) {
                    errorCount++
                    result.message[user] = 'Error sending invitation email'
                }
            }
        }
        if (successfulInvites.length > 0) {
            await app.db.controllers.AuditLog.teamLog(
                request.team.id,
                request.session.User.id,
                'user.invited',
                { users: successfulInvites }
            )
        }
        if (errorCount > 0) {
            result.status = 'error'
        } else {
            delete result.message
        }
        // TODO: set proper status code if error
        reply.send(result)
    })

    /**
     * Delete an invitation
     * DELETE [/api/v1/teams/:teamId/invitations]/:invitationId
     */
    app.delete('/:invitationId', async (request, reply) => {
        const invitation = await app.db.models.Invitation.byId(request.params.invitationId)
        if (invitation) {
            await invitation.destroy()
            await app.db.controllers.AuditLog.teamLog(
                request.team.id,
                request.session.User.id,
                'user.uninvited',
                { users: [invitation.external ? invitation.email : invitation.invitee.username] }
            )
            reply.send({ status: 'okay' })
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })
}
