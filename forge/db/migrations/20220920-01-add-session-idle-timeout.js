/**
 * Adds idleAt column to Session column
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Sessions', 'idleAt', {
            type: DataTypes.DATE,
            allowNull: true
        })
    },
    down: async (context) => {
    }
}
