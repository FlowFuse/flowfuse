const crypto = require('crypto')
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
                    result.credentials = recryptCreds(result.credentials, projectSecret, deviceSecret)
                }
                reply.send(result)
            } else {
                reply.send({})
            }
        }
    })
}

// TODO: These are getting copied around way too much. Need to be centralised.
function recryptCreds (original, oldKey, newKey) {
    const newHash = crypto.createHash('sha256').update(newKey).digest()
    const oldHash = crypto.createHash('sha256').update(oldKey).digest()
    return encryptCreds(newHash, decryptCreds(oldHash, original))
}

function decryptCreds (key, cipher) {
    let flows = cipher.$
    const initVector = Buffer.from(flows.substring(0, 32), 'hex')
    flows = flows.substring(32)
    const decipher = crypto.createDecipheriv('aes-256-ctr', key, initVector)
    const decrypted = decipher.update(flows, 'base64', 'utf8') + decipher.final('utf8')
    return JSON.parse(decrypted)
}

function encryptCreds (key, plain) {
    const initVector = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-ctr', key, initVector)
    return { $: initVector.toString('hex') + cipher.update(JSON.stringify(plain), 'utf8', 'base64') + cipher.final('base64') }
}
