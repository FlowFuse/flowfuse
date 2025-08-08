/**
 * Add PipelineStageGitRepo table
 */
// eslint-disable-next-line no-unused-vars
const { DataTypes, QueryInterface } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.sequelize.transaction(async (transaction) => {
            await context.addColumn('TeamBrokerClients', 'ownerId', {
                type: DataTypes.STRING,
                allowNull: true
            }, { transaction })
            await context.addColumn('TeamBrokerClients', 'ownerType', {
                type: DataTypes.STRING,
                allowNull: true
            }, { transaction })
        })
    },
    down: async (context) => {
    }
}
