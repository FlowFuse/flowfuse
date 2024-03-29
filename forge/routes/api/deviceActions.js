// Declare helper functions to provide type hints / quick code nav / code completion
/** @type {import('../../auditLog/device').getLoggers} */
const getDeviceLogger = (app) => { return app.auditLog.Device }
/** @type {typeof import('../../comms/devices.js').DeviceCommsHandler} */
const getDeviceComms = (app) => { return app.comms?.devices }

/**
 * Device Action api routes
 *
 * request.device will be available for any route defined in here
 *
 * - /api/v1/devices/:deviceId/actions/
 *
 * @namespace device
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    const deviceLogger = getDeviceLogger(app)

    // Start and Suspend are disabled until resolution of the feature is complete.
    // See comments in #3292
    // See comments in #3292
    // app.post('/start', {
    //     preHandler: app.needsPermission('device:change-status'),
    //     schema: {
    //         summary: 'Start Node-RED',
    //         tags: ['Device Actions'],
    //         params: {
    //             type: 'object',
    //             properties: {
    //                 deviceId: { type: 'string' }
    //             }
    //         },
    //         response: {
    //             200: {
    //                 $ref: 'APIStatus'
    //             },
    //             '4xx': {
    //                 $ref: 'APIError'
    //             },
    //             500: {
    //                 $ref: 'APIError'
    //             }
    //         }
    //     }
    // }, async (request, reply) => {
    //     // check to see if comms is enabled
    //     const deviceComms = getDeviceComms(app)
    //     if (!deviceComms) {
    //         reply.code(400).send({ code: 'no_device_comms', error: 'Actions are not available' })
    //         return
    //     }
    //     const deviceCurrentState = request.device.state
    //     try {
    //         // update device state to starting
    //         request.device.state = 'starting'
    //         await request.device.save()
    //         const result = await deviceComms.sendCommandAwaitReply(request.device.Team.hashid, request.device.hashid, 'action', { action: 'start' })
    //         if (typeof result !== 'object' || result?.success !== true) {
    //             const error = new Error(result?.error?.error || 'Start request failed, device did not respond correctly.')
    //             error.code = result?.error?.code || 'start_failed'
    //             error.statusCode = 400
    //             throw error
    //         }
    //         await deviceLogger.device.started(request.session.User, null, request.device)
    //         reply.send({ status: 'okay' })
    //     } catch (err) {
    //         request.device.state = deviceCurrentState
    //         await request.device.save()
    //         const resp = { code: err.code || 'unexpected_error', error: err.message }
    //         let statusCode = err.statusCode || 500
    //         if (err.message === 'Command timed out') {
    //             // this error message is generated by the deviceComms.sendCommandAwaitReply function when it does not receive a response from the device
    //             resp.code = 'no_response'
    //             resp.error = 'Start request timed out: no response from device.'
    //             statusCode = 400
    //         }
    //         await deviceLogger.device.startFailed(request.session.User, resp, request.device)
    //         reply.code(statusCode).send(resp)
    //     }
    // })

    app.post('/restart', {
        preHandler: app.needsPermission('device:change-status'),
        schema: {
            summary: 'Restart Node-RED',
            tags: ['Device Actions'],
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // check to see if comms is enabled
        const deviceComms = getDeviceComms(app)
        if (!deviceComms) {
            reply.code(400).send({ code: 'no_device_comms', error: 'Actions are not available' })
            return
        }
        const deviceCurrentState = request.device.state
        try {
            if (deviceCurrentState === 'suspended') {
                reply.code(400).send({ code: 'device_suspended', error: 'Device suspended' })
                return
            }
            request.device.state = 'restarting'
            await request.device.save()
            const result = await deviceComms.sendCommandAwaitReply(request.device.Team.hashid, request.device.hashid, 'action', { action: 'restart' })
            if (typeof result !== 'object' || result?.success !== true) {
                const error = new Error(result?.error?.error || 'Restart request failed, device did not respond correctly.')
                error.code = result?.error?.code || 'restart_failed'
                error.statusCode = 400
                throw error
            }
            await deviceLogger.device.restarted(request.session.User, null, request.device)
            reply.send({ status: 'okay' })
        } catch (err) {
            request.device.state = deviceCurrentState
            await request.device.save()
            const resp = { code: err.code || 'unexpected_error', error: err.message }
            let statusCode = err.statusCode || 500
            if (err.message === 'Command timed out') {
                // this error message is generated by the deviceComms.sendCommandAwaitReply function when it does not receive a response from the device
                resp.code = 'no_response'
                resp.error = 'Restart request timed out: no response from device.'
                statusCode = 400
            }
            await deviceLogger.device.restartFailed(request.session.User, resp, request.device)
            reply.code(statusCode).send(resp)
        }
    })

    // Start and Suspend are disabled until resolution of the feature is complete
    // See comments in #3292
    // app.post('/suspend', {
    //     preHandler: app.needsPermission('device:change-status'),
    //     schema: {
    //         summary: 'Suspend Node-RED',
    //         tags: ['Device Actions'],
    //         params: {
    //             type: 'object',
    //             properties: {
    //                 deviceId: { type: 'string' }
    //             }
    //         },
    //         response: {
    //             200: {
    //                 $ref: 'APIStatus'
    //             },
    //             '4xx': {
    //                 $ref: 'APIError'
    //             },
    //             500: {
    //                 $ref: 'APIError'
    //             }
    //         }
    //     }
    // }, async (request, reply) => {
    //     // check to see if comms is enabled
    //     const deviceComms = getDeviceComms(app)
    //     if (!deviceComms) {
    //         reply.code(400).send({ code: 'no_device_comms', error: 'Actions are not available' })
    //         return
    //     }
    //     const deviceCurrentState = request.device.state
    //     try {
    //         if (deviceCurrentState === 'suspended') {
    //             reply.code(400).send({ code: 'device_suspended', error: 'Device suspended' })
    //             return
    //         }
    //         request.device.state = 'suspending'
    //         await request.device.save()
    //         const result = await deviceComms.sendCommandAwaitReply(request.device.Team.hashid, request.device.hashid, 'action', { action: 'suspend' })
    //         if (typeof result !== 'object' || result?.success !== true) {
    //             const error = new Error(result?.error?.error || 'Suspend request failed, device did not respond correctly.')
    //             error.code = result?.error?.code || 'suspend_failed'
    //             error.statusCode = 400
    //             throw error
    //         }
    //         await deviceLogger.device.suspended(request.session.User, null, request.device)
    //         reply.send({ status: 'okay' })
    //     } catch (err) {
    //         request.device.state = deviceCurrentState
    //         await request.device.save()
    //         const resp = { code: err.code || 'unexpected_error', error: err.message }
    //         let statusCode = err.statusCode || 500
    //         if (err.message === 'Command timed out') {
    //             // this error message is generated by the deviceComms.sendCommandAwaitReply function when it does not receive a response from the device
    //             resp.code = 'no_response'
    //             resp.error = 'Suspend request timed out: no response from device.'
    //             statusCode = 400
    //         }
    //         await deviceLogger.device.suspendFailed(request.session.User, resp, request.device)
    //         reply.code(statusCode).send(resp)
    //     }
    // })
}
