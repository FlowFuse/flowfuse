module.exports = {
    createInvitations: async (app, invitor, team, userList) => {
        const results = {};
        for (let i=0; i<userList.length; i++) {
            const userDetail = userList[i];
            const existingUser = await app.db.models.User.byUsernameOrEmail(userDetail);
            const opts = {
                teamId: team.id
            }
            if (!existingUser) {
                if (!/@/.test(userDetail)) {
                    // not an email - abort
                    results[userDetail] = "Not an existing user";
                    if (app.postoffice.enabled()) {
                        results[userDetail] += ", or valid email address"
                    }
                    continue;
                } else if (!app.postoffice.enabled()) {
                    // email not configured
                    results[userDetail] = "Email not configured, cannot invite external user"
                    continue;
                } else {
                    opts.external = true;
                    opts.email = userDetail
                }
            } else {
                const existingMemberRole = await app.db.models.TeamMember.getTeamMembership(existingUser.id, team.id, false);
                if (existingMemberRole) {
                    results[userDetail] = "Already a member of the team";
                    continue;
                }
                opts.external = false;
                opts.inviteeId = existingUser.id;
            }
            const existingInvite = await app.db.models.Invitation.findOne({where:opts})
            if (existingInvite) {
                results[userDetail] = "Already invited to the team";
                continue;
            }
            opts.invitorId = invitor.id;
            const invite = await app.db.models.Invitation.create(opts);
            // Re-get the new invite so the User/Team properties are pre-fetched
            results[userDetail] = await app.db.models.Invitation.byId(invite.hashid)
        }
        return results;
    }
}
