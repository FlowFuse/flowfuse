/**
 * Add reminderSentAt to Invitations table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Invitations', 'reminderSentAt', {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        })
    },
    down: async (context) => {}
}
