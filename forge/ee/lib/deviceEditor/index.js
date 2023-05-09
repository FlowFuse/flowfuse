const { DeviceTunnelManager } = require('./DeviceTunnelManager')

module.exports.init = function (app) {
    // Add the tunnelManager to app.comms.devices
    app.comms.devices.tunnelManager = new DeviceTunnelManager(app)
}
