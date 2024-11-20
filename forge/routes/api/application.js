const applicationShared = require('./shared/application.js')

module.exports = async function (app) {
    app.addHook('preHandler', applicationShared.defaultPreHandler.bind(null, app))

    /**
     * Create an application
     * @name /api/v1/applications
     * @memberof forge.routes.api.application
     */
    app.post('/', {
        preHandler: [
            async (request, reply) => {
                request.teamMembership = await request.session.User.getTeamMembership(request.body.teamId)
                if (!request.teamMembership) {
                    // This could be an admin who is allowed to create an application.
                    if (!request.session.User.admin) {
                        return reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                    } else {
                        // This is an admin
                        request.team = await app.db.models.Team.byId(request.body.teamId)
                    }
                } else {
                    request.team = await request.teamMembership.getTeam()
                }
                if (!request.team) {
                    return reply.code(409).send({ code: 'invalid_team', error: 'Invalid team id' })
                }
            },
            app.needsPermission('project:create') // TODO Using project level permissions
        ],
        schema: {
            summary: 'Create an application',
            tags: ['Applications'],
            body: {
                type: 'object',
                required: ['name', 'teamId'],
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    $ref: 'Application'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const team = request.team

        const name = request.body.name?.trim()
        if (name === '') {
            reply.status(409).type('application/json').send({ code: 'invalid_application_name', error: 'name must be set' })
            return
        }

        let application
        try {
            application = await app.db.models.Application.create({
                name,
                description: request.body.description,
                TeamId: team.id
            })
        } catch (err) {
            console.error(err)
            return reply.status(500).send({ code: 'unexpected_error', error: err.toString() })
        }

        await app.auditLog.Team.application.created(request.session.User, null, team, application)
        await app.auditLog.Application.application.created(request.session.User, null, application)

        reply.send(app.db.views.Application.application(application))
    })

    /**
     * Get the details of a given application
     * @name /api/v1/applications/:applicationId
     * @static
     * @memberof forge.routes.api.application
     */
    app.get('/:applicationId', {
        preHandler: app.needsPermission('project:read'), // TODO For now using project level permissions
        schema: {
            summary: 'Get the details of an application',
            tags: ['Applications'],
            params: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    $ref: 'Application'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        reply.send(app.db.views.Application.application(request.application))
    })

    /**
     * Update an application
     * @name /api/v1/applications/:id
     * @memberof forge.routes.api.application
     */
    app.put('/:applicationId', {
        preHandler: app.needsPermission('project:edit'), // TODO For now sharing project permissions
        schema: {
            summary: 'Update an application',
            tags: ['Applications'],
            params: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'Application'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const updates = new app.auditLog.formatters.UpdatesCollection()

        try {
            const reqName = request.body.name?.trim()
            const reqDescription = request.body.description?.trim()
            const currentName = request.application.name
            const currentDescription = request.application.description
            if (reqName !== currentName) {
                updates.push('name', request.application.name, reqName)
            }
            request.application.name = reqName
            if (reqDescription !== currentDescription) {
                updates.push('description', request.application.description, reqDescription)
            }
            request.application.description = reqDescription

            await request.application.save()
        } catch (error) {
            app.log.error('Error while updating application:')
            app.log.error(error)

            return reply.code(500).send({ code: 'unexpected_error', error: error.toString() })
        }

        const team = request.application.Team
        if (team) {
            await app.auditLog.Team.application.updated(request.session.User, null, team, request.application, updates)
        }
        await app.auditLog.Application.application.updated(request.session.User, null, request.application, updates)

        reply.send(app.db.views.Application.application(request.application))
    })

    /**
     * Delete a application
     * @name /api/v1/applications/:id
     * @memberof forge.routes.api.application
     */
    app.delete('/:applicationId', {
        preHandler: app.needsPermission('project:delete'), // TODO For now sharing project permissions
        schema: {
            summary: 'Delete an application',
            tags: ['Applications'],
            params: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            // TODO need to stop all project containers and delete the projects
            // For now, error if there are any projects
            if (await request.application.projectCount() > 0) {
                return reply.code(422).send({ code: 'invalid_application', error: 'Please delete the instances within the application first' })
            }

            await request.application.destroy()
            await app.auditLog.Team.application.deleted(request.session.User, null, request.application.Team, request.application)

            reply.send({ status: 'okay' })
        } catch (err) {
            reply.code(500).send({ code: 'unexpected_error', error: err.toString() })
        }
    })

    /**
     * List Application instances
     * @name /api/v1/applications/:id/instances
     * @memberof forge.routes.api.application
     */
    app.get('/:applicationId/instances', {
        // TODO: tidy up permissions
        preHandler: app.needsPermission('team:projects:list'),
        schema: {
            summary: 'Get a list of an applications instances',
            tags: ['Applications'],
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
                        // meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        instances: { $ref: 'InstanceSummaryList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // Settings needed to be able to include the project URL in the response
        const instances = await app.db.models.Project.byApplication(request.application.hashid, { includeSettings: true })
        if (instances) {
            let result = await app.db.views.Project.instancesSummaryList(instances)
            if (request.session.ownerType === 'project') {
                // This request is from a project token. Filter the list to return
                // the minimal information needed
                result = result.map(e => {
                    return { id: e.id, name: e.name, description: e.description }
                })
            }
            reply.send({
                count: result.length,
                instances: result
            })
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    /**
     * Get a list of devices owned by this application
     * @name /api/v1/applications/:id/devices
     * @static
     * @memberof forge.routes.api.application
     */
    app.get('/:applicationId/devices', {
        preHandler: app.needsPermission('team:device:list'),
        schema: {
            summary: 'Get a list of all devices in an application',
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
                        devices: { type: 'array', items: { $ref: 'Device' } }
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

        const devices = await app.db.models.Device.getAll(paginationOptions, where, { includeInstanceApplication: false, includeDeviceGroup: true })
        devices.devices = devices.devices.map(d => app.db.views.Device.device(d, { statusOnly: paginationOptions.statusOnly }))

        reply.send(devices)
    })

    /**
     * List Application instances statuses
     * @name /api/v1/applications/:id/instances/status
     * @memberof forge.routes.api.application
     */
    app.get('/:applicationId/instances/status', {
        // TODO: tidy up permissions
        preHandler: app.needsPermission('team:projects:list'),
        schema: {
            summary: 'Get a list of an applications instances status',
            tags: ['Applications'],
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
                        // meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        instances: { $ref: 'InstanceStatusList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // StorageFlows needed for last updated time
        const instances = await app.db.models.Project.byApplication(request.application.hashid, { includeStorageFlows: true })
        if (instances) {
            const instanceStatuses = await app.db.views.Project.instanceStatusList(instances)
            reply.send({
                count: instanceStatuses.length,
                instances: instanceStatuses
            })
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    /**
     * List All snapshots in an Application
     * @name /api/v1/applications/:id/snapshots
     * @memberof forge.routes.api.application
     */
    app.get('/:applicationId/snapshots', {
        // TODO: create application:snapshot:list OR consolidate "project:snapshot:list" with "device:snapshot:list"?
        preHandler: app.needsPermission('project:snapshot:list'),
        schema: {
            summary: 'Get a list of all snapshots in an Application',
            tags: ['Applications'],
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
                        // meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        snapshots: { type: 'array', items: { $ref: 'Snapshot' } },
                        application: { $ref: 'ApplicationSummary' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const applicationId = request.application?.hashid
        if (applicationId) {
            const paginationOptions = app.getPaginationOptions(request)
            const snapshots = await app.db.models.ProjectSnapshot.forApplication(applicationId, paginationOptions)
            snapshots.snapshots = snapshots.snapshots.map(s => app.db.views.ProjectSnapshot.snapshot(s))
            reply.send(snapshots)
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    /**
     * Get the application audit log
     * @name /api/v1/application/:applicationId/audit-log
     * @memberof forge.routes.api.project
     */
    app.get('/:applicationId/audit-log', {
        preHandler: app.needsPermission('application:audit-log'),
        schema: {
            summary: 'Get application audit event entries',
            tags: ['Applications'],
            query: {
                allOf: [
                    { $ref: 'PaginationParams' },
                    { $ref: 'AuditLogQueryParams' }
                ]
            },
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
                        log: { $ref: 'AuditLogEntryList' },
                        associations: {
                            type: 'object',
                            properties: {
                                applications: {
                                    type: 'array',
                                    items: { $ref: 'ApplicationSummary' }
                                },
                                instances: { $ref: 'InstanceSummaryList' },
                                devices: { $ref: 'DeviceSummaryList' }
                            }
                        }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const logEntries = await app.db.models.AuditLog.forApplication(request.application.id, paginationOptions)
        const result = app.db.views.AuditLog.auditLog(logEntries)
        reply.send(result)
    })

    /**
     * Get the application audit log
     * @name /api/v1/application/:applicationId/audit-log/export
     * @memberof forge.routes.api.project
     */
    app.get('/:applicationId/audit-log/export', {
        preHandler: app.needsPermission('application:audit-log'),
        schema: {
            summary: 'Get application audit event entries',
            tags: ['Applications'],
            query: {
                allOf: [
                    { $ref: 'PaginationParams' },
                    { $ref: 'AuditLogQueryParams' }
                ]
            },
            params: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' }
                }
            },
            response: {
                200: {
                    content: {
                        'text/csv': {
                            schema: {
                                type: 'string'
                            }
                        }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const logEntries = await app.db.models.AuditLog.forApplication(request.application.id, paginationOptions)
        const result = app.db.views.AuditLog.auditLog(logEntries)
        reply.type('text/csv').send([
            ['id', 'event', 'body', 'scope', 'trigger', 'createdAt'],
            ...result.log.map(row => [
                row.id,
                row.event,
                `"${row.body ? JSON.stringify(row.body).replace(/"/g, '""') : ''}"`,
                `"${JSON.stringify(row.scope).replace(/"/g, '""')}"`,
                `"${JSON.stringify(row.trigger).replace(/"/g, '""')}"`,
                row.createdAt?.toISOString()
            ])
        ]
            .map(row => row.join(','))
            .join('\r\n'))
    })
}
