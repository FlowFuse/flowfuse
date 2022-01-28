const { v4: uuidv4 } = require('uuid')
const fp = require('fastify-plugin')

const defaultSettings = require('./defaults')

module.exports = fp(async function (app, _opts, next) {
    const settings = { ...defaultSettings }

    const loadedSettings = await app.db.models.PlatformSettings.findAll()

    loadedSettings.forEach(setting => {
        settings[setting.key] = setting.value
    })

    const settingsApi = {
        get: (key) => {
            return settings[key]
        },
        set: async (key, value) => {
            if (settings[key] === undefined) {
                // This may be too strict, but for now, only allow settings
                // that are known to be changed.
                throw new Error(`Unknown setting ${key}`)
            }
            settings[key] = value
            await app.db.models.PlatformSettings.upsert({ key, value })
        }
    }

    if (!settingsApi.get('instanceId')) {
        await settingsApi.set('instanceId', uuidv4())
    }

    app.decorate('settings', settingsApi)
    next()
})
