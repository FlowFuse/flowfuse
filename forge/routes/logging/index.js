const { getLoggers: getDeviceLogger } = require('../../auditLog/device')
const { getLoggers: getProjectLogger } = require('../../auditLog/project')

/** Node-RED Audit Logging backend
 *
 * - /audit
 *
 * @namespace audit
 * @memberof forge.logging
 */

module.exports = async function (app) {
    const deviceAuditLogger = getDeviceLogger(app)
    const projectAuditLogger = getProjectLogger(app)
    /** @type {import('../../db/controllers/AuditLog')} */
    const auditLogController = app.db.controllers.AuditLog

    app.addHook('preHandler', app.verifySession)

    /**
     * Post route for node-red _cloud_ instance audit log events
     * @method POST
     * @name /logging/:projectId/audit
     * @memberof forge.routes.logging
     */
    app.post('/:projectId/audit', {
        preHandler: async (request, response) => {
            // The request has a valid token, but need to check the token is allowed
            // to access the project

            const id = request.params.projectId
            // Check if the project exists first
            const project = await app.db.models.Project.byId(id)
            if (project && request.session.ownerType === 'project' && request.session.ownerId === id) {
                // Project exists and the auth token is for this project
                request.project = project
                return
            }
            response.status(404).send({ code: 'not_found', error: 'Not Found' })
        }
    },
    async (request, response) => {
        const projectId = request.params.projectId
        const auditEvent = request.body
        const event = auditEvent.event
        const error = auditEvent.error
        const userId = auditEvent.user ? app.db.models.User.decodeHashid(auditEvent.user) : undefined

        // first check to see if the event is a known structured event
        if (event === 'start-failed') {
            await projectAuditLogger.project.startFailed(userId || 'system', error, { id: projectId })
        } else {
            // otherwise, just log it
            delete auditEvent.event
            delete auditEvent.user
            delete auditEvent.path
            delete auditEvent.timestamp

            await auditLogController.projectLog(
                projectId,
                userId,
                event,
                auditEvent
            )
        }
        if (event === 'nodes.install' && !error) {
            await app.db.controllers.Project.addProjectModule(request.project, auditEvent.module, auditEvent.version)
        } else if (event === 'nodes.remove' && !error) {
            await app.db.controllers.Project.removeProjectModule(request.project, auditEvent.module)
        } else if (event === 'modules.install' && !error) {
            await app.db.controllers.Project.addProjectModule(request.project, auditEvent.module, auditEvent.version || '*')
        } else if (event === 'crashed' || event === 'safe-mode') {
            if (app.config.features.enabled('emailAlerts')) {
                await app.auditLog.alerts.generate(projectId, event)
            }
        }

        response.status(200).send()
    })

    /**
     * Post route for node_red device audit log events
     * @method POST
     * @name /logging/device/:deviceId/audit
     * @memberof forge.routes.logging
     */
    app.post('/device/:deviceId/audit', {
        preHandler: async (request, response) => {
            // The request has a valid token, but need to check the token is allowed
            // to access the device
            const id = request.params.deviceId
            // Check if the device exists first
            const device = await app.db.models.Device.byId(id)
            if (device && request.session.ownerType === 'device' && +request.session.ownerId === device.id) {
                // device exists and the auth token is for this device
                request.device = device
                return
            }
            response.status(404).send({ code: 'not_found', error: 'Not Found' })
        }
    }, async (request, response) => {
        const deviceId = request.params.deviceId
        const auditEvent = request.body
        const event = auditEvent.event
        const error = auditEvent.error
        const userId = auditEvent.user ? app.db.models.User.decodeHashid(auditEvent.user) : undefined

        // first check to see if the event is a known structured event
        if (event === 'start-failed') {
            await deviceAuditLogger.device.startFailed(userId || 'system', error, { id: deviceId })
        } else {
            // otherwise, just log it
            delete auditEvent.event
            delete auditEvent.user
            delete auditEvent.path
            delete auditEvent.timestamp

            await auditLogController.deviceLog(
                request.device.id,
                userId,
                event,
                auditEvent
            )
        }

        response.status(200).send()
    })
}
