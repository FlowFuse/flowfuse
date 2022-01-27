const { Roles, RoleNames } = require('../../lib/roles')

module.exports = {
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
        // If no userRole, then user already not in team - success
        if (userRole) {
            if (userRole.role === Roles.Owner) {
                const owners = await team.owners()
                if (owners.length === 1) {
                    throw new Error('Cannot remove last owner')
                }
            }
            await userRole.destroy()
            return true
            // console.warn('TODO: forge.db.controllers.Team.removeUser - expire oauth sessions')
        }

        return false
    }
}
