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
        await context.addColumn('PipelineStageGitRepos', 'pushPath', {
            type: DataTypes.STRING,
            default: '',
            allowNull: true
        })
        await context.addColumn('PipelineStageGitRepos', 'lastPushPath', {
            type: DataTypes.STRING,
            default: '',
            allowNull: true
        })
        await context.addColumn('PipelineStageGitRepos', 'pullBranch', {
            type: DataTypes.STRING,
            default: 'main',
            allowNull: true
        })
        await context.addColumn('PipelineStageGitRepos', 'pullPath', {
            type: DataTypes.STRING,
            default: '',
            allowNull: true
        })
        await context.addColumn('PipelineStageGitRepos', 'lastPullAt', {
            type: DataTypes.DATE,
            allowNull: true
        })
    },
    down: async (context) => {
    }
}
