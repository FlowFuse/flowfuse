module.exports = function (app) {
    app.addSchema({
        $id: 'TeamSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            samlGroupOwner: { type: 'string' },
            samlGroupMember: { type: 'string' },
            samlGroupViewer: { type: 'string' },
            samlGroupDashboard: { type: 'string' },
            avatar: { type: 'string' },
            links: { $ref: 'LinksMeta' }
        }
    })
    function teamSummary (team) {
        if (Object.hasOwn(team, 'get')) {
            team = team.get({ plain: true })
        }
        const result = {
            id: team.hashid,
            name: team.name,
            slug: team.slug,
            samlGroupOwner: team.samlGroupOwner,
            samlGroupMember: team.samlGroupMember,
            samlGroupViewer: team.samlGroupViewer,
            samlGroupDashboard: team.samlGroupDashboard,
            avatar: team.avatar,
            links: team.links
        }
        return result
    }

    app.addSchema({
        $id: 'Team',
        type: 'object',
        allOf: [{ $ref: 'TeamSummary' }],
        properties: {
            type: { $ref: 'TeamType' },
            instanceCount: { type: 'number' },
            instanceCountByType: { type: 'object', additionalProperties: true },
            memberCount: { type: 'number' },
            deviceCount: { type: 'number' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            billing: { type: 'object', additionalProperties: true },
            billingURL: { type: 'string' }
        },
        additionalProperties: true
    })
    function team (team) {
        if (team) {
            const result = team.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                type: app.db.views.TeamType.teamType(result.TeamType),
                slug: result.slug,
                samlGroupOwner: result.samlGroupOwner,
                samlGroupMember: result.samlGroupMember,
                samlGroupViewer: result.samlGroupViewer,
                samlGroupDashboard: result.samlGroupDashboard,
                avatar: result.avatar,
                instanceCount: result.projectCount,
                memberCount: result.memberCount,
                deviceCount: result.deviceCount,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt,
                links: result.links
            }
            return filtered
        } else {
            return null
        }
    }

    app.addSchema({
        $id: 'UserTeamList',
        type: 'array',
        items: {
            allOf: [{ $ref: 'Team' }],
            properties: { role: { type: 'number' } }
        }
    })

    function userTeamList (teamList) {
        return teamList.map(t => {
            const d = t.get({ plain: true })
            const filtered = {
                id: d.Team.hashid,
                name: d.Team.name,
                type: app.db.views.TeamType.teamTypeSummary(d.Team.TeamType),
                slug: d.Team.slug,
                avatar: d.Team.avatar,
                role: d.role,
                instanceCount: d.projectCount,
                memberCount: d.memberCount,
                links: d.Team.links
            }
            return filtered
        })
    }
    return {
        team,
        teamSummary,
        userTeamList
    }
}
