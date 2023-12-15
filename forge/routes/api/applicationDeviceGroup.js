/**
 * Application DeviceGroup api routes
 *
 * - /api/v1/applications/:applicationId/device-groups
 *
 * @namespace application
 * @memberof forge.routes.api
 */

const { ValidationError } = require('sequelize')

const { DeviceGroupMembershipValidationError } = require('../../db/controllers/DeviceGroup.js')
const { registerPermissions } = require('../../lib/permissions')
const { Roles } = require('../../lib/roles.js')

/**
 * @param {import('../../forge.js').ForgeApplication} app The application instance
 */
module.exports = async function (app) {
    registerPermissions({
        'application:device-group:create': { description: 'Create a device group', role: Roles.Owner },
        'application:device-group:list': { description: 'List device groups', role: Roles.Member },
        'application:device-group:update': { description: 'Update a device group', role: Roles.Owner },
        'application:device-group:delete': { description: 'Delete a device group', role: Roles.Owner },
        'application:device-group:read': { description: 'View a device group', role: Roles.Member },
        'application:device-group:membership:update': { description: 'Update a device group membership', role: Roles.Owner }
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
     * @name /api/v1/applications/:applicationId/device-groups
     * @memberof forge.routes.api.application
     */
    app.get('/', {
        preHandler: app.needsPermission('application:device-group:list'),
        schema: {
            summary: 'Get a list of device groups in an application',
            tags: ['Application Device Groups'],
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
     * @name /api/v1/applications/:applicationId/device-groups
     * @memberof forge.routes.api.application
     */
    app.post('/', {
        preHandler: app.needsPermission('application:device-group:create'),
        schema: {
            summary: 'Add a new Device Group to an Application',
            tags: ['Application Device Groups'],
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
        try {
            const newGroup = await app.db.controllers.DeviceGroup.createDeviceGroup(name, { application, description })
            const newGroupView = app.db.views.DeviceGroup.deviceGroupSummary(newGroup)
            reply.code(201).send(newGroupView)
        } catch (error) {
            return handleError(error, reply)
        }
    })

    /**
     * Update a Device Group
     * @method PUT
     * @name /api/v1/applications/:applicationId/device-groups/:groupId
     * @memberof forge.routes.api.application
     */
    app.put('/:groupId', {
        preHandler: app.needsPermission('application:device-group:update'),
        schema: {
            summary: 'Update a Device Group',
            tags: ['Application Device Groups'],
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
        try {
            await app.db.controllers.DeviceGroup.updateDeviceGroup(group, { name, description })
            reply.send({})
        } catch (error) {
            return handleError(error, reply)
        }
    })

    /**
     * Get a specific Device Group
     * @method GET
     * @name /api/v1/applications/:applicationId/device-groups/:groupId
     * @memberof forge.routes.api.application
     */
    app.get('/:groupId', {
        preHandler: app.needsPermission('application:device-group:read'),
        schema: {
            summary: 'Get a specific Device Group',
            tags: ['Application Device Groups'],
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
     * @name /api/v1/applications/:applicationId/device-groups/:groupId
     * @memberof forge.routes.api.application
     */
    app.patch('/:groupId', {
        preHandler: app.needsPermission('application:device-group:membership:update'),
        schema: {
            summary: 'Update Device Group membership',
            tags: ['Application Device Groups'],
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
            return handleError(err, reply)
        }
    })

    /**
     * Delete a Device Group
     * @method DELETE
     * @name /api/v1/applications/:applicationId/device-groups/:groupId
     * @memberof forge.routes.api.application
     */
    app.delete('/:groupId', {
        preHandler: app.needsPermission('application:device-group:delete'),
        schema: {
            summary: 'Delete a Device Group',
            tags: ['Application Device Groups'],
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

    function handleError (err, reply) {
        let statusCode = 500
        let code = 'unexpected_error'
        let error = err.error || err.message || 'Unexpected error'
        if (err instanceof ValidationError) {
            statusCode = 400
            if (err.errors[0]) {
                code = err.errors[0].path ? `invalid_${err.errors[0].path}` : 'invalid_input'
                error = err.errors[0].message || error
            } else {
                code = 'invalid_input'
                error = err.message || error
            }
        } else if (err instanceof DeviceGroupMembershipValidationError) {
            statusCode = err.statusCode || 400
            code = err.code || 'invalid_device_group_membership'
            error = err.message || error
        } else {
            app.log.error('API error in application device groups:')
            app.log.error(err)
        }
        return reply.code(statusCode).type('application/json').send({ code, error })
    }
}
