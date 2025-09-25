module.exports = function (app) {
    app.addSchema({
        $id: 'User',
        type: 'object',
        allOf: [{ $ref: 'UserSummary' }],
        properties: {
            email: { type: 'string' },
            email_verified: { type: 'boolean' },
            defaultTeam: { type: 'string' },
            sso_enabled: { type: 'boolean' },
            mfa_enabled: { type: 'boolean' },
            free_trial_available: { type: 'boolean' },
            tcs_accepted: { type: 'string' },
            password_expired: { type: 'boolean' },
            pendingEmailChange: { type: 'boolean' },
            SSOGroups: { type: 'array' }
        }
    })
    function userProfile (user) {
        const result = userSummary(user)
        if (user.email) {
            result.email = user.email
        }
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
        if (app.config.features.enabled('mfa')) {
            result.mfa_enabled = !!user.mfa_enabled
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
            'avatar',
            'admin',
            'createdAt',
            'suspended',
            'SSOGroups'
        ].forEach(p => { result[p] = user[p] })
        return result
    }

    app.addSchema({
        $id: 'TeamMemberList',
        type: 'array',
        items: {
            allOf: [{ $ref: 'UserSummary' }],
            properties: { role: { type: 'number' } }
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

    app.addSchema({
        $id: 'UserList',
        type: 'array',
        items: {
            $ref: 'User'
        }
    })

    return {
        userSummary,
        userProfile,
        teamMemberList
    }
}
