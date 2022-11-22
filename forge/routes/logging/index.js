/** Node-RED Audit Logging backend
 *
 * - /audit
 *
 * @namespace audit
 * @memberof forge.logging
 */

module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, response) => {
        // The request has a valid token, but need to check the token is allowed
        // to access the project

        const id = request.params.projectId
        // Check if the project exists first
        const project = await app.db.models.Project.byId(id)
        if (project && request.session.ownerType === 'project' && request.session.ownerId === id) {
            // Project exists and the auth token is for this project
            return
        }
        response.status(404).send({ code: 'not_found', error: 'Not Found' })
    })
    app.post('/:projectId/audit', async (request, response) => {
        const projectId = request.params.projectId
        const auditEvent = request.body

        const event = auditEvent.event
        const userId = auditEvent.user ? app.db.models.User.decodeHashid(auditEvent.user) : undefined

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
        response.status(200).send()
    })
}
