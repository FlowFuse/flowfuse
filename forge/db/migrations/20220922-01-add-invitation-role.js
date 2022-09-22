/**
 * Add role column to Invitations
 */

const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Invitations', 'role', {
            type: DataTypes.INTEGER
        })
    },
    down: async (context) => {
    }
}
