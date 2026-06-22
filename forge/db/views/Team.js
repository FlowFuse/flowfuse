module.exports = function (app) {
    app.addSchema({
        $id: 'TeamSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            avatar: { type: 'string' },
            suspended: { type: 'boolean' },
            links: { $ref: 'LinksMeta' }
        },
        // Composed via `allOf` elsewhere — keep open.
        required: ['id', 'name', 'slug', 'avatar', 'suspended', 'links']
    })
    function teamSummary (team) {
        if (Object.hasOwn(team, 'get')) {
            team = team.get({ plain: true })
        }
        const result = {
            id: team.hashid,
            name: team.name,
            slug: team.slug,
            avatar: team.avatar,
            suspended: team.suspended,
            links: team.links
        }
        return result
    }

    app.addSchema({
        $id: 'Team',
        type: 'object',
        // additionalProperties omitted — interacts poorly with allOf.
        allOf: [{ $ref: 'TeamSummary' }],
        properties: {
            type: { $ref: 'TeamType' },
            properties: { type: 'object', additionalProperties: true },
            instanceCount: { type: 'number' },
            instanceCountByType: { type: 'object', additionalProperties: true },
            memberCount: { type: 'number' },
            deviceCount: { type: 'number' },
            brokerCount: { type: 'number' },
            teamBrokerClientsCount: { type: 'number' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            billing: { type: 'object', additionalProperties: true },
            billingURL: { type: 'string' }
        },
        required: ['type', 'properties', 'instanceCount', 'memberCount', 'deviceCount', 'brokerCount', 'teamBrokerClientsCount', 'createdAt', 'updatedAt']
    })
    function team (team) {
        if (team) {
            const result = team.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                type: app.db.views.TeamType.teamType(result.TeamType),
                properties: result.properties,
                slug: result.slug,
                avatar: result.avatar,
                suspended: result.suspended,
                // parseInt: postgres returns aggregate counts as strings.
                instanceCount: parseInt(result.projectCount) || 0,
                memberCount: parseInt(result.memberCount) || 0,
                deviceCount: parseInt(result.deviceCount) || 0,
                brokerCount: parseInt(result.brokerCount) || 0,
                teamBrokerClientsCount: parseInt(result.teamBrokerClientsCount) || 0,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt,
                links: result.links
            }
            if (team.Subscription) {
                filtered.billing = {}
                filtered.billing.active = team.Subscription.isActive()
                filtered.billing.unmanaged = team.Subscription.isUnmanaged()
                filtered.billing.canceled = team.Subscription.isCanceled()
                filtered.billing.pastDue = team.Subscription.isPastDue()
                if (team.Subscription.isTrial()) {
                    filtered.billing.trial = true
                    filtered.billing.trialEnded = team.Subscription.isTrialEnded()
                    filtered.billing.trialEndsAt = team.Subscription.trialEndsAt
                }
            }
            return filtered
        } else {
            return null
        }
    }

    app.addSchema({
        $id: 'UserTeamList',
        type: 'array',
        // Each item is a TeamSummary plus the user's role on that team and a few counts. Intentionally narrower than the full Team schema.
        items: {
            type: 'object',
            allOf: [{ $ref: 'TeamSummary' }],
            properties: {
                type: { $ref: 'TeamTypeSummary' },
                role: { type: 'number' },
                instanceCount: { type: 'number' },
                memberCount: { type: 'number' },
                deviceCount: { type: 'number' }
            },
            required: ['type', 'role', 'instanceCount', 'memberCount', 'deviceCount']
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
                suspended: d.Team.suspended,
                role: d.role,
                instanceCount: parseInt(d.projectCount) || 0,
                deviceCount: parseInt(d.deviceCount) || 0,
                memberCount: parseInt(d.memberCount) || 0,
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
