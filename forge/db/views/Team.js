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
            avatar: team.avatar,
            suspended: team.suspended,
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
                avatar: result.avatar,
                suspended: result.suspended,
                instanceCount: result.projectCount,
                memberCount: result.memberCount,
                deviceCount: result.deviceCount,
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
                suspended: d.Team.suspended,
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
