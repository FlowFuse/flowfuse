const { syncBridge } = require('../emxq-bridge/setup.js')
module.exports = {
    name: 'EmqxExpertBridgeWeeklySync',
    startup: false,
    schedule: '@weekly',
    run: async function (app) {
        // On a weekly basis, check that the bridge connectors/rules/actions are present and has latest license details.
        // force:false means:
        // - only do a full re-sync if any of the rules, actions, sources or connectors are missing.
        // - only do a full re-sync if the license details have changed.
        // Local hand-crafted/modified rules, actions, sources or connectors will not be handled/detected by this task
        // but they will be re-created if they are missing.
        await syncBridge(app, { force: false })
    }
}
