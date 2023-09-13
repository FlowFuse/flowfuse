const crypto = require('crypto')

const sinon = require('sinon')
const should = require('should') // eslint-disable-line
const { decryptCreds } = require('../../../../lib/credentials')
const setup = require('../setup')

describe('DeviceSnapshot controller', function () {
    // Use standard test data.
    let app
    /** @type {import('../../../../lib/TestModelFactory')} */
    let factory

    before(async function () {
        app = await setup()
        factory = app.factory
        app.TestObjects.application1 = await factory.createApplication({ name: 'application-1' }, app.TestObjects.team1)
    })

    after(async function () {
        // un-stub app.comms.devices.sendCommandAwaitReply
        app.comms.devices.sendCommandAwaitReply.restore()
        await app.close()
    })

    afterEach(async function () {
        await app.db.models.ProjectSnapshot.destroy({ where: {} })
    })

    describe('createSnapshot', function () {
        it('creates a snapshot of a device owned by an application', async function () {
            const user = await app.db.models.User.byUsername('alice')
            const options = {
                name: 'snapshot1',
                description: 'a snapshot'
            }
            const application = app.TestObjects.application1
            const team = app.TestObjects.team1
            const device = await factory.createDevice({ name: 'device-1' }, team, null, application)
            // get db Device with all associations
            const dbDevice = await app.db.models.Device.byId(device.id)
            // mock app.comms.devices.sendCommandAwaitReply(device_Team_hashid, device_hashid, ...) so that it returns a valid config
            sinon.stub(app.comms.devices, 'sendCommandAwaitReply').resolves({
                flows: [{ id: '123', type: 'newNode' }],
                credentials: {
                    $: {
                        key: 'value'
                    }
                },
                package: {
                    modules: {
                        foo: '1.2.3'
                    }
                }
            })
            const snapshot = await app.db.controllers.DeviceSnapshot.createSnapshotFromDevice(application, dbDevice, user, options)
            snapshot.should.have.property('name', 'snapshot1')
            snapshot.should.have.property('description', 'a snapshot')
            snapshot.should.have.property('description', 'a snapshot')
            snapshot.should.have.property('settings')
            // Ensure modules is empty as none has been provided
            snapshot.settings.should.have.only.keys('settings', 'env', 'modules')
            snapshot.settings.modules.should.have.only.keys('foo')
            snapshot.should.have.property('flows')
            snapshot.flows.should.have.only.keys('flows', 'credentials')
            snapshot.flows.flows.should.have.length(1)
            snapshot.flows.flows[0].should.have.property('id', '123')
        })
    })
})
