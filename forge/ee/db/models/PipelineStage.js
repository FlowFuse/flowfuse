const {
    DataTypes
} = require('sequelize')

const SNAPSHOT_ACTIONS = {
    // Any changes to this list *must* be made via migration.
    CREATE_SNAPSHOT: 'create_snapshot',
    USE_LATEST_SNAPSHOT: 'use_latest_snapshot',
    PROMPT: 'prompt'
}

Object.freeze(SNAPSHOT_ACTIONS)

module.exports = {
    name: 'PipelineStage',
    schema: {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        deployToDevices: {
            type: DataTypes.BOOLEAN,
            default: false
        },
        action: {
            type: DataTypes.ENUM(Object.values(SNAPSHOT_ACTIONS)),
            defaultValue: SNAPSHOT_ACTIONS.CREATE_SNAPSHOT,
            allowNull: false
        },

        // relations
        NextStageId: {
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
                    if (instance.ApplicationId !== pipeline.ApplicationId) {
                        throw new Error(`All instances on a pipeline stage, must be a member of the same application as the pipeline. ${instance.name} is not a member of application ${pipeline.ApplicationId}.`)
                    }
                })
            }
        }
    },
    associations: function (M) {
        this.belongsTo(M.Pipeline)
        this.belongsToMany(M.Project, { through: M.PipelineStageInstance, as: 'Instances', otherKey: 'InstanceId' })
        this.belongsToMany(M.Device, { through: 'PipelineStageDevices' })
        this.hasOne(M.PipelineStage, { as: 'NextStage', foreignKey: 'NextStageId', allowNull: true })
    },
    finders: function (M) {
        const self = this
        return {
            instance: {
                async addInstanceId (instanceId) {
                    const instance = await M.Project.byId(instanceId)
                    // TODO VALIDATE IS PART OF THE SAME APPLICATION
                    if (!instance) {
                        throw new Error(`instanceId (${instanceId}) not found`)
                    }

                    await this.addInstance(instance)
                },
                async addDeviceId (deviceId) {
                    const device = await M.Device.byId(deviceId)
                    // TODO VALIDATE IS PART OF THE SAME APPLICATION
                    if (!device) {
                        throw new Error(`deviceId (${deviceId}) not found`)
                    }

                    await this.addDevice(device)
                }
            },
            static: {
                SNAPSHOT_ACTIONS,
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
                            },
                            {
                                association: 'Devices',
                                attributes: ['hashid', 'id', 'name', 'type', 'links', 'ownerType']
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
                            },
                            {
                                association: 'Devices',
                                attributes: ['hashid', 'id', 'name', 'type', 'links', 'ownerType']
                            }
                        ]
                    })
                },
                byNextStage: async function (idOrHash) {
                    let id = idOrHash
                    if (typeof idOrHash === 'string') {
                        id = M.PipelineStage.decodeHashid(idOrHash)
                    }
                    return this.findOne({
                        where: { NextStageId: id }
                    })
                }
            }
        }
    }
}
