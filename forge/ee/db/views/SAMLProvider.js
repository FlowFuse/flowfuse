module.exports = {
    provider: function (app, provider) {
        const result = provider.toJSON()
        const filtered = {
            id: result.hashid,
            name: result.name,
            type: result.type,
            active: result.active,
            domainFilter: result.domainFilter,
            options: result.options
        }
        if (result.type === 'saml') {
            filtered.acsURL = result.acsURL
            filtered.entityID = result.entityID
        } else if (result.type === 'ldap') {
            if (filtered.options.password) {
                filtered.options.password = '__PLACEHOLDER__'
            }
        }
        return filtered
    },
    providerSummary: function (app, provider) {
        const result = provider.toJSON()
        const filtered = {
            id: result.hashid,
            name: result.name,
            type: result.type,
            active: result.active,
            domainFilter: result.domainFilter
        }
        return filtered
    }
}
