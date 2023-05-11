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
        this.belongsToMany(M.Project, { through: M.PipelineStageInstance, as: 'Instances', otherKey: 'InstanceId' })
    },
    finders: function (M) {
        const self = this
        return {
            instance: {
                async addInstanceId (instanceId) {
                    const instance = await M.Project.byId(instanceId)
                    await this.addInstance(instance)
                }
            },
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
                                association: 'Instances',
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
                                association: 'Instances',
                                attributes: ['hashid', 'id', 'name', 'url', 'updatedAt']
                            }
                        ]
                    })
                }
            }
        }
    }
}
