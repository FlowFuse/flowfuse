/**
 * Tag api routes (Admin-only)
 *
 * - /api/v1/tags
 * @namespace tags
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    // app.addHook('preHandler', app.needsPermission('all:tag:edit')) // TODO: add permissions - ADMIN ONLY at this level

    // ### Routes in this file
    // GET /api/v1/tags/types - Get a list of tagTypes
    // POST /api/v1/tags/type - create a tagType (MVP - need to be able to add a "device" TagType for the "Device Group" tag)
    // > body: { name, model, [description] }
    // > validate model is one of the allowed values: 'device', 'application', 'team' (MVP: 'device)
    // GET /api/v1/tags/list - Get a list of tags
    // GET /api/v1/tags/tag/:tagId - get a single tag
    // DELETE /api/v1/tags/tag/:tagId - delete a tag
    // ### FUTURE:
    // POST /api/v1/tags/tag - create a tag
    // > body: { tagTypeId, teamId, name, [applicationId, description, color, icon }
    // PUT /api/v1/tags/tag/:tagId - update a tag
    // > body: { tagTypeId, teamId, name, [applicationId, description, color, icon }

    // GET /api/v1/tag/types - Get a list of tagTypes
    /**
     * Get a list of all tagTypes
     * @name /api/v1/tags/types
     * @method GET
     */
    app.get('/types', async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const tagTypeData = await app.db.models.TagType.getAll(paginationOptions, {})
        const tagTypes = tagTypeData.types || []
        const tagTypeSummaryList = tagTypes.map(app.db.views.TagType.tagTypeSummary)
        reply.send({
            meta: {}, // For future pagination
            count: tagTypeSummaryList.length,
            tagTypes: tagTypeSummaryList
        })
    })

    /**
     * Create a TagType
     * @name /api/v1/tags/type
     * @method POST
     * @memberof forge.routes.api.tags
     */
    app.post('/type', async (request, reply) => {
        const { name, model, description } = request.body
        if (!name || !model) {
            reply.code(400).send({ code: 'bad_request', error: 'Missing required fields' })
            return
        }
        if (!['device', 'application', 'team'].includes(model)) {
            reply.code(400).send({ code: 'bad_request', error: 'Invalid model' })
            return
        }
        const tagType = await app.db.models.TagType.create({
            name,
            model,
            description
        })
        reply.send(app.db.views.TagType.tagTypeSummary(tagType))
    })

    /**
     * Get a list of all tags
     * @name /api/v1/tags/tags
     * @method GET
     * @memberof forge.routes.api.tags
     */
    app.get('/tags', async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const tagData = await app.db.models.Tag.getAll(paginationOptions, {}, null)
        const tags = tagData.tags || []
        const tagSummaryList = tags.map(app.db.views.Tag.tagSummary)
        reply.send({
            meta: {}, // For future pagination
            count: tagSummaryList.length,
            tags: tagSummaryList
        })
    })

    /**
     * Get a single tag
     * @name /api/v1/tags/tag/:tagId
     * @method GET
     * @memberof forge.routes.api.tags
     */
    app.get('/tag/:tagId', async (request, reply) => {
        const tag = await app.db.models.Tag.byId(request.params.tagId)
        if (!tag) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        reply.send(app.db.views.Tag.tagSummary(tag))
    })

    /**
     * Delete a tag
     * @name /api/v1/tags/tag/:tagId
     * @method DELETE
     * @memberof forge.routes.api.tags
     */
    app.delete('/tag/:tagId', async (request, reply) => {
        const tag = await app.db.models.Tag.byId(request.params.tagId)
        if (!tag) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        await tag.destroy()
        reply.send({})
    })
}
