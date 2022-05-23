/**
 * Device Live api routes
 *
 * These are the routes devices use to report/get their status.
 *
 * request.device will be defined for any route defined in here
 *
 * - /api/v1/project/:deviceId/live/
 *
 * @namespace device
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    // app.addHook('preHandler', (request, reply, done) => {
    //     // check accessToken is device scope
    //     if (request.session.ownerType !== 'device') {
    //         reply.code(401).send({ error: 'unauthorised' })
    //     } else {
    //         done()
    //     }
    // })

    /**
     * Devices post to /state at regular intervals. This acts as a heartbeat.
     * The payload should include:
     * {
     *    snapshot: 'xyz'
     * }
     *
     * The response will be a 200 if all is well.
     * If the snapshot doesn't match the target, it will get a 409 (conflict)
     */
    app.post('/state', async (request, reply) => {
        await app.db.controllers.Device.updateState(request.device, request.body)
        if (request.body.snapshot !== request.device.targetSnapshot?.hashid) {
            reply.code(409).send({
                error: 'incorrect-snapshot',
                snapshot: request.device.targetSnapshot?.hashid || null
            })
            return
        }
        reply.code(200).send({})
    })

    app.get('/state', async (request, reply) => {
        reply.send({
            snapshot: request.device.targetSnapshot?.hashid || null
        })
    })

    app.get('/snapshot', async (request, reply) => {
        if (!request.device.targetSnapshot) {
            reply.send({})
        } else {
            const snapshot = await app.db.models.ProjectSnapshot.byId(request.device.targetSnapshot.id)
            if (snapshot) {
                reply.send({
                    id: request.device.targetSnapshot.hashid,
                    ...snapshot.settings,
                    ...snapshot.flows
                })
            } else {
                reply.send({})
            }
        }
    })
}
