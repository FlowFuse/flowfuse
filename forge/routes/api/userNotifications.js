/**
 * User Notification api routes
 *
 * - /api/v1/user/notifications
 *
 * These routes all operate in the context of the logged-in user: req.session.User
 */
module.exports = async function (app) {
    app.addHook('preHandler', app.needsPermission('user:edit'))

    app.get('/', {
        schema: {
            summary: 'Get the notifications for a user',
            tags: ['User'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        notifications: { $ref: 'NotificationList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const notifications = await app.db.models.Notification.forUser(request.session.User, paginationOptions)
        notifications.notifications = app.db.views.Notification.notificationList(notifications.notifications)
        reply.send(notifications)
    })

    // Bulk update
    // app.put('/', {
    //     schema: {
    //         summary: 'Mark notifications as read',
    //         tags: ['User'],
    //         body: {
    //             type: 'object',
    //             properties: {
    //                 id: { type: 'string' },
    //                 read: { type: 'boolean' }
    //             }
    //         },
    //         response: {
    //             200: {
    //                 $ref: 'APIStatus'
    //             },
    //             '4xx': {
    //                 $ref: 'APIError'
    //             }
    //         }
    //     }
    // }, async (request, reply) => {
    // })

    // Bulk delete
    // app.delete('/', {
    //     schema: {
    //         summary: 'Delete notifications',
    //         tags: ['User'],
    //         body: {
    //             type: 'object',
    //             properties: {
    //                 id: { type: 'string' }
    //             }
    //         },
    //         response: {
    //             200: {
    //                 $ref: 'APIStatus'
    //             },
    //             '4xx': {
    //                 $ref: 'APIError'
    //             }
    //         }
    //     }
    // }, async (request, reply) => {
    // })

    // Update notification
    app.put('/:notificationId', {
        schema: {
            summary: 'Mark notification as read',
            tags: ['User'],
            params: {
                type: 'object',
                properties: {
                    notificationId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    read: { type: 'boolean' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const notification = await app.db.models.Notification.byId(request.params.notificationId, request.session.User)
        if (notification) {
            notification.read = request.body.read
            await notification.save()
            reply.send({ status: 'okay' })
            return
        }
        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
    })

    // Delete notification
    app.delete('/:notificationId', {
        schema: {
            summary: 'Delete notifications',
            tags: ['User'],
            params: {
                type: 'object',
                properties: {
                    notificationId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const notification = await app.db.models.Notification.byId(request.params.notificationId, request.session.User)
        if (notification) {
            await notification.destroy()
            reply.send({ status: 'okay' })
            return
        }
        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
    })
}
