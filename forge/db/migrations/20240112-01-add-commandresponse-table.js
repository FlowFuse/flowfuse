/* eslint-disable no-unused-vars */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * Add FlowTemplate table
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.sequelize.transaction(async (transaction) => {
            await context.createTable('CommandResponses', {
                id: {
                    type: DataTypes.UUID,
                    primaryKey: true
                },
                payload: { type: DataTypes.TEXT },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false }
            }, { transaction })
        })
    },
    down: async (context) => {
    }
}
