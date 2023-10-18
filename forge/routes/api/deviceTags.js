/**
 * Device Tag api routes
 *
 * - /api/v1/device/:deviceId/tags
 *
 * @namespace application
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    // ### Routes in this file
    // GET /api/v1/devices/:deviceId/tags/list - Get a list of tags usable by this device
    // GET /api/v1/devices/:deviceId/tags - list tags assigned to a device
    // POST /api/v1/devices/:deviceId/tags - add a device tag
    // > body: { tagTypeId, name, [description, color, icon }
    // PUT /api/v1/devices/:deviceId/tags/:tagId - update a device tag
    // > body: { tagTypeId, name, [description, color, icon }
    // GET /api/v1/devices/:deviceId/tags/:tagId - get a single tag assigned to a device
    // PATCH /api/v1/devices/:deviceId/tags:tagId - assign a tag to a device
    // DELETE /api/v1/devices/:deviceId/tags/:tagId - unassign a tag from a device
    // Tag deletion is handled by the DELETE /api/v1/tags/:tagId route

    /**
     * Get a list of tags usable by this device
     * @name /api/v1/devices/:deviceId/tags
     * @method GET
     * @memberof forge.routes.api.devices
     */
    app.get('/list', {
        // preHandler: app.needsPermission('device:tags:list-all') // TODO: generate permission
        // schema: { } // FUTURE: when api is stable and ready to be documented
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)

        const teamId = request.device.TeamId
        const applicationId = request.device.ApplicationId
        const tags = await app.db.models.Tag.forDevice(teamId, applicationId, paginationOptions)

        const result = app.db.views.Tag.applicationTagsList(tags?.tags || [])
        reply.send({
            meta: {}, // For future pagination
            count: result.length,
            tags: result
        })
    })

    /**
     * Get a list of tags assigned to this device
     * @name /api/v1/devices/:deviceId/tags
     * @method GET
     * @memberof forge.routes.api.team
     */
    app.get('/', {
        // preHandler: app.needsPermission('device:tags:list') // TODO: generate permission
        // schema: { } // FUTURE: when api is stable and ready to be documented
    }, async (request, reply) => {
        const tags = await app.db.models.Tag.assignedToDevice(request.device.id)
        const result = app.db.views.Tag.deviceTagsList(tags)
        reply.send({
            meta: {}, // For future pagination
            count: result.length,
            tags: result
        })
    })

    /**
     * Add a device tag
     * NOTES:
     * - Tags created in this way are always scoped to the team and application of the device
     * - Currently, only devices assigned to an application can have tags
     * @name /api/v1/devices/:deviceId/tags
     * @method POST
     * @memberof forge.routes.api.devices
     */
    app.post('/', {
        // preHandler: app.needsPermission('device:tags:create') // TODO: generate permission
        // schema: { } // FUTURE: when api is stable and ready to be documented
    }, async (request, reply) => {
        // ensure the device is assigned to an application
        if (!request.device.Application) {
            reply.code(400).send({ code: 'bad_request', error: 'Device is not assigned to an application' })
            return
        }

        // By default, tags created via this route are scoped to the team and application of the device
        const team = request.device.Team
        const application = request.device.Application

        // check the tag type exists
        const tagType = await app.db.models.TagType.byId(request.body.tagTypeId)
        if (!tagType) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }

        const tagName = request.body.name
        if (!tagName) {
            reply.code(400).send({ code: 'bad_request', error: 'Tag name is required' })
            return
        }
        const description = request.body.description
        const color = request.body.color
        const icon = request.body.icon

        const tag = await app.db.controllers.Tag.createDeviceTag(tagType, team, tagName, { application, description, color, icon })
        const tagView = app.db.views.Tag.tagSummary(tag)
        reply.send(tagView)
    })

    /**
     * Get a single tag assigned to a device
     * @name /api/v1/devices/:deviceId/tags/:tagId
     * @method GET
     * @memberof forge.routes.api.devices
     */
    app.get('/:tagId', {
        // preHandler: app.needsPermission('device:tags:get') // TODO: generate permission
        // schema: { } // FUTURE: when api is stable and ready to be documented
    }, async (request, reply) => {
        const tag = await app.db.models.Tag.byId(request.params.tagId)
        if (!tag) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        reply.send(app.db.views.Tag.tag(tag))
    })

    /**
     * Update a device tag
     * @name /api/v1/devices/:deviceId/tags/:tagId
     * @method PUT
     * @memberof forge.routes.api.devices
     */
    app.put('/:tagId', {
        // preHandler: app.needsPermission('device:tags:update') // TODO: generate permission
        // schema: { } // FUTURE: when api is stable and ready to be documented
    }, async (request, reply) => {
        const tag = await app.db.models.Tag.byId(request.params.tagId)
        if (!tag) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        const name = request.body.name || tag.name
        const description = request.body.description
        const color = request.body.color
        const icon = request.body.icon
        console.warn('calling updateDeviceTag', app.db.views.Tag.tagSummary(tag), { name, description, color, icon })
        const updatedTag = await app.db.controllers.Tag.updateDeviceTag(tag, { name, description, color, icon })
        const tagView = app.db.views.Tag.tagSummary(updatedTag)
        reply.send(tagView)
    })

    /**
     * Assign a tag to a device
     * @name /api/v1/devices/:deviceId/tags/manage
     * @method PATCH
     * @memberof forge.routes.api.devices
     */
    app.patch('/:tagId', {
        // preHandler: app.needsPermission('device:tags:assign') // TODO: generate permission
        // schema: { } // FUTURE: when api is stable and ready to be documented
    }, async (request, reply) => {
        const tag = await app.db.models.Tag.byId(request.params.tagId)

        if (!tag) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }

        // assignTagsToDevices will check the device and tag are compatible
        // it will throw if they are not
        await app.db.controllers.Tag.assignTagsToDevices([tag], [request.device])

        reply.send({})
    })

    /**
     * Unassign a tag from a device
     * @name /api/v1/devices/:deviceId/tags/manage
     * @method DELETE
     * @memberof forge.routes.api.devices
     */
    app.delete('/:tagId', {
        // preHandler: app.needsPermission('device:tags:unassign') // TODO: generate permission
        // schema: { } // FUTURE: when api is stable and ready to be documented
    }, async (request, reply) => {
        const tag = await app.db.models.Tag.byId(request.params.tagId)
        if (!tag) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        await app.db.controllers.Tag.removeTagsFromDevices([tag], [request.device])

        reply.send({})
    })
}
