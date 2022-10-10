/**
 * Revert the starter teamType userLimit to 0
 */

module.exports = {
    up: async (context) => {
        // clear all devices settingsHashes so that they can be re-calculated
        await context.sequelize.query('update "Devices" set "settingsHash" = null')
    },
    down: async (context) => {
    }
}
