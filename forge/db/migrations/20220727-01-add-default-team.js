/**
 * Add defaultTeam to Users table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    up: async (context) => {
        await context.addColumn('Users', 'defaultTeamId', {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'Teams', key: 'id' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        })
    },
    down: async (context) => {
    }
}
