const { TeamRoles } = require('../../lib/roles.js')

/**
 * Team Membership api routes
 *
 * - /api/v1/teams/:teamId/members
 *
 * By the time these handlers are invoked, :teamApi will have been validated
 * and 404'd if it doesn't exist. `request.team` will contain the team object
 *
 * @namespace teamMembers
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.userId) {
            try {
                if (request.session.User.id === request.params.userId) {
                    // Don't need to lookup the user/role again
                    request.user = request.session.User
                    request.userRole = request.teamMembership
                } else {
                    request.user = await app.db.models.User.byId(request.params.userId)
                    if (!request.user) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    request.userRole = await request.user.getTeamMembership(request.params.teamId)
                }
                if (app.config.features.enabled('sso')) {
                    if (await app.sso.isUserMembershipManaged(request.user, request.team)) {
                        // The user's membership for this team is sso managed - do not allow api changes to be applied
                        reply.code(400).send({ code: 'invalid_request', error: 'Cannot modify team membershipt for an SSO managed user' })
                        // eslint-disable-next-line no-useless-return
                        return
                    }
                }
            } catch (err) {
                console.error(err)
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })

    app.get('/', {
        preHandler: app.needsPermission('team:user:list'),
        schema: {
            summary: 'Get a list of the teams members',
            tags: ['Team Members'],
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
                        members: { $ref: 'TeamMemberList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const members = await app.db.models.User.inTeam(request.params.teamId)
        const result = app.db.views.User.teamMemberList(members)
        reply.send({
            meta: {}, // For future pagination
            count: result.length,
            members: result
        })
    })

    /**
     * Remove member from group
     *  - admin/owner/self
     * DELETE [/api/v1/teams/:teamId/members]/:userId
     */
    app.delete('/:userId', {
        preHandler: app.needsPermission('team:user:remove'),
        schema: {
            summary: 'Remove a team member',
            tags: ['Team Members'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    userId: { type: 'string' }
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
        // request.user and request.userRole will already be set via the preHandler
        // added at the top of this file
        // the needsPermission handler will have ensured the requesting user is allowed
        // to make this request. All we have to do
        try {
            const result = await app.db.controllers.Team.removeUser(request.team, request.user, request.userRole)
            if (result) {
                await app.auditLog.Team.team.user.removed(request.session.User, null, request.team, request.user)
            }
            reply.send({ status: 'okay' })
        } catch (err) {
            reply.code(400).send({ code: 'invalid_request', error: 'cannot remove only owner' })
        }
    })

    /**
     * Change member role
     *  - only admins or owner should be able to do this
     * POST [/api/v1/teams/:teamId/members]/:userId
     */
    app.put('/:userId', {
        preHandler: app.needsPermission('team:user:change-role'),
        schema: {
            summary: 'Change a members role',
            tags: ['Team Members'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    userId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    role: { type: 'number' }
                },
                required: ['role']
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
        const newRole = parseInt(request.body.role)
        if (TeamRoles.includes(newRole)) {
            try {
                const result = await app.db.controllers.Team.changeUserRole(request.params.teamId, request.params.userId, newRole)
                if (result.oldRole !== result.role) {
                    const updates = new app.auditLog.formatters.UpdatesCollection()
                    const oldRole = app.auditLog.formatters.roleObject(result.oldRole)
                    const role = app.auditLog.formatters.roleObject(result.role)
                    updates.push('role', oldRole?.role || result.oldRole, role?.role || result.role)
                    await app.auditLog.Team.team.user.roleChanged(request.session.User, null, request.team, result.user, updates)
                    if (result.role < result.oldRole) {
                        // We should invalidate session for this user for the teams NR instances if lower
                        // might want to make this only if it drop under Member
                        await app.db.controllers.StorageSession.removeUserFromTeamSessions(request.user, request.team)
                    }
                }
                reply.send({ status: 'okay' })
            } catch (err) {
                reply.code(403).send({ code: 'invalid_request', error: 'Invalid request' })
            }
        } else {
            reply.code(400).send({ code: 'invalid_team_role', error: 'invalid role' })
        }
    })
}
