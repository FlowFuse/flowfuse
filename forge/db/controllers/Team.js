
module.exports = {
    changeUserRole: async function(db, teamHashId, userHashId, role) {
        const user = await db.models.User.byId(userHashId);
        const team = await db.models.Team.byId(teamHashId);

        if (!user) {
            throw new Error("User not found");
        }
        if (!team) {
            throw new Error("Team not found");
        }
        const existingRole = await user.getTeamMembership(team.id);
        if (!existingRole) {
            throw new Error("User not in team");
        }

        if (existingRole.role === role) {
            return;
        }

        if (existingRole.role === "owner" && role === "member") {
            const owners = await team.owners();
            if (owners.length === 1) {
                throw new Error("Cannot remove last owner");
            }
        }
        existingRole.role = role;
        await existingRole.save();
    },

    removeUser: async function(db, team, userOrHashId, userRole) {
        let user = userOrHashId;
        if (typeof user === "string") {
            user = await db.models.User.byId(user)
        }
        if (!userRole) {
            userRole = await user.getTeamMembership(team.id);
        }

        // If no userRole, then user already not in team - success
        if (userRole) {
            if (userRole.role === "owner") {
                const owners = await team.owners();
                if (owners.length === 1) {
                    throw new Error("Cannot remove last owner");
                }
            }
            await userRole.destroy();
            console.warn("TODO: forge.db.controllers.Team.removeUser - expire oauth sessions")
        }
    }
}
