const {
    DataTypes
} = require('sequelize')

module.exports = {
    name: 'PipelineStage',
    schema: {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        target: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    associations: function (M) {
        this.belongsTo(M.Pipeline)
    },
    finders: function (M) {
        const self = this
        return {
            instance: { },
            static: {
                byPipeline: async function (pipelineId) {
                    if (typeof pipelineId === 'string') {
                        pipelineId = M.Pipeline.decodeHashid(pipelineId)
                    }
                    return await self.findAll({
                        where: {
                            PipelineId: pipelineId
                        }
                    })
                }
            }
        }
    }
}
