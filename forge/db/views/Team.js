module.exports = {
    userTeamList: function(db, teamList) {
        return teamList.map((t) => {
            const d = t.get({plain:true});
            return {
                links: d.Team.links,
                hashid: d.Team.hashid,
                name: d.Team.name,
                role: d.role,
                avatar: d.Team.avatar,
                projects: d.projectCount
            }
        });
    },

    team: function(db, team) {
        if (team) {
            const result =  team.toJSON();
            const filtered = {
                id: result.hashid,
                name: result.name,
                slug: result.slug,
                avatar: result.avatar,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt,
                links: result.links
            }
            if (result.Users) {
                filtered.users = result.Users.map(u => {
                    return {
                        hashid: u.hashid,
                        name: u.name,
                        avatar: u.avatar,
                        role: u.TeamMember.role,
                    }
                })
            }
            return filtered;
        } else {
            return null
        }
    }
}
