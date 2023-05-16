const { DeviceTunnelManager } = require('./DeviceTunnelManager')

module.exports.init = function (app) {
    if (app.comms) {
        app.config.features.register('deviceEditor', true, true)

        // Add the tunnelManager to app.comms.devices
        app.comms.devices.tunnelManager = new DeviceTunnelManager(app)
    }
}
