/**
 * Add FF Tables table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.createTable('Tables', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            credentials: {
                type: DataTypes.TEXT
            },
            meta: {
                type: DataTypes.TEXT
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            TeamId: {
                type: DataTypes.INTEGER,
                references: { model: 'Teams', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            }
        })
    },
    down: async (context) => {}
}
