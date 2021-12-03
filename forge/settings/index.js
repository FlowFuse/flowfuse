const fp = require("fastify-plugin");

const defaultSettings = require("./defaults")

module.exports = fp(async function(app, _opts, next) {

    const settings = { ...defaultSettings }

    const loadedSettings = await app.db.models.PlatformSettings.findAll();

    loadedSettings.forEach(setting => {
        settings[setting.key] = setting.value;
    });

    const settingsApi = {
        get: (key) => {
            return settings[key]
        },
        set: async (key, value) => {
            if (!settings.hasOwnProperty(key)) {
                // This may be too strict, but for now, only allow settings
                // that are known to be changed.
                throw new Error(`Unknown setting ${key}`)
            }
            settings[key] = value;
            await app.db.models.PlatformSettings.upsert({ key, value });
        }
    }

    app.decorate("settings",settingsApi);
    next();
});
