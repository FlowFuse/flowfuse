/**
 * Add mode to a Device
 * `mode` is a string that can be used to store the current mode of the device
 * For example, the device can be in `attached` mode or `detached` mode
 * where `attached` mode means the device is kept in sync with the target snapshot.
 * and `detached` mode means the device is "in developer mode" and may have been edited locally
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Devices', 'mode', {
            type: DataTypes.STRING,
            allowNull: true
        })
    },
    down: async (context) => {
    }
}
