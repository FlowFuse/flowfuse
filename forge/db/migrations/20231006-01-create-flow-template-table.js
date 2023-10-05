/* eslint-disable no-unused-vars */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * Add FlowTemplate table
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.sequelize.transaction(async (transaction) => {
            await context.createTable('FlowTemplates', {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                name: { type: DataTypes.STRING, allowNull: false },
                active: { type: DataTypes.BOOLEAN, defaultValue: true },
                description: { type: DataTypes.TEXT, defaultValue: '' },
                category: { type: DataTypes.STRING, defaultValue: '' },
                flows: { type: DataTypes.TEXT },
                modules: { type: DataTypes.TEXT },
                createdById: {
                    type: DataTypes.INTEGER,
                    references: { model: 'Users', key: 'id' },
                    onDelete: 'SET NULL',
                    onUpdate: 'CASCADE'
                },
                createdAt: { type: DataTypes.DATE },
                updatedAt: { type: DataTypes.DATE }
            }, { transaction })
        })
    },
    down: async (context) => {
    }
}
