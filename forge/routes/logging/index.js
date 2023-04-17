const { getLoggers } = require('../../auditLog/project')

/** Node-RED Audit Logging backend
 *
 * - /audit
 *
 * @namespace audit
 * @memberof forge.logging
 */

module.exports = async function (app) {
    const logger = getLoggers(app)
    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, response) => {
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
    })
    app.post('/:projectId/audit', async (request, response) => {
        const projectId = request.params.projectId
        const auditEvent = request.body
        const event = auditEvent.event
        const error = auditEvent.error
        const userId = auditEvent.user ? app.db.models.User.decodeHashid(auditEvent.user) : undefined

        // first check to see if the event is a known structured event
        if (event === 'start-failed') {
            await logger.project.startFailed(userId || 'system', error, { id: projectId })
        } else {
            // otherwise, just log it
            delete auditEvent.event
            delete auditEvent.user
            delete auditEvent.path
            delete auditEvent.timestamp

            await app.db.controllers.AuditLog.projectLog(
                projectId,
                userId,
                event,
                auditEvent
            )
        }
        if (event === 'nodes.install') {
            await app.db.controllers.Project.addProjectModule(request.project, auditEvent.module, auditEvent.version)
        } else if (event === 'nodes.remove') {
            await app.db.controllers.Project.removeProjectModule(request.project, auditEvent.module)
        }
        response.status(200).send()
    })
}
