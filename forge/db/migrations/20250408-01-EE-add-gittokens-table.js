/**
 * Add GitTokens table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.createTable('GitTokens', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING, allowNull: false },
            token: { type: DataTypes.STRING, allowNull: false },
            createdAt: { type: DataTypes.DATE },
            updatedAt: { type: DataTypes.DATE },
            TeamId: {
                type: DataTypes.INTEGER,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'cascade',
                onUpdate: 'cascade'
            }
        })
    },
    down: async (context) => {
    }
}
