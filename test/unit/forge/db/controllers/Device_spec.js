const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Device controller', function () {
    // Use standard test data.
    let app
    beforeEach(async function () {
        app = await setup()
    })

    afterEach(async function () {
        await app.close()
    })

    describe('Platform Specific Environment Variables', function () {
        it('generates env array', async function () {
            const device = {
                id: '1',
                hashid: 'a-b-c-device-1',
                name: 'device1',
                type: 'PI4'
            }
            const env = app.db.controllers.Device.insertPlatformSpecificEnvVars(device, null)
            should(env).be.an.Array().with.lengthOf(3)
            env.should.containEql({ name: 'FF_DEVICE_ID', value: device.hashid, platform: true })
            env.should.containEql({ name: 'FF_DEVICE_NAME', value: 'device1', platform: true })
            env.should.containEql({ name: 'FF_DEVICE_TYPE', value: 'PI4', platform: true })
        })
        it('merges env vars', async function () {
            const device = {
                id: '2',
                hashid: 'a-b-c-device-2',
                name: 'device2',
                type: 'PI3b'
            }
            const dummyEnvVars = [
                { name: 'one', value: '1' },
                { name: 'two', value: '2' }
            ]
            const env = app.db.controllers.Device.insertPlatformSpecificEnvVars(device, dummyEnvVars)
            should(env).be.an.Array().with.lengthOf(5)
            env.should.containEql({ name: 'FF_DEVICE_ID', value: device.hashid, platform: true })
            env.should.containEql({ name: 'FF_DEVICE_NAME', value: 'device2', platform: true })
            env.should.containEql({ name: 'FF_DEVICE_TYPE', value: 'PI3b', platform: true })
            env.should.containEql({ name: 'one', value: '1' })
            env.should.containEql({ name: 'two', value: '2' })
        })
        it('removes env vars', async function () {
            const dummyEnvVars = [
                { name: 'FF_FUTURE_UNKNOWN_ENV_VAR', value: 'future unknown env var starting with FF_ should be removed' },
                { name: 'FF_PROJECT_ID', value: 'a' },
                { name: 'FF_DEVICE_NAME', value: 'b' },
                { name: 'FF_DEVICE_ID', value: 'c' },
                { name: 'FF_DEVICE_NAME', value: 'd' },
                { name: 'FF_DEVICE_TYPE', value: 'e' },
                { name: 'normal-env-var', value: 'f' }
            ]
            const env = app.db.controllers.Device.removePlatformSpecificEnvVars(dummyEnvVars)
            should(env).be.an.Array().and.have.a.lengthOf(1)
            env.should.containEql({ name: 'normal-env-var', value: 'f' })
        })
    })
})
