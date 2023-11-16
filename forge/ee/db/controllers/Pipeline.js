const { ControllerError } = require('../../../lib/errors')

const { createSnapshot, copySnapshot, generateDeploySnapshotDescription, generateDeploySnapshotName } = require('../../../services/snapshots')
class PipelineControllerError extends ControllerError {
    constructor (...args) {
        super(...args)
        this.name = 'PipelineControllerError'
    }
}

module.exports = {
    addPipelineStage: async function (app, pipeline, options) {
        if (!options.instanceId) {
            throw new Error('Param instanceId is required when creating a new pipeline stage')
        }

        let source
        options.PipelineId = pipeline.id
        if (options.source) {
            // this gives us the input stage to this new stage.
            // we store "targets", so need to update the source to point to this new stage
            source = options.source
            delete options.source
        }
        const stage = await app.db.models.PipelineStage.create(options)

        // TODO: Add logic to set one or other or both
        await stage.addInstanceId(options.instanceId)
        await stage.addDeviceId(options.deviceId)

        if (source) {
            const sourceStage = await app.db.models.PipelineStage.byId(source)
            sourceStage.NextStageId = stage.id
            await sourceStage.save()
        }

        return stage
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
        const totalTargets = targetInstances.length + targetDevices.length
        if (totalTargets === 0) {
            throw new PipelineControllerError('invalid_stage', 'Target stage must have at least one instance or device', 400)
        } else if (targetInstances.length > 1) {
            throw new PipelineControllerError('invalid_stage', 'Deployments are currently only supported for target stages with a single instance or device', 400)
        }

        const sourceInstance = sourceInstances[0]
        const targetInstance = targetInstances[0]

        const sourceDevice = sourceDevices[0]
        const targetDevice = targetDevices[0]

        const sourceObject = sourceInstance || sourceDevice
        const targetObject = targetInstance || targetDevice

        sourceObject.Team = await app.db.models.Team.byId(sourceObject.TeamId)
        if (!sourceObject.Team) {
            throw new PipelineControllerError('invalid_stage', `Source ${sourceInstance ? 'instance' : 'device'} not associated with a team`, 404)
        }

        targetObject.Team = await app.db.models.Team.byId(targetObject.TeamId)
        if (!targetObject.Team) {
            throw new PipelineControllerError('invalid_stage', `Source ${sourceInstance ? 'instance' : 'device'} not associated with a team`, 404)
        }

        if (sourceObject.TeamId !== targetObject.TeamId) {
            throw new PipelineControllerError('invalid_stage', `Source ${sourceInstance ? 'instance' : 'device'} and target ${targetInstance ? 'instance' : 'device'} must be in the same team`, 403)
        }

        return { sourceInstance, targetInstance, sourceDevice, targetDevice, targetStage }
    },

    getOrCreateSnapshotForSourceInstance: async function (app, pipeline, sourceStage, sourceInstance, sourceSnapshotId, user, targetStage) {
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
                throw new PipelineControllerError('no_source_snapshot', 'Source snapshot is required as deploy action is set to prompt for snapshot', 400)
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

        throw new PipelineControllerError('invalid_action', `Unsupported pipeline deploy action: ${sourceStage.action}`, 400)
    },

    getOrCreateSnapshotForSourceDevice: async function (app, pipeline, sourceStage, sourceDevice, sourceSnapshotId) {
        if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.USE_LATEST_SNAPSHOT) {
            const sourceSnapshot = await sourceDevice.getLatestSnapshot()
            if (!sourceSnapshot) {
                throw new PipelineControllerError('invalid_source_instance', 'No snapshots found for source stages device but deploy action is set to use latest snapshot', 400)
            }
            return sourceSnapshot
        }

        if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.CREATE_SNAPSHOT) {
            throw new PipelineControllerError('invalid_source_instance', 'When using a device as a source, create snapshot is not yet supported', 400)
        }

        if (sourceStage.action === app.db.models.PipelineStage.SNAPSHOT_ACTIONS.PROMPT) {
            if (!sourceSnapshotId) {
                throw new PipelineControllerError('no_source_snapshot', 'Source snapshot is required as deploy action is set to prompt for snapshot', 400)
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

        throw new PipelineControllerError('invalid_action', `Unsupported pipeline deploy action: ${sourceStage.action}`, 400)
    },

    deploySnapshotToInstance: function (app, pipeline, sourceStage, sourceSnapshot, targetInstance, sourceInstance, sourceDevice, user, targetStage) {
        const restartTargetInstance = targetInstance?.state === 'running'

        app.db.controllers.Project.setInflightState(targetInstance, 'importing')
        app.db.controllers.Project.setInDeploy(targetInstance)

        // Complete heavy work async
        return async function () {
            try {
                const setAsTargetForDevices = targetStage.deployToDevices ?? false
                const targetSnapshot = await copySnapshot(app, sourceSnapshot, targetInstance, {
                    importSnapshot: true, // target instance should import the snapshot
                    setAsTarget: setAsTargetForDevices,
                    decryptAndReEncryptCredentialsSecret: await sourceInstance.getCredentialSecret(),
                    targetSnapshotProperties: {
                        name: generateDeploySnapshotName(sourceSnapshot),
                        description: generateDeploySnapshotDescription(sourceStage, targetStage, pipeline, sourceSnapshot)
                    }
                })

                if (restartTargetInstance) {
                    await app.containers.restartFlows(targetInstance)
                }

                await app.auditLog.Project.project.imported(user.id, null, targetInstance, sourceInstance, sourceDevice) // technically this isn't a project event
                await app.auditLog.Project.project.snapshot.imported(user.id, null, targetInstance, sourceInstance, sourceDevice, targetSnapshot)

                app.db.controllers.Project.clearInflightState(targetInstance)
            } catch (err) {
                app.db.controllers.Project.clearInflightState(targetInstance)

                await app.auditLog.Project.project.imported(user.id, null, targetInstance, sourceInstance, sourceDevice) // technically this isn't a project event
                await app.auditLog.Project.project.snapshot.imported(user.id, err, targetInstance, sourceInstance, sourceDevice, null)

                throw PipelineControllerError('unexpected_error', `Error during deploy: ${err.toString()}`, 500, { cause: err })
            }
        }
    }
}
