/**
 * User Invitations api routes
 *
 * - /api/v1/user/invitations
 *
 * These routes all operate in the context of the logged-in user
 * req.session.User
 * @namespace userInvitations
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    app.addHook('preHandler', app.needsPermission('user:edit'))

    app.get('/', {
        schema: {
            summary: 'Get a list of the current users invitations',
            tags: ['User'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        invitations: { $ref: 'InvitationList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const invitations = await app.db.models.Invitation.forUser(request.session.User)
        const result = app.db.views.Invitation.invitationList(invitations)
        reply.send({
            meta: {}, // For future pagination
            count: result.length,
            invitations: result
        })
    })

    /**
     * Accept an invitation
     * PATCH [/api/v1/user/invitations]/:invitationId
     */
    app.patch('/:invitationId', {
        schema: {
            summary: 'Accept an invitation',
            tags: ['User'],
            params: {
                type: 'object',
                properties: {
                    invitationId: { type: 'string' }
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
        const invitation = await app.db.models.Invitation.byId(request.params.invitationId, request.session.User)
        if (invitation) {
            await app.db.controllers.Invitation.acceptInvitation(invitation, request.session.User)
            await app.auditLog.User.user.invitation.accepted(request.session.User, null)
            reply.send({ status: 'okay' })
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    /**
     * Reject an invitation
     * DELETE [/api/v1/user/invitations]/:invitationId
     */
    app.delete('/:invitationId', {
        schema: {
            summary: 'Reject an invitation',
            tags: ['User'],
            params: {
                type: 'object',
                properties: {
                    invitationId: { type: 'string' }
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
        const invitation = await app.db.models.Invitation.byId(request.params.invitationId, request.session.User)
        if (invitation) {
            await app.db.controllers.Invitation.rejectInvitation(invitation, request.session.User)
            await app.auditLog.User.user.invitation.deleted(request.session.User, null)
            reply.send({ status: 'okay' })
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })
}
