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
            type: DataTypes.INTEGER,
            allowNull: true
        }
    },
    associations: function (M) {
        this.belongsTo(M.Pipeline)
        this.hasMany(M.Project)
    },
    finders: function (M) {
        const self = this
        return {
            instance: { },
            static: {
                byId: async function (idOrHash) {
                    let id = idOrHash
                    if (typeof idOrHash === 'string') {
                        id = M.PipelineStage.decodeHashid(idOrHash)
                    }
                    return this.findOne({
                        where: { id },
                        include: [
                            {
                                model: M.Project,
                                attributes: ['hashid', 'id', 'name', 'url', 'updatedAt']
                            }
                        ]
                    })
                },
                byPipeline: async function (pipelineId) {
                    if (typeof pipelineId === 'string') {
                        pipelineId = M.Pipeline.decodeHashid(pipelineId)
                    }
                    return await self.findAll({
                        where: {
                            PipelineId: pipelineId
                        },
                        include: [
                            {
                                model: M.Project,
                                attributes: ['hashid', 'id', 'name', 'url', 'updatedAt']
                            }
                        ]
                    })
                }
            }
        }
    }
}
