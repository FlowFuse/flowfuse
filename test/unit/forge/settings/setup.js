const FF_UTIL = require('flowforge-test-utils')

async function setup (config = {}) {
    config = {
        housekeeper: false,
        ...config
    }

    const forge = await FF_UTIL.setupApp(config)
    await forge.db.models.PlatformSettings.upsert({ key: 'setup:initialised', value: true })

    return forge
}

module.exports = setup
