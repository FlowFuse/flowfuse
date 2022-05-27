/**
 * Add description ProjectSnapshots table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('ProjectSnapshots', 'description', {
            type: DataTypes.TEXT,
            default: '',
            allowNull: true
        })
    },
    down: async (context) => {
    }
}
