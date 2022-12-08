function publicUserProfile (app, user) {
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

function shortProfile (app, user) {
    const result = {
        id: user.hashid
    };
    [
        'username',
        'avatar'
    ].forEach(p => { result[p] = user[p] })
    return result
}

module.exports = {
    /**
     * Render a User object for returning on the API.
     *
     * Only fields listed here will be returned - ensuring that if a new field
     * is added to the model, it won't accidentally leak out of the API
     *
     */
    userProfile: function (app, user) {
        const result = publicUserProfile(app, user)
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
    },

    publicUserProfile,
    shortProfile,
    teamMemberList: function (app, users) {
        const result = users.map(u => {
            return {
                id: u.hashid,
                username: u.username,
                name: u.name,
                avatar: u.avatar,
                role: u.Teams[0].TeamMember.role
            }
        })
        return result
    }
}
