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
    app.addHook('preHandler', (request, reply, done) => {
        if (request.session.ownerType !== 'device' || request.session.ownerId !== ('' + request.device.id)) {
            reply.code(401).send({ error: 'unauthorised' })
        } else {
            done()
        }
    })

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
        if (Object.hasOwn(request.body, 'project') && request.body.project !== (request.device.Project?.id || null)) {
            reply.code(409).send({
                error: 'incorrect-project',
                project: request.device.Project?.id || null,
                snapshot: request.device.targetSnapshot?.hashid || null,
                settings: request.device.settingsHash || null
            })
            return
        }
        if (request.body.snapshot !== (request.device.targetSnapshot?.hashid || null)) {
            reply.code(409).send({
                error: 'incorrect-snapshot',
                project: request.device.Project?.id || null,
                snapshot: request.device.targetSnapshot?.hashid || null,
                settings: request.device.settingsHash || null
            })
            return
        }
        if (request.body.settings !== undefined && request.body.settings !== (request.device.settingsHash || null)) {
            reply.code(409).send({
                error: 'incorrect-settings',
                project: request.device.Project?.id || null,
                settings: request.device.settingsHash || null,
                snapshot: request.device.targetSnapshot?.hashid || null
            })
            return
        }
        reply.code(200).send({})
    })

    app.get('/state', async (request, reply) => {
        reply.send({
            project: request.device.Project?.id || null,
            snapshot: request.device.targetSnapshot?.hashid || null,
            settings: request.device.settingsHash || null
        })
    })

    app.get('/snapshot', async (request, reply) => {
        if (!request.device.targetSnapshot) {
            reply.send({})
        } else {
            const snapshot = await app.db.models.ProjectSnapshot.byId(request.device.targetSnapshot.id)
            if (snapshot) {
                const result = {
                    id: request.device.targetSnapshot.hashid,
                    ...snapshot.settings,
                    ...snapshot.flows
                }
                if (result.credentials) {
                    // Need to re-encrypt these credentials from the Project secret
                    // to the Device secret
                    const projectSecret = await (await snapshot.getProject()).getCredentialSecret()
                    const deviceSecret = request.device.credentialSecret
                    result.credentials = app.db.controllers.Project.exportCredentials(result.credentials, projectSecret, deviceSecret)
                }
                reply.send(result)
            } else {
                reply.send({})
            }
        }
    })

    app.get('/settings', async (request, reply) => {
        const response = {
            hash: request.device.settingsHash,
            env: {}
        }
        const settings = await request.device.getAllSettings()
        Object.keys(settings).forEach(key => {
            if (key === 'env') {
                settings.env.forEach(envVar => {
                    response.env[envVar.name] = envVar.value
                })
            } else {
                response[key] = settings[key]
            }
        })
        reply.send(response)
    })
}
