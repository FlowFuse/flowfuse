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
            settings[key] = value;
            await app.db.models.PlatformSettings.upsert({ key, value });
        }
    }

    app.decorate("settings",settingsApi);
    next();
});
