/**
 * Add PipelineStageGitRepo table
 */
const { DataTypes } = require('sequelize')

module.exports = {
    /**
     * upgrade database
     * @param {QueryInterface} context Sequelize.QueryInterface
     */
    up: async (context) => {
        await context.createTable('PipelineStageGitRepos', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            url: {
                type: DataTypes.STRING,
                allowNull: false
            },
            branch: {
                type: DataTypes.STRING,
                allowNull: false,
                default: 'main'
            },
            lastPushAt: {
                type: DataTypes.DATE
            },
            status: {
                type: DataTypes.STRING,
                default: ''
            },
            statusMessage: {
                type: DataTypes.STRING,
                default: ''
            },
            credentialSecret: {
                type: DataTypes.STRING,
                default: ''
            },
            PipelineStageId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { model: 'PipelineStages', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            GitTokenId: {
                type: DataTypes.INTEGER,
                references: { model: 'GitTokens', key: 'id' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            }
        })
    },
    down: async (context) => {
    }
}
