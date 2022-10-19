const featureFlags = [
]

module.exports = function (app, config) {
    const userProvidedFlags = config.features || {}

    const publicFlags = {}
    const privateFlags = {}

    featureFlags.forEach(flag => {
        let flagValue = flag.default
        if (userProvidedFlags[flag.name] !== undefined) {
            flagValue = userProvidedFlags[flag.name]
        }
        if (flag.isPublic) {
            publicFlags[flag.name] = flagValue
        } else {
            privateFlags[flag.name] = flagValue
        }
    })

    return {
        register: function (name, value, isPublic) {
            if (isPublic) {
                publicFlags[name] = value
            } else {
                privateFlags[name] = value
            }
        },

        getPublicFeatures: function () {
            return { ...publicFlags }
        },

        getAllFeatures: function () {
            return { ...publicFlags, ...privateFlags }
        },

        enabled: function (name) {
            return publicFlags[name] || privateFlags[name]
        }
    }
}
