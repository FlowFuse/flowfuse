const fs = require('fs')
const path = require('path')

const fp = require('fastify-plugin')
const { v4: uuidv4 } = require('uuid')

const defaultSettings = require('./defaults')

module.exports = fp(async function (app, _opts) {
    const settings = { ...defaultSettings }

    const loadedSettings = await app.db.models.PlatformSettings.findAll()

    loadedSettings.forEach(setting => {
        settings[setting.key] = setting.value
    })

    // Versions of Node and Forge App
    settings['version:node'] = process.version

    if (process.env.npm_package_version) {
        settings['version:forge'] = 'v' + process.env.npm_package_version
    } else {
        const { version } = require(path.join(module.parent.path, '..', 'package.json'))
        settings['version:forge'] = 'v' + version
    }
    // if .git
    try {
        fs.statSync(path.join(__dirname, '..', '..', '.git'))
        settings['version:forge'] += '-git'
    } catch (err) {
        // No git directory
    }

    const settingsApi = {
        get: (key) => {
            if (key === 'telemetry:enabled' && app.license.active()) {
                return true
            }
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
            if (app.comms?.platform?.setting?.sync) {
                app.comms.platform.settings.sync(key)
            }
        },
        refresh: async (key) => {
            const newSetting = await app.db.models.PlatformSettings.findOne({
                where: { key }
            })

            if (newSetting) {
                settings[key] = newSetting.value
            }
        }
    }

    if (!settingsApi.get('instanceId')) {
        await settingsApi.set('instanceId', uuidv4())
    }

    app.decorate('settings', settingsApi)
}, { name: 'app.settings' })
