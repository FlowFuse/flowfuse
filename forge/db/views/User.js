module.exports = function (app) {
    app.addSchema({
        $id: 'User',
        type: 'object',
        allOf: [{ $ref: 'UserSummary' }],
        properties: {
            email_verified: { type: 'boolean' },
            defaultTeam: { type: 'string' },
            sso_enabled: { type: 'boolean' },
            free_trial_available: { type: 'boolean' },
            tcs_accepted: { type: 'string' },
            password_expired: { type: 'boolean' },
            pendingEmailChange: { type: 'boolean' }
        }
    })
    function userProfile (user) {
        const result = userSummary(user)
        if (user.password_expired) {
            result.password_expired = true
        }
        if (app.settings.get('user:tcs-required') && user.tcs_accepted) {
            // Only include the tcs_accepted date if 'tcs-required' is enabled
            result.tcs_accepted = user.tcs_accepted
        }
        result.email_verified = user.email_verified
        if (user.defaultTeamId) {
            result.defaultTeam = app.db.models.Team.encodeHashid(user.defaultTeamId)
        }
        if (app.config.features.enabled('sso')) {
            result.sso_enabled = !!user.sso_enabled
        }
        return result
    }

    app.addSchema({
        $id: 'UserSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            avatar: { type: 'string' },
            admin: { type: 'boolean' },
            createdAt: { type: 'string' },
            suspended: { type: 'boolean' }
        }
    })
    function userSummary (user) {
        const result = {
            id: user.hashid
        };
        [
            'username',
            'name',
            'email',
            'avatar',
            'admin',
            'createdAt',
            'suspended'
        ].forEach(p => { result[p] = user[p] })
        return result
    }

    app.addSchema({
        $id: 'TeamMemberList',
        type: 'array',
        items: {
            allOf: [{ $ref: 'UserSummary' }],
            role: { type: 'number' }
        }
    })
    function teamMemberList (users) {
        const result = users.map(u => {
            const user = userSummary(u)
            user.role = u.Teams[0].TeamMember.role
            return user
        })
        return result
    }

    return {
        userSummary,
        userProfile,
        teamMemberList
    }
}
