/** Node-RED Audit Logging backend
 *
 * - /audit
 *
 * @namespace audit
 * @memberof forge.logging
 */

module.exports = async function (app) {

    app.addHook('preHandler',app.verifyToken);

    app.post('/:projectId/audit', async(request, response) => {
        let projectId = request.params.projectId;
        let auditEvent = request.body;

        const event = auditEvent.event;
        const userId = auditEvent.user?app.db.models.User.decodeHashid(auditEvent.user):undefined

        delete auditEvent.event;
        delete auditEvent.user;
        delete auditEvent.path;
        delete auditEvent.timestamp;

        await app.db.controllers.AuditLog.projectLog(
            projectId,
            userId,
            event,
            auditEvent
        )
        response.status(200).send();
    })
}
