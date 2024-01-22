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
    updatePipelineStage: async function (app, stageId, options) {
        const stage = await app.db.models.PipelineStage.byId(stageId)
        if (!stage) {
            throw new PipelineControllerError('not_found', 'Pipeline stage not found', 404)
        }
        const pipeline = await app.db.models.Pipeline.byId(stage.PipelineId)
        if (!pipeline) {
            throw new PipelineControllerError('not_found', 'Pipeline not found', 404)
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
            const idCount = [options.instanceId, options.deviceId, options.deviceGroupId].filter(id => !!id).length
            if (idCount > 1) {
                throw new PipelineControllerError('invalid_input', 'Must provide only one instance, device or device group', 400)
            }

            // If this stage is being set as a device group, check all stages.
            // * A device group cannot be the first stage
            // * There can be only one device group and it can only be the last stage
            if (options.deviceGroupId) {
                const stages = await pipeline.stages()
                // stages are a linked list, so ensure we use the sorted stages
                const orderedStages = app.db.models.PipelineStage.sortStages(stages)
                if (orderedStages.length === 0) {
                    // this should never be reached but here for completeness
                    throw new PipelineControllerError('invalid_input', 'A Device Group cannot be the first stage', 400)
                }
                const firstStage = orderedStages[0]
                const lastStage = orderedStages[orderedStages.length - 1]

                // if the first stage is the same as the stage being updated, then it's the first stage
                if (firstStage && firstStage.id === stage.id) {
                    throw new PipelineControllerError('invalid_input', 'A Device Group cannot be the first stage', 400)
                }

                // filter out the stage being updated and check if any other stages have a device group
                const otherStages = stages.filter(s => s.id !== stage.id)
                if (otherStages.filter(s => s.DeviceGroups?.length).length) {
                    throw new PipelineControllerError('invalid_input', 'A Device Group can only set on the last stage', 400)
                }

                if (lastStage && lastStage.id !== stage.id) {
                    throw new PipelineControllerError('invalid_input', 'A Device Group can only set on the last stage', 400)
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

            if (options.instanceId) {
                await stage.addInstanceId(options.instanceId)
            } else if (options.deviceId) {
                await stage.addDeviceId(options.deviceId)
            } else if (options.deviceGroupId) {
                await stage.addDeviceGroupId(options.deviceGroupId)
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
        const idCount = [options.instanceId, options.deviceId, options.deviceGroupId].filter(id => !!id).length
        if (idCount > 1) {
            throw new PipelineControllerError('invalid_input', 'Cannot add a pipeline stage with a mixture of instance, device or device group. Only one is permitted', 400)
        } else if (idCount === 0) {
            throw new PipelineControllerError('invalid_input', 'An instance, device or device group is required when creating a new pipeline stage', 400)
        }

        let source
        options.PipelineId = pipeline.id
        if (options.source) {
            // this gives us the input stage to this new stage.
            // we store "targets", so need to update the source to point to this new stage
            source = options.source
            delete options.source
        }

        // before we create the stage, we need to check a few things
        // if this is being added as a device group, check all stages.
        // * A device group cannot be the first stage
        // * There can be only one device group and it can only be the last stage
        if (options.deviceGroupId) {
            const stages = await pipeline.stages()
            const stageCount = stages.length
            if (stageCount === 0) {
                throw new PipelineControllerError('invalid_input', 'A Device Group cannot be the first stage', 400)
            } else if (stages.filter(s => s.DeviceGroups?.length).length) {
                throw new PipelineControllerError('invalid_input', 'Only one Device Group can only set in a pipeline', 400)
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
            transaction.rollback()
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
        const totalSources = sourceInstances.length + sourceDevices.length
        if (totalSources === 0) {
            throw new PipelineControllerError('invalid_stage', 'Source stage must have at least one instance or device', 400)
        }
        if (totalSources > 1) {
            throw new PipelineControllerError('invalid_stage', 'Deployments are currently only supported for source stages with a single instance or device', 400)
        }

        const targetInstances = await targetStage.getInstances()
        const targetDevices = await targetStage.getDevices()
        const targetDeviceGroups = await targetStage.getDeviceGroups()
        const totalTargets = targetInstances.length + targetDevices.length + targetDeviceGroups.length

        if (totalTargets === 0) {
            throw new PipelineControllerError('invalid_stage', 'Target stage must have at least one instance, device or device group', 400)
        } else if (targetInstances.length > 1) {
            throw new PipelineControllerError('invalid_stage', 'Deployments are currently only supported for target stages with a single instance, device or device group', 400)
        }

        const sourceInstance = sourceInstances[0]
        const targetInstance = targetInstances[0]

        const sourceDevice = sourceDevices[0]
        const targetDevice = targetDevices[0]
        const targetDeviceGroup = targetDeviceGroups[0]

        const sourceObject = sourceInstance || sourceDevice
        const targetObject = targetInstance || targetDevice || targetDeviceGroup

        const sourceType = sourceInstance ? 'instance' : (sourceDevice ? 'device' : '')
        const targetType = targetInstance ? 'instance' : (targetDevice ? 'device' : (targetDeviceGroup ? 'device group' : ''))

        const sourceApplication = await app.db.models.Application.byId(sourceObject.ApplicationId)
        const targetApplication = await app.db.models.Application.byId(targetObject.ApplicationId)
        if (!sourceApplication || !targetApplication) {
            throw new PipelineControllerError('invalid_stage', `Source ${sourceType} and target ${targetType} must be associated with an application`, 400)
        }
        if (sourceApplication.id !== targetApplication.id || sourceApplication.TeamId !== targetApplication.TeamId) {
            throw new PipelineControllerError('invalid_stage', `Source ${sourceType} and target ${targetType} must be associated with in the same team application`, 400)
        }

        if (targetDevice && targetDevice.mode === 'developer') {
            throw new PipelineControllerError('invalid_target_stage', 'Target device cannot not be in developer mode', 400)
        }

        return { sourceInstance, targetInstance, sourceDevice, targetDevice, targetDeviceGroup, targetStage }
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
                    decryptAndReEncryptCredentialsSecret: await sourceSnapshot.getCredentialSecret(),
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
     * @param {Object} user - The user performing the deploy
     * @returns {Promise<Function>} - Resolves with the deploy is complete
     */
    deploySnapshotToDevice: async function (app, sourceSnapshot, targetDevice, deployMeta = { user: null }) {
        // Only used for reporting and logging, should not be used for any logic
        const { user } = deployMeta

        try {
            // store original value for later audit log
            const originalSnapshotId = targetDevice.targetSnapshotId

            // Update the targetSnapshot of the device
            await targetDevice.update({ targetSnapshotId: sourceSnapshot.id })

            await app.auditLog.Application.application.device.snapshot.deviceTargetSet(user, null, targetDevice.Application, targetDevice, sourceSnapshot)

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
                transaction.commit()
            } catch (error) {
                // rollback the transaction
                transaction.rollback()
                throw error
            }

            // TODO: implement device audit logs
            // const updates = new app.auditLog.formatters.UpdatesCollection()
            // updates.push('targetSnapshotId', originalSnapshotId, targetDeviceGroup.targetSnapshotId)
            // await app.auditLog.Team.team.device.updated(user, null, targetDeviceGroup.Team, targetDeviceGroup, updates)

            await app.db.controllers.DeviceGroup.sendUpdateCommand(targetDeviceGroup)
        } catch (err) {
            throw new PipelineControllerError('unexpected_error', `Error during deploy: ${err.toString()}`, 500, { cause: err })
        }
    }
}
