const { syncBridge } = require('../emxq-bridge/setup.js')
module.exports = {
    name: 'EmqxExpertBridgeSetup',
    startup: 90 * 1000, // Run 1.5min after startup
    schedule: '', // no schedule
    run: async function (app) {
        // On startup, the web app is not running anyway so a full resync
        // of the bridge is not disruptive and ensures that any changes to the
        // bridge templates & license details are synchronised.
        await syncBridge(app, { force: true })
    }
}
