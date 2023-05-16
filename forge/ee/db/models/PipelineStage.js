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

        target: { // @TODO: this is the next stage ID in the pipeline, needs relations declaring..
            type: DataTypes.INTEGER,
            allowNull: true
        }
    },
    options: {
        validate: {
            async instancesHaveSameApplication () {
                const instancesPromise = this.getInstances()
                const pipelinePromise = this.getPipeline()

                const instances = await instancesPromise
                const pipeline = await pipelinePromise

                instances.forEach((instance) => {
                    if (instance.applicationId !== pipeline.applicationId) {
                        throw new Error(`All instances on a pipeline stage, must be a member of the same application as the pipeline. ${instance.name} is not a member of application ${pipeline.applicationId}.`)
                    }
                })
            }
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
