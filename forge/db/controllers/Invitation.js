const { Roles } = require('../../lib/roles.js')

module.exports = {
    createInvitations: async (app, invitor, team, userList, role) => {
        const externalInvitesPermitted = app.postoffice.enabled() && !!app.settings.get('team:user:invite:external')
        const pendingInvites = []
        const results = {}
        for (let i = 0; i < userList.length; i++) {
            const userDetail = userList[i]
            const existingUser = await app.db.models.User.byUsernameOrEmail(userDetail)
            const opts = {
                teamId: team.id
            }
            if (!existingUser) {
                if (!/@/.test(userDetail)) {
                    // not an email - abort
                    results[userDetail] = 'Not an existing user'
                    if (externalInvitesPermitted) {
                        results[userDetail] += ', or valid email address'
                    }
                    continue
                } else if (!app.settings.get('team:user:invite:external')) {
                    // Email - but external invites not permitted
                    results[userDetail] = 'External invites not permitted'
                    continue
                } else if (!app.postoffice.enabled()) {
                    // Email - but email not configured
                    results[userDetail] = 'Email not configured, cannot invite external user'
                    continue
                } else {
                    opts.external = true
                    opts.email = userDetail
                }
            } else {
                const existingMemberRole = await app.db.models.TeamMember.getTeamMembership(existingUser.id, team.id, false)
                if (existingMemberRole) {
                    results[userDetail] = 'Already a member of the team'
                    continue
                }
                opts.external = false
                opts.inviteeId = existingUser.id
            }
            const existingInvite = await app.db.models.Invitation.findOne({ where: opts })
            if (existingInvite) {
                results[userDetail] = 'Already invited to the team'
                continue
            }
            opts.invitorId = invitor.id
            opts.role = role
            pendingInvites.push({ userDetail, opts })
        }
        if (team.TeamType.getProperty('userLimit') > 0) {
            const currentTeamMemberCount = await team.memberCount()
            const currentTeamInviteCount = await team.pendingInviteCount()
            if (currentTeamMemberCount + currentTeamInviteCount + pendingInvites.length > team.TeamType.getProperty('userLimit')) {
                throw new Error('Team user limit reached')
            }
        }

        for (let i = 0; i < pendingInvites.length; i++) {
            const invite = await app.db.models.Invitation.create(pendingInvites[i].opts)
            // Re-get the new invite so the User/Team properties are pre-fetched
            results[pendingInvites[i].userDetail] = await app.db.models.Invitation.byId(invite.hashid)
        }
        return results
    },

    acceptInvitation: async (app, invitation, user) => {
        const role = invitation.role || Roles.Member
        await app.db.controllers.Team.addUser(invitation.team, user, role)
        await invitation.destroy()
        app.auditLog.Team.team.user.invite.accepted(user, null, invitation.team, user, role)
    },

    rejectInvitation: async (app, invitation, user) => {
        const role = invitation.role || Roles.Member
        await invitation.destroy()
        app.auditLog.Team.team.user.invite.rejected(user, null, invitation.team, user, role)
    }
}
