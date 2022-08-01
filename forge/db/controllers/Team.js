const { Roles, RoleNames } = require('../../lib/roles')

module.exports = {

    createTeamForUser: async function (app, teamDetails, user) {
        const newTeam = await app.db.models.Team.create(teamDetails)
        await newTeam.addUser(user, { through: { role: Roles.Owner } })

        // Reinflate the object now the user has been added
        const team = await app.db.models.Team.bySlug(newTeam.slug)

        await app.db.controllers.AuditLog.teamLog(
            newTeam.id,
            user.id,
            'team.created'
        )
        await app.db.controllers.AuditLog.teamLog(
            newTeam.id,
            user.id,
            'user.added',
            { role: RoleNames[Roles.Owner] }
        )
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
            const owners = await team.owners()
            if (owners.length === 1) {
                throw new Error('Cannot remove last owner')
            }
        }
        existingRole.role = role
        await existingRole.save()
        return { user, team, oldRole, role }
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
                const owners = await team.owners()
                if (owners.length === 1) {
                    throw new Error('Cannot remove last owner')
                }
            }
            if (user.defaultTeamId === team.id) {
                await user.setDefaultTeam(null)
            }
            await userRole.destroy()
            return true
            // console.warn('TODO: forge.db.controllers.Team.removeUser - expire oauth sessions')
        }

        return false
    }
}
