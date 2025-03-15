const { Roles, RoleNames } = require('../../lib/roles')

module.exports = {

    createTeamForUser: async function (app, teamDetails, user) {
        const newTeam = await app.db.models.Team.create(teamDetails)
        await newTeam.reload({
            include: [{ model: app.db.models.TeamType }]
        })
        await app.db.controllers.Team.addUser(newTeam, user, Roles.Owner)

        // Reinflate the object now the user has been added
        const team = await app.db.models.Team.bySlug(newTeam.slug)

        // Record in our Product tracking
        app.product.capture(user.username, '$ff-team-created', {
            'team-name': team.name,
            'created-at': team.createdAt
        }, {
            team: team.id
        })

        return team
    },

    changeUserRole: async function (app, teamHashId, userHashId, role) {
        const user = await app.db.models.User.byId(userHashId)
        const team = await app.db.models.Team.byId(teamHashId)
        if (!user) {
            throw new Error('User not found')
        }
        if (!team) {
            throw new Error('Team not found')
        }
        if (!RoleNames[role] || role === Roles.Admin || role === Roles.None) {
            throw new Error('Invalid role')
        }

        const existingRole = await user.getTeamMembership(team.id)
        if (!existingRole) {
            throw new Error('User not in team')
        }
        const oldRole = existingRole.role
        if (oldRole === role) {
            return { user, team, oldRole, role }
        }
        if (oldRole === Roles.Owner && role === Roles.Member) {
            const ownerCount = await team.ownerCount()
            if (ownerCount === 1) {
                throw new Error('Cannot remove last owner')
            }
            if (role < Roles.Member) {
                const token = await app.db.models.AccessToken.findOne({
                    where: {
                        ownerType: 'npm',
                        ownerId: `${userHashId}@${teamHashId}`
                    }
                })
                if (token) {
                    await token.destroy()
                }
            }
        }
        existingRole.role = role
        await existingRole.save()
        return { user, team, oldRole, role }
    },

    addUser: async function (app, team, user, userRole) {
        const existingMembership = await user.getTeamMembership(team.id)
        if (existingMembership !== null) {
            throw new Error('User already in this team')
        }

        const currentTeamMemberCount = await team.memberCount()
        if (!team.TeamType) {
            await team.reload({
                include: [{ model: app.db.models.TeamType }]
            })
        }
        const userLimit = await team.getUserLimit()
        if (userLimit > 0 && currentTeamMemberCount >= userLimit) {
            throw new Error('Team user limit reached')
        }

        await team.addUser(user, { through: { role: userRole } })
    },
    /**
     * Remove a user from a team
     * @params team
     * @params userOrHashId
     * @params userRole
     * @return boolean - if the user was removed.
     *
     */
    removeUser: async function (app, team, user, userRole) {
        if (!userRole) {
            userRole = await user.getTeamMembership(team.id)
        }
        if (userRole) {
            if (userRole.role === Roles.Owner) {
                const ownerCount = await team.ownerCount()
                if (ownerCount === 1) {
                    throw new Error('Cannot remove last owner')
                }
            }
            if (user.defaultTeamId === team.id) {
                await user.setDefaultTeam(null)
            }
            await userRole.destroy()

            await app.db.controllers.StorageSession.removeUserFromTeamSessions(user, team)

            return true
        }

        return false
    }
}
