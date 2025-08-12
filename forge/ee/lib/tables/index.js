const wrapper = require('./wrapper.js')

module.exports.init = async function (app) {
    // Set the tables feature flag
    app.config.features.register('tables', true, true)

    // load driver
    if (app.config.tables?.enabled && app.config.tables?.driver?.type) {
        const driverType = app.config.tables.driver.type
        try {
            const driverModule = require(`./drivers/${driverType}.js`)
            app.addHook('onClose', async (_) => {
                app.log.info(`Tables driver ${driverType} shutdown`)
                await wrapper.shutdown()
            })
            await wrapper.init(app, driverModule, app.config.tables.driver.options)
            app.log.info('Tables driver initialized: ' + driverType)
            return wrapper
        } catch (err) {
            app.log.error(`Failed to load the tables driver: ${driverType}`)
            throw err
        }
    }
}
