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
module.exports = async function(app) {

    app.get('/', async (request, reply) => {
        const members = await app.db.models.User.inTeam(request.params.teamId)
        const result = app.db.views.User.teamMemberList(members);
        reply.send({
            count: result.length,
            members:result
        })
        reply.send(result)
    })

    /**
     * Add member to group
     *  - only admins should be able to do this
     *  - team owners can do this for now - but will need to enable invite-only workflow
     * POST [/api/v1/teams/:teamId/members]/
     */
    app.post('/', async (request, reply) => {
        // await app.db.controllers.AuditLog.teamLog(
        //     request.team.id,
        //     request.session.User.id,
        //     "user.added",
        //     { user: userToRemove.username }
        // )
        reply.code(400).send({error:"POST /api/v1/teams/:teamId/members not implemented"})
    })

    /**
     * Remove member from group
     *  - admin/owner/self
     * DELETE [/api/v1/teams/:teamId/members]/:userId
     */
    app.delete('/:userId', async (request, reply) => {
        const sessionUserMembership = await request.session.User.getTeamMembership(request.team.id);
        // admin || self || team-owner
        if (sessionUserMembership.role === "owner" || request.session.User.id === request.params.userId || request.session.User.admin) {
            // The requesting user is allowed to do this
            let userToRemove = request.params.userId;
            let userRole;
            if (request.session.User.id === request.params.userId) {
                // Don't need to lookup the user/role again
                userToRemove = request.session.User
                userRole = sessionUserMembership
            } else {
                userToRemove = await db.models.User.byId(userToRemove)
            }
            const result = await app.db.controllers.Team.removeUser(request.team, userToRemove, userRole)
            if (result) {
                await app.db.controllers.AuditLog.teamLog(
                    request.team.id,
                    request.session.User.id,
                    "user.removed",
                    { user: userToRemove.username }
                )
            }
            reply.send({status:"okay"})
        } else {
            reply.code(403).type('text/html').send('Forbidden')
        }
    })




    /**
     * Change member role
     *  - only admins or owner should be able to do this
     * POST [/api/v1/teams/:teamId/members]/:userId
     */
    app.put('/:userId', async (request, reply) => {
        const sessionUserMembership = await request.session.User.getTeamMembership(request.team.id);
        if (sessionUserMembership.role === "owner" || request.session.User.admin) {
            if (request.body.role === "owner" || request.body.role === "member") {
                try {
                    const result = await app.db.controllers.Team.changeUserRole(request.params.teamId,request.params.userId,request.body.role)
                    if (result.oldRole !== result.role) {
                        await app.db.controllers.AuditLog.teamLog(
                            result.team.id,
                            request.session.User.id,
                            "user.roleChanged",
                            { user: result.user.username, role: result.role}
                        )
                    }
                    reply.send({status:"okay"})
                } catch(err) {
                    console.log(err);
                    reply.code(403).type('text/html').send('Forbidden')
                }
            } else {
                reply.code(400).send({error:"invalid role"});
            }
        } else {
            reply.code(403).type('text/html').send('Forbidden')
        }

        // const team = await app.db.models.Team.byId(request.params.teamId);
        // const userMembership = await request.session.User.getTeamMembership(team.id);
        // console.log()
    })

}
