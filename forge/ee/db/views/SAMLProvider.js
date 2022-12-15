module.exports = {
    provider: function (app, provider) {
        const result = provider.toJSON()
        const filtered = {
            id: result.hashid,
            name: result.name,
            active: result.active,
            domainFilter: result.domainFilter,
            acsURL: result.acsURL,
            entityID: result.entityID,
            options: result.options
        }
        return filtered
    }
}
