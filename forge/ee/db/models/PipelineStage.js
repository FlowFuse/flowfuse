const {
    DataTypes, Op, ValidationError
} = require('sequelize')

const { KEY_HA, KEY_PROTECTED, KEY_SETTINGS } = require('../../../db/models/ProjectSettings')

const SNAPSHOT_ACTIONS = {
    // Any changes to this list *must* be made via migration.
    CREATE_SNAPSHOT: 'create_snapshot',
    USE_ACTIVE_SNAPSHOT: 'use_active_snapshot',
    USE_LATEST_SNAPSHOT: 'use_latest_snapshot',
    PROMPT: 'prompt'
}

Object.freeze(SNAPSHOT_ACTIONS)

const VALID_ACTIONS_FOR_DEVICES = [
    SNAPSHOT_ACTIONS.USE_ACTIVE_SNAPSHOT,
    SNAPSHOT_ACTIONS.USE_LATEST_SNAPSHOT,
    SNAPSHOT_ACTIONS.PROMPT
]

Object.freeze(VALID_ACTIONS_FOR_DEVICES)

const VALID_ACTIONS_FOR_INSTANCES = [
    SNAPSHOT_ACTIONS.CREATE_SNAPSHOT,
    SNAPSHOT_ACTIONS.USE_LATEST_SNAPSHOT,
    SNAPSHOT_ACTIONS.PROMPT
]

Object.freeze(VALID_ACTIONS_FOR_INSTANCES)

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
                        if (!VALID_ACTIONS_FOR_DEVICES.includes(this.action)) {
                            throw new Error(`Device stages only support the following actions: ${VALID_ACTIONS_FOR_DEVICES.join(', ')}.`)
                        }
                    } else if (instances.length > 0) {
                        if (!VALID_ACTIONS_FOR_INSTANCES.includes(this.action)) {
                            throw new Error(`Instance stages only support the following actions: ${VALID_ACTIONS_FOR_INSTANCES.join(', ')}.`)
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
            async deviceGroupsHaveSameApplication () {
                const deviceGroupsPromise = this.getDeviceGroups()
                const pipelinePromise = this.getPipeline()

                const deviceGroups = await deviceGroupsPromise
                const pipeline = await pipelinePromise

                deviceGroups.forEach((group) => {
                    if (group.ApplicationId !== pipeline.ApplicationId) {
                        throw new Error(`All device groups on a pipeline stage, must be a member of the same application as the pipeline. ${group.name} is not a member of application ${pipeline.ApplicationId}.`)
                    }
                })
            },
            async devicesInstancesOrDeviceGroups () {
                const devicesPromise = this.getDevices()
                const instancesPromise = this.getInstances()
                const deviceGroupsPromise = this.getDeviceGroups()

                const devices = await devicesPromise
                const instances = await instancesPromise
                const deviceGroups = await deviceGroupsPromise
                const count = devices.length ? 1 : 0 + instances.length ? 1 : 0 + deviceGroups.length ? 1 : 0
                if (count > 1) {
                    throw new Error('A pipeline stage can only contain instances, devices or device groups, not a combination of them.')
                }
            }
        }
    },
    associations: function (M) {
        this.belongsTo(M.Pipeline)
        this.belongsToMany(M.Project, { through: M.PipelineStageInstance, as: 'Instances', otherKey: 'InstanceId' })
        this.belongsToMany(M.Device, { through: M.PipelineStageDevice, as: 'Devices' })
        this.belongsToMany(M.DeviceGroup, { through: M.PipelineStageDeviceGroup, as: 'DeviceGroups' })
        this.hasOne(M.PipelineStage, { as: 'NextStage', foreignKey: 'NextStageId', allowNull: true })
    },
    finders: function (M) {
        const self = this
        return {
            instance: {
                async addInstanceId (instanceId, options = {}) {
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

                    if (!VALID_ACTIONS_FOR_INSTANCES.includes(this.action)) {
                        throw new ValidationError(`Can't add device as current action is ${this.action} and instance stages only support the following actions: ${VALID_ACTIONS_FOR_INSTANCES.join(', ')}.`)
                    }

                    await this.addInstance(instance, options)
                },
                async addDeviceId (deviceId, options = {}) {
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

                    if (!VALID_ACTIONS_FOR_DEVICES.includes(this.action)) {
                        throw new ValidationError(`Can't add device as current action is ${this.action} and device stages only support the following actions: ${VALID_ACTIONS_FOR_DEVICES.join(', ')}.`)
                    }

                    await this.addDevice(device, options)
                },
                async addDeviceGroupId (deviceGroupId, options = {}) {
                    const deviceGroup = await M.DeviceGroup.byId(deviceGroupId)
                    if (!deviceGroup) {
                        throw new ValidationError(`deviceGroupId (${deviceGroupId}) not found`)
                    }

                    await this.addDeviceGroup(deviceGroup, options)
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
                            },
                            {
                                association: 'DeviceGroups',
                                attributes: ['hashid', 'id', 'name', 'description']
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
                    const deviceGroupsInclude = {
                        association: 'DeviceGroups',
                        attributes: ['hashid', 'id', 'name', 'description'],
                        include: [
                            {
                                association: 'Devices',
                                attributes: ['hashid', 'id', 'name', 'type', 'ownerType', 'links']
                            }
                        ]
                    }

                    if (includeDeviceStatus) {
                        devicesInclude.attributes.push('targetSnapshotId', 'activeSnapshotId', 'lastSeenAt', 'state', 'mode')
                        deviceGroupsInclude.include[0].attributes.push('targetSnapshotId', 'activeSnapshotId', 'lastSeenAt', 'state', 'mode')
                    }

                    return await self.findAll({
                        where: {
                            PipelineId: pipelineId
                        },
                        include: [
                            {
                                association: 'Instances',
                                attributes: ['hashid', 'id', 'name', 'url', 'updatedAt'],
                                include: [
                                    {
                                        model: M.ProjectSettings,
                                        where: {
                                            [Op.or]: [
                                                { key: KEY_SETTINGS },
                                                { key: KEY_HA },
                                                { key: KEY_PROTECTED }
                                            ]
                                        },
                                        required: false
                                    }
                                ]
                            },
                            devicesInclude,
                            deviceGroupsInclude
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
                },
                /**
                 * Static helper to ensure the stages are ordered correctly
                 * @param {[]} stages The stages to order
                 */
                sortStages: function (stages) {
                    // Must ensure the stages are listed in the correct order
                    const stagesById = {}
                    const backReferences = {}
                    let pointer = null
                    // Scan the list of stages
                    //  - build an id->stage reference table
                    //  - find the last stage (!NextStageId) and set pointer
                    //  - build a reference table of which stage points at which
                    stages.forEach(stage => {
                        stagesById[stage.id] = stage
                        if (!stage.NextStageId) {
                            pointer = stage
                        } else {
                            backReferences[stage.NextStageId] = stage.id
                        }
                    })
                    const orderedStages = []
                    // Starting at the last stage, work back through the references
                    while (pointer) {
                        orderedStages.unshift(pointer)
                        pointer = stagesById[backReferences[pointer.id]]
                    }
                    return orderedStages
                }
            }
        }
    }
}
