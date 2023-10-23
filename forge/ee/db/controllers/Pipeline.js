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
    }
}
