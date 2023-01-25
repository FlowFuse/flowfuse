module.exports = {
    userTeamList: function (app, teamList) {
        return teamList.map((t) => {
            const d = t.get({ plain: true })
            const filtered = {
                id: d.Team.hashid,
                name: d.Team.name,
                type: app.db.views.TeamType.teamTypeSummary(d.Team.TeamType),
                slug: d.Team.slug,
                avatar: d.Team.avatar,
                role: d.role,
                projectCount: d.projectCount,
                memberCount: d.memberCount,
                links: d.Team.links
            }
            if (d.Team.trialEndsAt > Date.now()) {
                filtered.trialEndsAt = d.Team.trialEndsAt
            }
            return filtered
        })
    },
    teamSummary: function (app, team) {
        const d = team.get({ plain: true })
        const result = {
            id: d.hashid,
            name: d.name,
            slug: d.slug,
            avatar: d.avatar,
            links: d.links
        }
        if (d.Team.trialEndsAt > Date.now()) {
            result.trialEndsAt = d.trialEndsAt
        }
        return result
    },
    team: function (app, team) {
        if (team) {
            const result = team.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                type: app.db.views.TeamType.teamType(result.TeamType),
                slug: result.slug,
                avatar: result.avatar,
                projectCount: result.projectCount,
                memberCount: result.memberCount,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt,
                links: result.links
            }
            if (result.trialEndsAt > Date.now()) {
                filtered.trialEndsAt = result.trialEndsAt
            }
            return filtered
        } else {
            return null
        }
    }
}
