/**
 * Add TimeseriesDatabases: one QuestDB server per team, either managed by a driver or
 * connected by the team owner
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.createTable('TimeseriesDatabases', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: DataTypes.STRING, allowNull: false },
            kind: { type: DataTypes.STRING, allowNull: false },
            state: { type: DataTypes.STRING, allowNull: false },
            stateDetail: { type: DataTypes.TEXT },
            tier: { type: DataTypes.STRING },
            image: { type: DataTypes.STRING },
            endpoints: { type: DataTypes.TEXT },
            credentials: { type: DataTypes.TEXT },
            meta: { type: DataTypes.TEXT },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            TeamId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                unique: true,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        })
    },
    down: async (context) => {}
}
