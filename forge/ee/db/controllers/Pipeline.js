const { ControllerError } = require('../../../lib/errors')

const { createSnapshot, copySnapshot, generateDeploySnapshotDescription, generateDeploySnapshotName } = require('../../../services/snapshots')
class PipelineControllerError extends ControllerError {
    constructor (...args) {
        super(...args)
        this.name = 'PipelineControllerError'
    }
}

module.exports = {

    /**
     * Update a pipeline stage
     * @param {*} app The application instance
     * @param {*} pipeline A pipeline object
     * @param {String|Number} stageId The ID of the stage to update
     * @param {Object} options Options to update the stage with
     * @param {String} [options.name] The name of the stage
     * @param {String} [options.action] The action to take when deploying to this stage
     * @param {String} [options.instanceId] The ID of the instance to deploy to
     * @param {String} [options.deviceId] The ID of the device to deploy to
     * @param {String} [options.deviceGroupId] The ID of the device group to deploy to
     * @param {Boolean} [options.deployToDevices] Whether to deploy to devices of the source stage
     */
    updatePipelineStage: async function (app, pipeline, stageId, options) {
        const stage = await app.db.models.PipelineStage.byId(stageId)
        if (!stage) {
            throw new PipelineControllerError('not_found', 'Pipeline stage not found', 404)
        }
        if (stage.PipelineId !== pipeline.id) {
            throw new PipelineControllerError('not_found', 'Pipeline stage not found', 404)
        }

        if (options.name) {
            stage.name = options.name
        }

        if (options.action) {
            stage.action = options.action
        }

        // Null will remove devices and instances, undefined skips
        if (options.instanceId !== undefined || options.deviceId !== undefined || options.deviceGroupId !== undefined) {
            // Check that only one of instanceId, deviceId or deviceGroupId is set
            const idCount = [options.instanceId, options.deviceId, options.deviceGroupId, options.gitTokenId].filter(id => !!id).length
            if (idCount > 1) {
                throw new PipelineControllerError('invalid_input', 'Must provide only one instance, device, device group or git token', 400)
            }

            const stages = await pipeline.stages()
            // stages are a linked list, so ensure we use the sorted stages
            const orderedStages = app.db.models.PipelineStage.sortStages(stages)
            const firstStage = orderedStages[0]
            const priorStages = []
            const laterStages = []
            let foundStage = false
            for (let stageIndex = 0; stageIndex < orderedStages.length; stageIndex++) {
                const s = orderedStages[stageIndex]
                if (s.id === stage.id) {
                    foundStage = true
                    continue
                }
                if (foundStage) {
                    laterStages.push(s)
                } else {
                    priorStages.push(s)
                }
            }

            // If this stage is being set as a device group, check all stages.
            // * A device group cannot be the first stage
            // * There can be multiple device groups but only a device group can follow a device group
            if (options.deviceGroupId) {
                if (orderedStages.length === 0) {
                    // this should never be reached but here for completeness
                    throw new PipelineControllerError('invalid_input', 'A Device Group cannot be the first stage', 400)
                }

                // if the first stage is the same as the stage being updated, then it's the first stage
                if (firstStage && firstStage.id === stage.id) {
                    throw new PipelineControllerError('invalid_input', 'A Device Group cannot be the first stage', 400)
                }

                if (laterStages && laterStages.length) {
                    const nonDeviceGroupStages = laterStages.filter(s => (s.DeviceGroups?.length ?? 0) === 0)
                    if (nonDeviceGroupStages.length > 0) {
                        throw new PipelineControllerError('invalid_input', 'This stage cannot be a Device Group as a later stage contains an instance', 400)
                    }
                }
            } else if (options.gitTokenId) {
                if (orderedStages.length === 0) {
                    // this should never be reached but here for completeness
                    throw new PipelineControllerError('invalid_input', 'A Git Repository cannot be the first stage', 400)
                }
                // if the first stage is the same as the stage being updated, then it's the first stage
                if (firstStage && firstStage.id === stage.id) {
                    throw new PipelineControllerError('invalid_input', 'A Git Repository cannot be the first stage', 400)
                }
                if (laterStages && laterStages.length) {
                    throw new PipelineControllerError('invalid_input', 'This stage cannot be a Git Repository as it is not the last stage', 400)
                }
                // TODO: code duplication between here and the create path to validate ownership of the gitToken
                const gitTokenId = app.db.models.GitToken.decodeHashid(options.gitTokenId)
                let gitToken
                if (gitTokenId && gitTokenId.length === 1) {
                    // Verify the git token exists in the same team as this pipeline
                    gitToken = await app.db.models.GitToken.findOne({
                        where: { id: gitTokenId },
                        include: [
                            {
                                model: app.db.models.Team,
                                include: [{
                                    model: app.db.models.Application,
                                    where: { id: pipeline.ApplicationId }
                                }],
                                // Set required to true to ensure we match both token and application ids
                                required: true
                            }
                        ]
                    })
                }
                if (!gitToken) {
                    throw new PipelineControllerError('invalid_input', 'Invalid git token')
                }
            } else {
                // hosted/remote instance
                // If a device group is set before this stage, that is an error
                const nonDeviceGroupStagesPrior = priorStages.filter(s => (s.DeviceGroups?.length ?? 0) > 0)
                if (nonDeviceGroupStagesPrior.length > 0) {
                    throw new PipelineControllerError('invalid_input', 'This stage cannot contain an instance as a Device Group is set in a prior stage', 400)
                }
                // If any device group exists after this stage, they must all be device groups
                const deviceGroupStagesLater = laterStages.filter(s => (s.DeviceGroups?.length ?? 0) > 0)
                const nonDeviceGroupStagesLater = laterStages.filter(s => (s.DeviceGroups?.length ?? 0) === 0)
                if (deviceGroupStagesLater.length > 0 && nonDeviceGroupStagesLater.length > 0) {
                    throw new PipelineControllerError('invalid_input', 'This stage can only contain Device Group stages', 400)
                }
            }

            // Currently only one instance, device or device group per stage is supported
            const instances = await stage.getInstances()
            for (const instance of instances) {
                await stage.removeInstance(instance)
            }

            const devices = await stage.getDevices()
            for (const device of devices) {
                await stage.removeDevice(device)
            }

            const deviceGroups = await stage.getDeviceGroups()
            for (const deviceGroup of deviceGroups) {
                await stage.removeDeviceGroup(deviceGroup)
            }
            const existingGitRepo = await stage.getPipelineStageGitRepo()
            if (existingGitRepo && !options.gitTokenId) {
                // Only destroy if the update appears to be changing stage type
                await existingGitRepo.destroy()
            }

            if (options.instanceId) {
                await stage.addInstanceId(options.instanceId)
            } else if (options.deviceId) {
                await stage.addDeviceId(options.deviceId)
            } else if (options.deviceGroupId) {
                await stage.addDeviceGroupId(options.deviceGroupId)
            } else if (options.gitTokenId) {
                await stage.addGitRepo(options)
            }
        }

        if (options.deployToDevices !== undefined) {
            stage.deployToDevices = options.deployToDevices
        }

        await stage.save()
        await stage.reload()
        return stage
    },

    addPipelineStage: async function (app, pipeline, options) {
        const idCount = [options.instanceId, options.deviceId, options.deviceGroupId, options.gitTokenId].filter(id => !!id).length
        if (idCount > 1) {
            throw new PipelineControllerError('invalid_input', 'Cannot add a pipeline stage with a mixture of instance, device, device group or git token. Only one is permitted', 400)
        } else if (idCount === 0) {
            throw new PipelineControllerError('invalid_input', 'An instance, device, device group or git token is required when creating a new pipeline stage', 400)
        }
        if (options.instanceId) {
            const instance = await app.db.models.Project.findOne({
                where: { id: options.instanceId, ApplicationId: pipeline.ApplicationId },
                attributes: ['id']
            })
            if (!instance) {
                throw new PipelineControllerError('invalid_input', 'Invalid instance')
            }
        }
        if (options.deviceId) {
            const deviceId = (typeof options.deviceId === 'string') ? app.db.models.Device.decodeHashid(options.deviceId) : options.deviceId
            const device = await app.db.models.Device.findOne({
                where: { id: deviceId, ApplicationId: pipeline.ApplicationId },
                attributes: ['id']
            })
            if (!device) {
                throw new PipelineControllerError('invalid_input', 'Invalid device')
            }
        }
        if (options.deviceGroupId) {
            const deviceGroupId = (typeof options.deviceGroupId === 'string') ? app.db.models.DeviceGroup.decodeHashid(options.deviceGroupId) : options.deviceGroupId
            const deviceGroup = await app.db.models.DeviceGroup.findOne({
                where: { id: deviceGroupId, ApplicationId: pipeline.ApplicationId },
                attributes: ['id']
            })
            if (!deviceGroup) {
                throw new PipelineControllerError('invalid_input', 'Invalid device group')
            }
        }
        if (options.gitTokenId) {
            // TODO: code duplication between here and the create path to validate ownership of the gitToken
            const gitTokenId = app.db.models.GitToken.decodeHashid(options.gitTokenId)
            let gitToken
            if (gitTokenId && gitTokenId.length === 1) {
                // Verify the git token exists in the same team as this pipeline
                gitToken = await app.db.models.GitToken.findOne({
                    where: { id: gitTokenId },
                    include: [
                        {
                            model: app.db.models.Team,
                            include: [{
                                model: app.db.models.Application,
                                where: { id: pipeline.ApplicationId }
                            }],
                            // Set required to true to ensure we match both token and application ids
                            required: true
                        }
                    ]
                })
            }
            if (!gitToken) {
                throw new PipelineControllerError('invalid_input', 'Invalid git token')
            }
        }

        let source
        options.PipelineId = pipeline.id
        if (options.source) {
            // this gives us the input stage to this new stage.
            // we store "targets", so need to update the source to point to this new stage
            source = options.source
            delete options.source
        }

        // Before we create the stage, we need to check a few things]
        // 1. When adding a device group
        //   * A device group cannot be the first stage
        //   * There can be multiple device groups but only a device group can follow a device group
        // 2. When adding an instance/device
        //   * A device group cannot be set before an instance or device
        // 3. When adding a git repo
        //   * Cannot be first stage

        const stages = await pipeline.stages() // stages are a linked list
        const orderedStages = app.db.models.PipelineStage.sortStages(stages) // sort the stages

        // 1. When adding a device group
        if (options.deviceGroupId) {
            const stageCount = stages.length
            if (stageCount === 0) {
                throw new PipelineControllerError('invalid_input', 'A Device Group cannot be the first stage', 400)
            }
        }

        // 2. When adding an instance/device
        if (options.instanceId || options.deviceId) {
            // ensure that we are not adding an instance or device after a device group
            const deviceGroups = orderedStages.filter(s => s.DeviceGroups?.length)
            if (deviceGroups.length) {
                throw new PipelineControllerError('invalid_input', 'An instance or device cannot be added after a device group', 400)
            }
        }

        if (options.gitTokenId) {
            if (stages.length === 0) {
                throw new PipelineControllerError('invalid_input', 'A Git Repository cannot be the first stage', 400)
            }
        }

        const transaction = await app.db.sequelize.transaction()
        try {
            const stage = await app.db.models.PipelineStage.create(options, { transaction })
            if (options.instanceId) {
                await stage.addInstanceId(options.instanceId, { transaction })
            } else if (options.deviceId) {
                await stage.addDeviceId(options.deviceId, { transaction })
            } else if (options.deviceGroupId) {
                await stage.addDeviceGroupId(options.deviceGroupId, { transaction })
            } else if (options.gitTokenId) {
                await stage.addGitRepo(options, { transaction })
            } else {
                // This should never be reached due to guard at top of function
                throw new PipelineControllerError('invalid_input', 'Must provide an instanceId, deviceId or deviceGroupId', 400)
            }

            if (source) {
                const sourceStage = await app.db.models.PipelineStage.byId(source, { transaction })
                sourceStage.NextStageId = stage.id
                await sourceStage.save({ transaction })
            }
            await transaction.commit()
            return stage
        } catch (err) {
            await transaction.rollback()
            throw err
        }
    },

    validateSourceStageForDeploy: async function (app, pipeline, sourceStage) {
        if (!sourceStage) {
            throw new PipelineControllerError('not_found', 'Source stage not found', 404)
        }
        if (sourceStage.PipelineId !== pipeline.id) {
            throw new PipelineControllerError('invalid_stage', 'Source stage must be part of the same pipeline', 400)
        }

        const targetStage = await app.db.models.PipelineStage.byId(sourceStage.NextStageId)
        if (!targetStage) {
            throw new PipelineControllerError('not_found', 'Target stage not found', 404)
        }
        if (targetStage.PipelineId !== sourceStage.PipelineId) {
            throw new PipelineControllerError('invalid_stage', 'Target stage must be part of the same pipeline as source stage', 400)
        }

        const sourceInstances = await sourceStage.getInstances()
        const sourceDevices = await sourceStage.getDevices()
        const sourceDeviceGroups = await sourceStage.getDeviceGroups()
        const totalSources = sourceInstances.length + sourceDevices.length + sourceDeviceGroups.length
        if (totalSources === 0) {
            throw new PipelineControllerError('invalid_stage', 'Source stage must have at least one instance or device', 400)
        }
        if (totalSources > 1) {
            throw new PipelineControllerError('invalid_stage', 'Deployments are currently only supported for source stages with a single instance or device', 400)
        }

        const targetInstances = await targetStage.getInstances()
        const targetDevices = await targetStage.getDevices()
        const targetDeviceGroups = await targetStage.getDeviceGroups()
        const targetGitRepo = await targetStage.getPipelineStageGitRepo()
        const totalTargets = targetInstances.length + targetDevices.length + targetDeviceGroups.length + (targetGitRepo ? 1 : 0)

        if (totalTargets === 0) {
            throw new PipelineControllerError('invalid_stage', 'Target stage must have at least one instance, device, device group or git repository', 400)
        } else if (targetInstances.length > 1) {
            throw new PipelineControllerError('invalid_stage', 'Deployments are currently only supported for target stages with a single instance, device or device group', 400)
        }

        const sourceInstance = sourceInstances[0]
        const targetInstance = targetInstances[0]

        const sourceDevice = sourceDevices[0]
        const targetDevice = targetDevices[0]

        const sourceDeviceGroup = sourceDeviceGroups[0]
        const targetDeviceGroup = targetDeviceGroups[0]

        const sourceObject = sourceInstance || sourceDevice || sourceDeviceGroup
        const targetObject = targetInstance || targetDevice || targetDeviceGroup

        const sourceType = sourceInstance ? 'instance' : (sourceDevice ? 'device' : (sourceDeviceGroup ? 'device group' : ''))
        const sourceApplication = await app.db.models.Application.byId(sourceObject.ApplicationId)
        if (!sourceApplication) {
            throw new PipelineControllerError('invalid_stage', `Source ${sourceType} must be associated with an application`, 400)
        }

        if (targetObject) {
            // Only applies for instance/device/device group targets
            const targetType = targetInstance ? 'instance' : (targetDevice ? 'device' : (targetDeviceGroup ? 'device group' : ''))
            const targetApplication = await app.db.models.Application.byId(targetObject.ApplicationId)
            if (!targetApplication) {
                throw new PipelineControllerError('invalid_stage', `Target ${targetType} must be associated with an application`, 400)
            }
            if (sourceApplication.id !== targetApplication.id || sourceApplication.TeamId !== targetApplication.TeamId) {
                throw new PipelineControllerError('invalid_stage', `Source ${sourceType} and target ${targetType} must be associated with in the same team application`, 400)
            }
            if (targetDevice && targetDevice.mode === 'developer') {
                throw new PipelineControllerError('invalid_target_stage', 'Target device cannot not be in developer mode', 400)
            }
        }

        return {
            sourceInstance,
            targetInstance,
            sourceDevice,
            targetDevice,
            sourceDeviceGroup,
            targetDeviceGroup,
            targetGitRepo,
            targetStage
        }
    },

    getOrCreateSnapshotForSourceInstance: async function (app, sourceStage, sourceInstance, sourceSnapshotId, deployMeta = { pipeline: null, user: null, targetStage: null }) {
        // Only used for reporting and logging, should not be used for any logic
        const { pipeline, targetStage, user } = deployMeta

        if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.USE_LATEST_SNAPSHOT) {
            const sourceSnapshot = await sourceInstance.getLatestSnapshot()
            if (!sourceSnapshot) {
                throw new PipelineControllerError('invalid_source_instance', 'No snapshots found for source stages instance but deploy action is set to use latest snapshot', 400)
            }
            return sourceSnapshot
        }

        if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.CREATE_SNAPSHOT) {
            return await createSnapshot(app, sourceInstance, user, {
                name: generateDeploySnapshotName(),
                description: generateDeploySnapshotDescription(sourceStage, targetStage, pipeline),
                setAsTarget: false // no need to deploy to devices of the source
            })
        }

        if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.PROMPT) {
            if (!sourceSnapshotId) {
                throw new PipelineControllerError('invalid_source_snapshot', 'Source snapshot is required as deploy action is set to prompt for snapshot', 400)
            }

            const sourceSnapshot = await app.db.models.ProjectSnapshot.byId(sourceSnapshotId)
            if (!sourceSnapshot) {
                throw new PipelineControllerError('invalid_source_snapshot', 'Source snapshot not found', 404)
            }

            if (sourceSnapshot.ProjectId !== sourceInstance.id) {
                throw new PipelineControllerError('invalid_source_snapshot', 'Source snapshot not associated with source instance', 400)
            }

            return sourceSnapshot
        }

        if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.USE_ACTIVE_SNAPSHOT) {
            throw new PipelineControllerError('invalid_source_action', 'When using an instance as a source, use active snapshot is not supported', 400)
        }

        throw new PipelineControllerError('invalid_action', `Unsupported pipeline deploy action for instances: ${sourceStage.action}`, 400)
    },

    getOrCreateSnapshotForSourceDevice: async function (app, sourceStage, sourceDevice, sourceSnapshotId) {
        if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.USE_LATEST_SNAPSHOT) {
            const sourceSnapshot = await sourceDevice.getLatestSnapshot()
            if (!sourceSnapshot) {
                throw new PipelineControllerError('invalid_source_device', 'No snapshots found for source stages device but deploy action is set to use latest snapshot', 400)
            }
            return sourceSnapshot
        }

        if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.CREATE_SNAPSHOT) {
            throw new PipelineControllerError('invalid_source_action', 'When using a device as a source, create snapshot is not supported', 400)
        }

        if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.PROMPT) {
            if (!sourceSnapshotId) {
                throw new PipelineControllerError('invalid_source_snapshot', 'Source snapshot is required as deploy action is set to prompt for snapshot', 400)
            }

            const sourceSnapshot = await app.db.models.ProjectSnapshot.byId(sourceSnapshotId)
            if (!sourceSnapshot) {
                throw new PipelineControllerError('invalid_source_snapshot', 'Source snapshot not found', 404)
            }

            if (sourceSnapshot.DeviceId !== sourceDevice.id) {
                throw new PipelineControllerError('invalid_source_snapshot', 'Source snapshot not associated with source device', 400)
            }

            return sourceSnapshot
        }

        if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.USE_ACTIVE_SNAPSHOT) {
            const sourceSnapshot = await sourceDevice.getActiveSnapshot()
            if (!sourceSnapshot) {
                throw new PipelineControllerError('invalid_source_device', 'No active snapshot found for source stages device but deploy action is set to use active snapshot', 400)
            }
            return sourceSnapshot
        }

        throw new PipelineControllerError('invalid_action', `Unsupported pipeline deploy action for devices: ${sourceStage.action}`, 400)
    },

    getSnapshotForSourceDeviceGroup: async function (app, sourceDeviceGroup) {
        const sourceSnapshot = await sourceDeviceGroup.getTargetSnapshot()
        if (!sourceSnapshot) {
            throw new PipelineControllerError('invalid_source_device_group', 'No snapshots found for source stages device group but deploy action is set to use latest snapshot', 400)
        }
        return sourceSnapshot
    },

    /**
     * Deploy a snapshot to an instance
     * @param {Object} app - The application instance
     * @param {Object} pipeline - The pipeline
     * @param {Object} sourceStage - The source stage
     * @param {Object} sourceSnapshot - The source snapshot object
     * @param {Object} targetInstance - The target instance object
     * @param {Object} sourceInstance - The source instance object
     * @param {Object} sourceDevice - The source device object
     * @param {Object} user - The user performing the deploy
     * @param {Object} targetStage - The target stage
     * @returns {Promise<Function>} - Resolves with the deploy is complete
     */
    deploySnapshotToInstance: function (app, sourceSnapshot, targetInstance, deployToDevices, deployMeta = { pipeline: undefined, sourceStage: undefined, sourceInstance: undefined, sourceDevice: undefined, targetStage: undefined, user: undefined }) {
        // Only used for reporting and logging, should not be used for any logic
        const { pipeline, sourceStage, sourceInstance, sourceDevice, targetStage, user } = deployMeta

        const restartTargetInstance = targetInstance?.state === 'running'

        app.db.controllers.Project.setInflightState(targetInstance, 'importing')
        app.db.controllers.Project.setInDeploy(targetInstance)

        // Complete heavy work async
        return (async function () {
            try {
                const setAsTargetForDevices = deployToDevices ?? false
                const targetSnapshot = await copySnapshot(app, sourceSnapshot, targetInstance, {
                    importSnapshot: true, // target instance should import the snapshot
                    setAsTarget: setAsTargetForDevices,
                    targetSnapshotProperties: {
                        name: generateDeploySnapshotName(sourceSnapshot),
                        description: generateDeploySnapshotDescription(sourceStage, targetStage, pipeline, sourceSnapshot)
                    }
                })
                if (restartTargetInstance) {
                    await targetInstance.reload({ include: [app.db.models.Team] })
                    await app.containers.restartFlows(targetInstance)
                }

                await app.auditLog.Project.project.imported(user.id, null, targetInstance, sourceInstance, sourceDevice) // technically this isn't a project event
                await app.auditLog.Project.project.snapshot.imported(user.id, null, targetInstance, sourceInstance, sourceDevice, targetSnapshot)

                app.db.controllers.Project.clearInflightState(targetInstance)
            } catch (err) {
                app.db.controllers.Project.clearInflightState(targetInstance)

                await app.auditLog.Project.project.imported(user.id, null, targetInstance, sourceInstance, sourceDevice) // technically this isn't a project event
                await app.auditLog.Project.project.snapshot.imported(user.id, err, targetInstance, sourceInstance, sourceDevice, null)

                throw new PipelineControllerError('unexpected_error', `Error during deploy: ${err.toString()}`, 500, { cause: err })
            }
        })()
    },

    /**
     * Deploy a snapshot to a device
     * @param {Object} app - The application instance
     * @param {Object} sourceSnapshot - The source snapshot object
     * @param {Object} targetDevice - The target device object
     * @param {Object} pipeline - The pipeline triggering the deployment
     * @param {Object} user - The user performing the deploy
     * @returns {Promise<Function>} - Resolves with the deploy is complete
     */
    deploySnapshotToDevice: async function (app, sourceSnapshot, targetDevice, pipeline = null, deployMeta = { user: null }) {
        // Only used for reporting and logging, should not be used for any logic
        const { user } = deployMeta

        try {
            // store original value for later audit log
            const originalSnapshotId = targetDevice.targetSnapshotId

            // Update the targetSnapshot of the device
            await targetDevice.update({ targetSnapshotId: sourceSnapshot.id })

            await app.auditLog.Device.device.snapshot.targetSet(user, null, targetDevice, sourceSnapshot)

            if (pipeline) {
                await app.auditLog.Device.device.pipeline.deployed(user, null, targetDevice, pipeline, targetDevice.Application, sourceSnapshot)
            }

            const updates = new app.auditLog.formatters.UpdatesCollection()
            updates.push('targetSnapshotId', originalSnapshotId, targetDevice.targetSnapshotId)
            await app.auditLog.Team.team.device.updated(user, null, targetDevice.Team, targetDevice, updates)

            const updatedDevice = await app.db.models.Device.byId(targetDevice.id) // fully reload with associations
            await app.db.controllers.Device.sendDeviceUpdateCommand(updatedDevice)
        } catch (err) {
            throw new PipelineControllerError('unexpected_error', `Error during deploy: ${err.toString()}`, 500, { cause: err })
        }
    },

    /**
     * Deploy a snapshot to a device group
     * @param {Object} app - The application instance
     * @param {Object} sourceSnapshot - The source snapshot object
     * @param {Object} targetDeviceGroup - The target device group object
     * @param {Object} user - The user performing the deploy
     * @returns {Promise<Function>} - Resolves with the deploy is complete
     */
    deploySnapshotToDeviceGroup: async function (app, sourceSnapshot, targetDeviceGroup, deployMeta = { user: null }) {
        // Only used for reporting and logging, should not be used for any logic
        // const { user } = deployMeta // TODO: implement device audit logs

        try {
            // store original value for later audit log
            // const originalSnapshotId = targetDeviceGroup.targetSnapshotId // TODO: implement device audit logs

            // start a transaction
            const transaction = await app.db.sequelize.transaction()
            try {
                // Update the targetSnapshot of the device group
                await targetDeviceGroup.PipelineStageDeviceGroup.update({ targetSnapshotId: sourceSnapshot.id }, { transaction })

                // Update the targetSnapshotId on the device group
                await targetDeviceGroup.update({ targetSnapshotId: sourceSnapshot.id }, { transaction })

                // update all devices targetSnapshotId
                await app.db.models.Device.update({ targetSnapshotId: sourceSnapshot.id }, { where: { DeviceGroupId: targetDeviceGroup.id }, transaction })
                // commit the transaction
                await transaction.commit()
            } catch (error) {
                // rollback the transaction
                await transaction.rollback()
                throw error
            }

            // TODO: implement device audit logs
            // const updates = new app.auditLog.formatters.UpdatesCollection()
            // updates.push('targetSnapshotId', originalSnapshotId, targetDeviceGroup.targetSnapshotId)
            // await app.auditLog.Team.team.device.updated(user, null, targetDeviceGroup.Team, targetDeviceGroup, updates)

            // Send the update command asynchronously
            app.db.controllers.DeviceGroup.sendUpdateCommand(targetDeviceGroup)
        } catch (err) {
            throw new PipelineControllerError('unexpected_error', `Error during deploy: ${err.toString()}`, 500, { cause: err })
        }
    }
}
