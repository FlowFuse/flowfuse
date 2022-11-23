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
            } catch (err) {
                console.log(err)
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })

    app.get('/', { preHandler: app.needsPermission('team:user:list') }, async (request, reply) => {
        const members = await app.db.models.User.inTeam(request.params.teamId)
        const result = app.db.views.User.teamMemberList(members)
        reply.send({
            meta: {}, // For future pagination
            count: result.length,
            members: result
        })
    })

    /**
     * Add member to group
     *  - only admins should be able to do this
     *  - team owners can do this for now - but will need to enable invite-only workflow
     * POST [/api/v1/teams/:teamId/members]/
     */
    // app.post('/', { preHandler: app.needsPermission('team:user:add') }, async (request, reply) => {
    //     // await app.db.controllers.AuditLog.teamLog(
    //     //     request.team.id,
    //     //     request.session.User.id,
    //     //     "user.added",
    //     //     { user: userToRemove.username }
    //     // )
    //     reply.code(400).send({ error: 'POST /api/v1/teams/:teamId/members not implemented' })
    // })

    /**
     * Remove member from group
     *  - admin/owner/self
     * DELETE [/api/v1/teams/:teamId/members]/:userId
     */
    app.delete('/:userId', { preHandler: app.needsPermission('team:user:remove') }, async (request, reply) => {
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
    app.put('/:userId', { preHandler: app.needsPermission('team:user:change-role') }, async (request, reply) => {
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
                }
                reply.send({ status: 'okay' })
            } catch (err) {
                reply.code(403).type('text/html').send('Forbidden')
            }
        } else {
            reply.code(400).send({ code: 'invalid_team_role', error: 'invalid role' })
        }
    })
}
