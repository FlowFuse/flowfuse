module.exports = {
    provisioningTokenSummary: function (app, token) {
        // build a tokenSummary object from the token
        const tokenSummary = {
            id: token.hashid,
            name: 'Provisioning Token', // default name
            expiresAt: token.expiresAt,
            team: token.ownerType === 'team' ? app.db.models.Team.encodeHashid(+token.ownerId) : null
        }
        // extract key:value pairs from scope (excluding device:provision) and add
        // to tokenSummary as properties
        token.scope.forEach(e => {
            if (!e || !/.+:.+/.test(e)) { return } // ignore empty and invalid scopes
            if (e === 'device:provision') { return } // ignore device:provision
            const [key, value] = e.split(':', 2) // split on first colon
            tokenSummary[key] = value
        })
        return tokenSummary
    }
}
