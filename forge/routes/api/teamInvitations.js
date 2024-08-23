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

const { getCanonicalEmail } = require('../../db/utils')
const { TeamRoles, Roles } = require('../../lib/roles')

module.exports = async function (app) {
    // All routes require user to be owner of team
    app.addHook('preHandler', app.needsPermission('team:user:invite'))

    app.get('/', {
        schema: {
            summary: 'Get a list of the teams invitations',
            tags: ['Team Invitations'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        // meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        invitations: { $ref: 'InvitationList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
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
    app.post('/', {
        config: {
            rateLimit: app.config.rate_limits ? { max: 5, timeWindow: 30000 } : false
        },
        schema: {
            summary: 'Create an invitation',
            tags: ['Team Invitations'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    user: { type: 'string' },
                    role: { type: 'number' }
                },
                required: ['user']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        code: { type: 'string' },
                        error: { type: 'object', additionalProperties: true }

                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const userDetails = request.body.user.split(',').map(u => u.trim()).filter(Boolean)

        // 1st check there are any users to invite
        if (userDetails.length === 0) {
            const result = {
                status: 'error',
                code: 'invitation_failed',
                error: 'no users specified'
            }
            reply.code(400).send(result)
            await app.auditLog.Team.team.user.invited(request.session.User, result, request.team, null, request.body.role || Roles.Member)
            return
        }

        // separate user names from emails, deduplicate both lists then recombine

        // use a regex to determine if the user is NOT email address
        const namesOnly = userDetails.filter(u => !u.match(/^[^@]+@[^@]+$/))
        const namesOnlyDeduplicated = [...new Set(namesOnly.map(u => u.trim().toLowerCase()))].map(u => namesOnly.find(n => n.trim().toLowerCase() === u))
        // use a regex to determine if the user is an email address
        const emailsOnly = userDetails.filter(u => u.match(/^[^@]+@[^@]+$/))
        // Deduplicate the list based on the canonical email, but keep the as-provided
        // email in the list
        const emailsOnlyDeduplicated = {}
        emailsOnly.forEach(email => {
            const canonicalEmail = getCanonicalEmail(email)
            if (!emailsOnlyDeduplicated[canonicalEmail]) {
                emailsOnlyDeduplicated[canonicalEmail] = email
            }
        })
        // recombine the deduplicated lists
        const userDetailsDeduplicated = [...namesOnlyDeduplicated, ...Object.values(emailsOnlyDeduplicated)]

        // limit to 5 invites at a time
        if (userDetailsDeduplicated.length > 5) {
            const result = {
                status: 'error',
                code: 'too_many_invites',
                error: 'maximum 5 invites at a time'
            }
            reply.code(429).send(result)
            await app.auditLog.Team.team.user.invited(request.session.User, result, request.team, null, request.body.role || Roles.Member)
            return
        }
        const role = request.body.role || Roles.Member
        if (!TeamRoles.includes(role)) {
            reply.code(400).send({ code: 'invalid_team_role', error: 'invalid team role' })
            return
        }
        let invites = []
        try {
            invites = await app.db.controllers.Invitation.createInvitations(request.session.User, request.team, userDetailsDeduplicated, role)
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
                                    teamName: invite.team.name,
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
    app.delete('/:invitationId', {
        schema: {
            summary: 'Delete an invitation',
            tags: ['Team Invitations'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    invitationId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const invitation = await app.db.models.Invitation.byId(request.params.invitationId)
        if (invitation && invitation.teamId === request.team.id) {
            const role = invitation.role || Roles.Member
            const invitedUser = app.auditLog.formatters.userObject(invitation.external ? invitation : invitation.invitee)
            if (!invitation.external) {
                const notificationReference = `team-invite:${invitation.hashid}`
                await app.notifications.remove(invitation.invitee, notificationReference)
            }
            await invitation.destroy()
            await app.auditLog.Team.team.user.uninvited(request.session.User, null, request.team, invitedUser, role)
            reply.send({ status: 'okay' })
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })
}
