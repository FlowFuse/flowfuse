const { ensureSecret } = require('./credentials')
const { Timeseries } = require('./wrapper')

/**
 * The driver named in flowforge.yml. Configs written before drivers existed have a
 * `timeseries.questdb` block for one shared server, which is the static driver.
 */
function driverType (config) {
    if (config.driver?.type) {
        return config.driver.type
    }
    if (config.questdb) {
        return 'static'
    }
    return null
}

module.exports.init = async function (app) {
    const config = app.config.timeseries || {}
    app.config.features.register('timeseries', true, true)

    const type = driverType(config)
    if (!type) {
        app.log.warn('Timeseries is enabled but no driver is configured')
        return null
    }
    if (type === 'static' && !config.driver) {
        config.driver = { type: 'static', options: { questdb: config.questdb } }
    }

    await ensureSecret(app)

    let driver
    try {
        driver = require(`./drivers/${type}.js`)
    } catch (err) {
        app.log.error(`Failed to load the timeseries driver: ${type}`)
        throw err
    }
    const timeseries = new Timeseries(app, driver, config)
    await timeseries.init()
    app.addHook('onClose', async () => {
        app.log.info(`Timeseries driver ${type} shutdown`)
        await timeseries.shutdown()
    })
    app.log.info(`Timeseries driver initialized: ${type}`)
    return timeseries
}
