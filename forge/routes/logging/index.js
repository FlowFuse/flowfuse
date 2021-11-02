/** Node-RED Audit Logging backend
 *
 * - /audit
 * 
 * @namespace audit
 * @memberof forge.loggin
 */

module.exports = async function (app) {
	
	app.post('/:id/audit', async(request, response) => {
    let id = request.params.id;
    let auditEvent = request.body;

    let user;
    if (auditEvent.user) {
      user = await app.db.models.User.byUsername(auditEvent.user.username);
    }

    let event = await app.db.models.AuditLog.create({body: JSON.stringify(auditEvent.event)});

    event.ProjectId = id;
    if (user) {
      event.setUser(user);
    }
    await event.save();

    response.status(200).send();
	})
}