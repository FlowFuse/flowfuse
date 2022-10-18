/**
 * Reset device settings hashes so they can be re-calculated as needed
 */

module.exports = {
    up: async (context) => {
        // clear all devices settingsHashes so that they can be re-calculated
        await context.sequelize.query('update "Devices" set "settingsHash" = null')
    },
    down: async (context) => {
    }
}
