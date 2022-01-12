module.exports = {
    userTeamList: function(db, teamList) {
        return teamList.map((t) => {
            const d = t.get({plain:true});
            return {
                id: d.Team.hashid,
                slug: d.Team.slug,
                links: d.Team.links,
                name: d.Team.name,
                role: d.role,
                avatar: d.Team.avatar,
                projectCount: d.projectCount,
                memberCount: d.memberCount
            }
        });
    },
    teamSummary: function(db, team) {
        const d = team.get({plain: true});
        const result = {
            id: d.hashid,
            name: d.name,
            slug: d.slug,
            avatar: d.avatar,
            links: d.links
        }
        return result;
    },
    team: function(db, team) {
        if (team) {
            const result =  team.toJSON();
            const filtered = {
                id: result.hashid,
                name: result.name,
                slug: result.slug,
                avatar: result.avatar,
                projectCount: result.projectCount,
                memberCount: result.memberCount,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt,
                links: result.links
            }
            return filtered;
        } else {
            return null
        }
    }
}
