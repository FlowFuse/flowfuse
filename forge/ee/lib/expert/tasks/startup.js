const { syncBridge } = require('../emxq-bridge/setup.js')
module.exports = {
    name: 'EmqxExpertBridgeSetup',
    startup: true,
    schedule: '',
    run: async function (app) {
        // On startup, the web app is not running anyway so a full resync
        // of the bridge is not disruptive and ensures that any changes to the
        // bridge templates & license details are synchronised.
        await syncBridge(app, { force: true })
    }
}
