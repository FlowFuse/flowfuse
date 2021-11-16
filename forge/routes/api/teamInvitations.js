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
module.exports = async function(app) {

    // All routes require user to be owner of team
    app.addHook('preHandler',async (request, reply) => {
        if (request.session.User.admin) {
            return;
        }
        const sessionUserMembership = await request.session.User.getTeamMembership(request.team.id);
        if (sessionUserMembership.role === "owner" ) {
            return;
        }
        reply.code(401).send({ error: 'unauthorized' })
        return new Error()
    });

    app.get('/', async (request, reply) => {
        const invitations = await app.db.models.Invitation.forTeam(request.team)
        const result = app.db.views.Invitation.invitationList(invitations);
        reply.send({
            count: result.length,
            invitations:result
        })
        reply.send(result)
    })

    /**
     * Create an invitation
     * POST [/api/v1/teams/:teamId/invitations]/
     */
    app.post('/', async (request, reply) => {
        const userDetails = request.body.user.split(",").map(u => u.trim()).filter(Boolean)
        const invites = await app.db.controllers.Invitation.createInvitations(request.session.User, request.team, userDetails);

        const users = Object.keys(invites);
        const result = {
            status: "okay",
            message: {}
        };
        let errorCount = 0;

        for (const [user, invite] of Object.entries(invites)) {
            if (typeof invite === "string") {
                errorCount++;
                result.message[user] = invite
            } else {
                try {
                    if (invite.external) {
                        await app.postoffice.send(
                            invite,
                            "UnknownUserInvitation",
                            {
                                invite: invite,
                                signupLink: `${process.env.BASE_URL}/account/create?email=${invite.email}`
                            }
                        )
                    } else {
                        await app.postoffice.send(
                            invite.invitee,
                            "TeamInvitation",
                            {
                                invite: invite,
                                signupLink: `${process.env.BASE_URL}`
                            }
                        )
                    }
                } catch(err) {
                    console.log(err);
                    errorCount++;
                    result.message[user] = 'Error sending invitation email'
                }

            }
        }
        if (errorCount > 0) {
            result.status = "error"
        } else {
            delete result.message;
        }
        // TODO: set proper status code if error
        reply.send(result)
    })

    /**
     * Delete an invitation
     * DELETE [/api/v1/teams/:teamId/invitations]/:invitationId
     */
    app.delete('/:invitationId', async (request, reply) => {
        const invitation = await app.db.models.Invitation.byId(request.params.invitationId);
        if (invitation) {
            await invitation.destroy();
            reply.send({status:'okay'})
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })


}
