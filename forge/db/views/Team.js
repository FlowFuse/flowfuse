module.exports = {
    userTeamList: function(db, teamList) {
        return teamList.map((t) => {
            return {
                name: t.Team.name,
                role: t.role,
                avatar: t.Team.avatar,
                projects: Math.floor(Math.random()*4)
            }
        });
    },

    team: function(db, team) {
        if (team) {
            const result =  team.toJSON();
            result.users = result.Users.map(u => {
                return {
                    id: u.id,
                    name: u.name,
                    avatar: u.avatar,
                    role: u.TeamMember.role
                }
            })
            delete result.Users;
            return result;
        } else {
            return null
        }
    }
}
