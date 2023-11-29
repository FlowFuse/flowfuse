const {
    DataTypes, ValidationError
} = require('sequelize')

const SNAPSHOT_ACTIONS = {
    // Any changes to this list *must* be made via migration.
    CREATE_SNAPSHOT: 'create_snapshot',
    USE_ACTIVE_SNAPSHOT: 'use_active_snapshot',
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
            allowNull: false,
            validate: {
                isIn: [Object.values(SNAPSHOT_ACTIONS)],
                async validActionForStageType () {
                    const devicesPromise = this.getDevices()
                    const instancesPromise = this.getInstances()

                    const devices = await devicesPromise
                    const instances = await instancesPromise

                    if (devices.length > 0) {
                        const validActionsForDevices = [
                            SNAPSHOT_ACTIONS.USE_ACTIVE_SNAPSHOT,
                            SNAPSHOT_ACTIONS.USE_LATEST_SNAPSHOT,
                            SNAPSHOT_ACTIONS.PROMPT
                        ]

                        if (!validActionsForDevices.includes(this.action)) {
                            throw new Error(`Device stages only support the following actions: ${validActionsForDevices.join(', ')}.`)
                        }
                    } else if (instances.length > 0) {
                        const validActionsForInstances = [
                            SNAPSHOT_ACTIONS.CREATE_SNAPSHOT,
                            SNAPSHOT_ACTIONS.USE_LATEST_SNAPSHOT,
                            SNAPSHOT_ACTIONS.PROMPT
                        ]

                        if (!validActionsForInstances.includes(this.action)) {
                            throw new Error(`Instance stages only support the following actions: ${validActionsForInstances.join(', ')}.`)
                        }
                    }
                }
            }
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
            },
            async devicesHaveSameApplication () {
                const devicesPromise = this.getDevices()
                const pipelinePromise = this.getPipeline()

                const devices = await devicesPromise
                const pipeline = await pipelinePromise

                devices.forEach((device) => {
                    if (device.ApplicationId !== pipeline.ApplicationId) {
                        throw new Error(`All devices on a pipeline stage, must be a member of the same application as the pipeline. ${device.name} is not a member of application ${pipeline.ApplicationId}.`)
                    }
                })
            },
            async devicesOrInstancesNotBoth () {
                const devicesPromise = this.getDevices()
                const instancesPromise = this.getInstances()

                const devices = await devicesPromise
                const instances = await instancesPromise

                if (devices.length > 0 && instances.length > 0) {
                    throw new Error('A pipeline stage can contain devices or instances, but never both.')
                }
            }
        }
    },
    associations: function (M) {
        this.belongsTo(M.Pipeline)
        this.belongsToMany(M.Project, { through: M.PipelineStageInstance, as: 'Instances', otherKey: 'InstanceId' })
        this.belongsToMany(M.Device, { through: M.PipelineStageDevice, as: 'Devices' })
        this.hasOne(M.PipelineStage, { as: 'NextStage', foreignKey: 'NextStageId', allowNull: true })
    },
    finders: function (M) {
        const self = this
        return {
            instance: {
                async addInstanceId (instanceId) {
                    const instance = await M.Project.byId(instanceId)
                    if (!instance) {
                        throw new ValidationError(`instanceId (${instanceId}) not found`)
                    }

                    if (await this.hasInstance(instance)) {
                        throw new ValidationError(`instanceId (${instanceId}) is already in use in this stage`)
                    }

                    if (await (await this.getPipeline()).hasInstance(instance)) {
                        throw new ValidationError(`instanceId (${instanceId}) is already in use in this pipeline`)
                    }

                    await this.addInstance(instance)
                },
                async addDeviceId (deviceId) {
                    const device = await M.Device.byId(deviceId)
                    if (!device) {
                        throw new ValidationError(`deviceId (${deviceId}) not found`)
                    }

                    if (await this.hasDevice(device)) {
                        throw new ValidationError(`deviceId (${deviceId}) is already in use in this stage`)
                    }

                    if (await (await this.getPipeline()).hasDevice(device)) {
                        throw new ValidationError(`deviceId (${deviceId}) is already in use in this pipeline`)
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
                byPipeline: async function (pipelineId, { includeDeviceStatus = false } = {}) {
                    if (typeof pipelineId === 'string') {
                        pipelineId = M.Pipeline.decodeHashid(pipelineId)
                    }

                    const devicesInclude = {
                        association: 'Devices',
                        attributes: ['hashid', 'id', 'name', 'type', 'ownerType', 'links']
                    }

                    if (includeDeviceStatus) {
                        devicesInclude.attributes.push('targetSnapshotId', 'activeSnapshotId', 'lastSeenAt', 'state')
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
                            devicesInclude
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
