/**
 * Application DeviceGroup api routes
 *
 * - /api/v1/applications/:applicationId/devicegroups
 *
 * @namespace application
 * @memberof forge.routes.api
 */

const { registerPermissions } = require('../../lib/permissions')
const { Roles } = require('../../lib/roles.js')

/**
 * @param {import('../../forge.js').ForgeApplication} app The application instance
 */
module.exports = async function (app) {
    // ### Routes in this file
    // GET   /api/v1/applications/:applicationId/devicegroups
    //       - get a list of devicegroups in this application
    // POST  /api/v1/applications/:applicationId/devicegroups
    //       - add a new Device Group to an Application
    //       > body: { name, [description] }
    // PUT   /api/v1/applications/:applicationId/devicegroups/:groupId
    //       - update a device group settings
    //       > body: { name, [description] }
    // GET   /api/v1/applications/:applicationId/devicegroups/:groupId
    //       - get a specific deviceGroup (must be assigned to this application)
    // PATCH /api/v1/applications/:applicationId/devicegroups/:groupId
    //       - update Device Group membership
    //       > OPTION1: body: { add: [deviceIds], remove: [deviceIds] }
    //       > OPTION2: body: { set: [deviceIds] }
    // DELETE /api/v1/applications/:applicationId/devicegroups/:groupId
    //       - delete app owned deviceGroup

    registerPermissions({
        'application:devicegroup:create': { description: 'Create a device group', role: Roles.Owner },
        'application:devicegroup:list': { description: 'List device groups', role: Roles.Member },
        'application:devicegroup:update': { description: 'Update a device group', role: Roles.Owner },
        'application:devicegroup:delete': { description: 'Delete a device group', role: Roles.Owner },
        'application:devicegroup:read': { description: 'View a device group', role: Roles.Member },
        'application:devicegroup:membership:update': { description: 'Update a device group membership', role: Roles.Owner }
    })

    // pre-handler for all routes in this file
    app.addHook('preHandler', async (request, reply) => {
        // get the device group
        const groupId = request.params.groupId
        if (groupId) {
            request.deviceGroup = await app.db.models.DeviceGroup.byId(groupId)
            if (!request.deviceGroup || request.deviceGroup.ApplicationId !== request.application.id) {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })

    /**
     * Get a list of device groups in an application
     * @method GET
     * @name /api/v1/applications/:applicationId/devicegroups
     * @memberof forge.routes.api.application
     */
    app.get('/', {
        preHandler: app.needsPermission('application:devicegroup:list'),
        schema: {
            summary: 'Get a list of device groups in an application',
            tags: ['Applications'],
            query: { $ref: 'PaginationParams' },
            params: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        groups: { type: 'array', items: { $ref: 'DeviceGroupSummary' } }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const paginationOptions = app.db.controllers.Device.getDevicePaginationOptions(request)

        const where = {
            ApplicationId: request.application.hashid
        }

        const groupData = await app.db.models.DeviceGroup.getAll(paginationOptions, where)
        const result = {
            count: groupData.count,
            meta: groupData.meta,
            groups: (groupData.groups || []).map(d => app.db.views.DeviceGroup.deviceGroupSummary(d, { includeApplication: false }))
        }
        reply.send(result)
    })

    /**
     * Add a new Device Group to an Application
     * @method POST
     * @name /api/v1/applications/:applicationId/devicegroups
     * @memberof forge.routes.api.application
     */
    app.post('/', {
        preHandler: app.needsPermission('application:devicegroup:create'),
        schema: {
            summary: 'Add a new Device Group to an Application',
            tags: ['Applications'],
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' }
                },
                required: ['name']
            },
            params: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' }
                }
            },
            response: {
                201: {
                    $ref: 'DeviceGroupSummary'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const application = request.application
        const name = request.body.name
        const description = request.body.description

        const newGroup = await app.db.controllers.DeviceGroup.createDeviceGroup(name, { application, description })
        const newGroupView = app.db.views.DeviceGroup.deviceGroupSummary(newGroup)
        reply.code(201).send(newGroupView)
    })

    /**
     * Update a Device Group
     * @method PUT
     * @name /api/v1/applications/:applicationId/devicegroups/:groupId
     * @memberof forge.routes.api.application
     */
    app.put('/:groupId', {
        preHandler: app.needsPermission('application:devicegroup:update'),
        schema: {
            summary: 'Update a Device Group',
            tags: ['Applications'],
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' }
                }
            },
            params: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' },
                    groupId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    additionalProperties: false
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const group = request.deviceGroup
        const name = request.body.name
        const description = request.body.description

        await app.db.controllers.DeviceGroup.updateDeviceGroup(group, { name, description })
        reply.send({})
    })

    /**
     * Get a specific deviceGroup
     * @method GET
     * @name /api/v1/applications/:applicationId/devicegroups/:groupId
     * @memberof forge.routes.api.application
     */
    app.get('/:groupId', {
        preHandler: app.needsPermission('application:devicegroup:read'),
        schema: {
            summary: 'Get a specific deviceGroup',
            tags: ['Applications'],
            params: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' },
                    groupId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'DeviceGroup'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const group = request.deviceGroup // already loaded in preHandler
        const groupView = app.db.views.DeviceGroup.deviceGroup(group)
        reply.send(groupView)
    })

    /**
     * Update Device Group membership
     * @method PATCH
     * @name /api/v1/applications/:applicationId/devicegroups/:groupId
     * @memberof forge.routes.api.application
     */
    app.patch('/:groupId', {
        preHandler: app.needsPermission('application:devicegroup:membership:update'),
        schema: {
            summary: 'Update Device Group membership',
            tags: ['Applications'],
            body: {
                type: 'object',
                properties: {
                    add: { type: 'array', items: { type: 'string' } },
                    remove: { type: 'array', items: { type: 'string' } },
                    set: { type: 'array', items: { type: 'string' } }
                }
            },
            params: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' },
                    groupId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    additionalProperties: false
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const group = request.deviceGroup
        const addDevices = request.body.add
        const removeDevices = request.body.remove
        const setDevices = request.body.set
        try {
            await app.db.controllers.DeviceGroup.updateDeviceGroupMembership(group, { addDevices, removeDevices, setDevices })
            reply.send({})
        } catch (err) {
            return reply.code(err.statusCode || 500).send({
                code: err.code || 'unexpected_error',
                error: err.error || err.message
            })
        }
    })

    /**
     * Delete a Device Group
     * @method DELETE
     * @name /api/v1/applications/:applicationId/devicegroups/:groupId
     * @memberof forge.routes.api.application
     */
    app.delete('/:groupId', {
        preHandler: app.needsPermission('application:devicegroup:delete'),
        schema: {
            summary: 'Delete a Device Group',
            tags: ['Applications'],
            params: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' },
                    groupId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    additionalProperties: false
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const group = request.deviceGroup
        await group.destroy()
        reply.send({})
    })
}
