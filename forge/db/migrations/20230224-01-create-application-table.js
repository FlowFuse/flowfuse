/* eslint-disable no-unused-vars */

const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.sequelize.transaction(async (transaction) => {
            await context.createTable('Applications', {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                name: { type: DataTypes.STRING },
                TeamId: {
                    type: DataTypes.INTEGER,
                    references: { model: 'Teams', key: 'id' },
                    onDelete: 'cascade',
                    onUpdate: 'cascade'
                },
                createdAt: { type: DataTypes.DATE },
                updatedAt: { type: DataTypes.DATE }
            }, { transaction })

            await context.addColumn('Projects', 'ApplicationId', {
                type: DataTypes.INTEGER,
                references: { model: 'Applications', key: 'id' },
                onDelete: 'cascade',
                onUpdate: 'cascade'
            }, { transaction })
        })
    },
    down: async (context) => {
    }
}
