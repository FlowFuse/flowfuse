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
        const teamUserLimit = await team.getUserLimit()
        if (teamUserLimit > 0) {
            const currentTeamMemberCount = await team.memberCount()
            const currentTeamInviteCount = await team.pendingInviteCount()
            if (currentTeamMemberCount + currentTeamInviteCount + pendingInvites.length > teamUserLimit) {
                throw new Error('Team user limit reached')
            }
        }

        for (let i = 0; i < pendingInvites.length; i++) {
            let invite = await app.db.models.Invitation.create(pendingInvites[i].opts)
            // Re-get the new invite so the User/Team properties are pre-fetched
            invite = await app.db.models.Invitation.byId(invite.hashid)
            results[pendingInvites[i].userDetail] = invite
            if (!invite.external) {
                await app.notifications.send(
                    invite.invitee,
                    'team-invite',
                    {
                        invite: {
                            id: invite.hashid
                        },
                        team: {
                            id: invite.team.hashid,
                            name: invite.team.name
                        },
                        invitor: {
                            username: invitor.username
                        },
                        role
                    },
                    `team-invite:${invite.hashid}`
                )
            }
        }
        return results
    },

    acceptInvitation: async (app, invitation, user) => {
        const role = invitation.role || Roles.Member
        let invitedUser = invitation.invitee
        if (!invitedUser && invitation.external) {
            // This won't have a full user object attached as they had not registered
            // when the invitation was created.
            if (user.email.toLowerCase() === invitation.email.toLowerCase()) {
                invitedUser = user
            }
        }
        if (!invitedUser) {
            throw new Error('Cannot identify user for this invitation')
        }
        await app.db.controllers.Team.addUser(invitation.team, invitedUser, role)
        const notificationReference = `team-invite:${invitation.hashid}`
        await invitation.destroy()
        await app.notifications.remove(invitedUser, notificationReference)

        // detail in audit log
        app.auditLog.Team.team.user.invite.accepted(user, null, invitation.team, invitedUser, role)

        const team = {
            id: invitation.team.hashid,
            name: invitation.team.name,
            slug: invitation.team.slug
        }
        const invitee = {
            id: invitedUser.hashid,
            username: invitedUser.username
        }
        const invitor = {
            id: invitation.invitor.hashid,
            username: invitation.invitor.username
        }
        // send invitor a notification
        app.notifications.send(invitation.invitor, 'team-invite-accepted-invitor', {
            team,
            invitee,
            invitor,
            role
        })

        // record acceptance in product analytics tool
        app.product.capture(invitedUser.username, '$ff-invite-accepted', {
            'accepted-at': new Date().toISOString(),
            'invite-id': invitation.hashid
        }, {
            team: invitation.team.hashid
        })
    },

    rejectInvitation: async (app, invitation, user) => {
        const role = invitation.role || Roles.Member
        let invitedUser = invitation.invitee
        if (!invitedUser && invitation.external) {
            // This won't have a full user object attached as they had not registered
            // when the invitation was created.
            if (user.email.toLowerCase() === invitation.email.toLowerCase()) {
                invitedUser = user
            }
        }
        const notificationReference = `team-invite:${invitation.hashid}`
        await invitation.destroy()
        await app.notifications.remove(invitedUser, notificationReference)
        app.auditLog.Team.team.user.invite.rejected(user, null, invitation.team, invitation.invitee, role)
    }
}
