const should = require('should') // eslint-disable-line

describe('Device life cycle', async function () {
    let app
    const TestObjects = {}

    async function createDevice (options) {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/devices',
            body: {
                name: options.name,
                type: options.type,
                team: options.team
            },
            cookies: { sid: options.as }
        })
        return response.json()
    }

    beforeEach(async function () {

    })

    afterEach(async function () {

    })

    describe('Device coonect', async function () {
        it('Device check-in wrong token', async function () {
            // POST /api/v1/devices/:deviceId/live/status
            // app.inject({
            //     method: 'POST',
            //     url: `/api/v1/devices/${deviceId}/live/status`
            // })
        })
        it('Device check-in first time', async function () {
            // POST /api/v1/devices/:deviceId/live/status
            // app.inject({
            //     method: 'POST',
            //     url: `/api/v1/devices/${deviceId}/live/status`
            // })
        })
        it('Device check-in no change', async function () {
            // POST /api/v1/devices/:deviceId/live/status
            // app.inject({
            //     method: 'POST',
            //     url: `/api/v1/devices/${deviceId}/live/status`
            // })
        })
        it('Device check-in Snapshot Changed', async function () {
            // POST /api/v1/devices/:deviceId/live/status
            // app.inject({
            //     method: 'POST',
            //     url: `/api/v1/devices/${deviceId}/live/status`
            // })
        })
        it('Device check-in Settings Changed', async function () {
            // POST /api/v1/devices/:deviceId/live/status
            // app.inject({
            //     method: 'POST',
            //     url: `/api/v1/devices/${deviceId}/live/status`
            // })
        })
    })
})
