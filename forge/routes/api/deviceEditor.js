/**
 * Device Editor access
 *
 * @namespace devices
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    const devices = {}

    app.get('/inboundWS/:deviceId', {
        config: { allowAnonymous: true },
        websocket: true
    }, (connection, request) => {
        const device = request.params.deviceId
        if (!devices[device]) {
            devices[device] = {
                counter: 0,
                socket: connection.socket,
                requests: {},
                forwardedWS: {}
            }
        }
        connection.socket.on('message', msg => {
            const response = JSON.parse(msg.toString())
            if (response.id !== undefined) {
                const reply = devices[device].requests[response.id]
                if (reply) {
                    reply.headers(response.headers ? response.headers: {})
                    reply.code(response.status)
                    if (response.body) {
                        reply.send(Buffer.from(response.body))
                    } else {
                        reply.send()
                    }
                } else if (response.ws) {
                    const wsSocket = devices[device].forwardedWS[response.id]
                    wsSocket.send(response.body)
                } else {
                    console.log('no reply')
                }
            } else {
                console.log('no id')
            }
        })

        connection.socket.on('close', () => {
            // should delete devices entry
            delete devices[device]
        })
    })

    app.route({
        method: 'GET',
        url: '/:deviceId/*',
        handler: (request, reply) => {
            const device = request.params.deviceId
            if (!devices[device]) {
                // need to pick the right status code here
                reply.code(503)
                reply.send()
            } else {
                const id = devices[device].counter++
                devices[device].requests[id] = reply
                devices[device].socket.send(JSON.stringify({
                    id,
                    method: 'GET',
                    headers: request.headers,
                    url: request.url.substring(`/api/v1/remote/editor/${device}`.length)
                }))
            }
        },
        wsHandler: (connection, request) => {
            const device = request.params.deviceId
            if (devices[device]) {
                const id = devices[device].counter++
                devices[device].socket.send(JSON.stringify({
                    id,
                    ws: true,
                    url: '/comms'
                }))
                devices[device].forwardedWS[id] = connection.socket

                connection.socket.on('message', msg => {
                    devices[device].socket.send(JSON.stringify({
                        id,
                        ws: true,
                        body: msg.toString()
                    }))
                })

                connection.on('close', () => {
                    delete devices[device].forwardedWS[id]
                })
            }
        }
    })

    app.route({
        method: ['POST', 'DELETE', 'PUT'],
        url: '/:deviceId/*',
        handler: (request, reply) => {
            const device = request.params.deviceId
            if (!devices[device]) {
                reply.code(503)
                reply.send()
            } else {
                const id = devices[device].counter++
                devices[device].requests[id] = reply
                devices[device].socket.send(JSON.stringify({
                    id,
                    method: request.method,
                    headers: request.headers,
                    url: request.url.substring(`/api/v1/remote/editor/${device}`.length),
                    body: request.body ? JSON.stringify(request.body) : undefined
                }))
            }
        }
    })
}
