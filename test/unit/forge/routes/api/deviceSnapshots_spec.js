const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const setup = require('../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Device Snapshots API', function () {
    let app
    /** @type {import('../../../../lib/TestModelFactory')} */
    let factory = null
    const TestObjects = {
        alice: null,
        bob: null,
        chris: null,
        ATeam: null,
        tokens: {
            alice: null,
            bob: null,
            chris: null,
            project: null
        },
        template1: null,
        stack1: null,
        application1: null,
        project1: null,
        appOwnedDevice: null,
        instanceOwnedDevice: null
    }

    before(async function () {
        app = await setup()
        factory = app.factory
        TestObjects.application1 = app.application
        TestObjects.template1 = app.template
        TestObjects.stack1 = app.stack
        TestObjects.project1 = app.project

        // alice : admin
        // bob
        // chris

        // ATeam ( alice (owner), bob )

        // project1 owned by ATeam

        TestObjects.alice = app.adminUser // Alice is created in setup()
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

        TestObjects.ATeam = await app.team // ATeam is created in setup()
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Member } })

        // create BTeam and add bob as owner, chris as member
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })

        TestObjects.appOwnedDevice = await factory.createDevice({ name: 'device-1' }, TestObjects.ATeam, null, TestObjects.application1)
        TestObjects.instanceOwnedDevice = await factory.createDevice({ name: 'device-2' }, TestObjects.ATeam, TestObjects.project1, null)

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')
    })

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    after(async function () {
        await app.close()
    })

    afterEach(async function () {
        // if app.comms.devices.sendCommandAwaitReply/sendCommand are stubbed, restore them
        if (app.comms.devices.sendCommandAwaitReply.restore) {
            app.comms.devices.sendCommandAwaitReply.restore()
        }
        if (app.comms.devices.sendCommand.restore) {
            app.comms.devices.sendCommand.restore()
        }
        // if app.db.controllers.Project.exportCredentials is stubbed, restore it
        if (app.db.controllers.Project.exportCredentials.restore) {
            app.db.controllers.Project.exportCredentials.restore()
        }
    })

    async function createSnapshot (deviceId, name, token, mockResponse) {
        sinon.stub(app.comms.devices, 'sendCommandAwaitReply').resolves(mockResponse)
        sinon.stub(app.comms.devices, 'sendCommand').resolves()
        return await app.inject({
            method: 'POST',
            url: `/api/v1/devices/${deviceId}/snapshots`,
            payload: {
                name
            },
            cookies: { sid: token }
        })
    }

    async function createInstanceOwnedSnapshot (device, user, name, mockResponse, description = null) {
        sinon.stub(app.comms.devices, 'sendCommandAwaitReply').resolves(mockResponse)
        sinon.stub(app.comms.devices, 'sendCommand').resolves()
        // as we are not testing instance snapshots, we can just create a snapshot without going via the API
        let project = device.Project
        if (device.ProjectId && !project) {
            // if the device has a ProjectId but no Project, load the project directly
            project = await app.db.models.Project.byId(device.ProjectId)
        }
        const snapshotOptions = {
            name,
            description,
            setAsTarget: false
        }
        const snapShot = await app.db.controllers.ProjectSnapshot.createSnapshotFromDevice(
            project,
            device,
            user,
            snapshotOptions
        )
        return snapShot
    }

    async function listDeviceSnapshots (deviceId, token) {
        return await app.inject({
            method: 'GET',
            url: `/api/v1/devices/${deviceId}/snapshots`,
            cookies: { sid: token }
        })
    }

    const basicDeviceSnapshot = {
        flows: []
    }
    const basicDeviceSnapshotWithFlows = {
        flows: [{ id: '123', type: 'newNode' }],
        credentials: {},
        package: {}
    }
    const basicDeviceSnapshotWithFlowsAndCreds = {
        flows: [{ id: '123', type: 'newNode' }],
        credentials: { testCreds: 'abc' },
        package: {}
    }

    describe('Create device snapshot', function () {
        it('Non-owner can create device snapshot', async function () {
            // Bob (non-owner) can create in ATeam
            const response = await createSnapshot(TestObjects.appOwnedDevice.hashid, 'test-project-snapshot-01', TestObjects.tokens.bob, basicDeviceSnapshot)
            response.statusCode.should.equal(200)
        })

        it('Non-member cannot create project snapshot', async function () {
            // Chris (non-member) cannot create in ATeam
            const response = await createSnapshot(TestObjects.appOwnedDevice.hashid, 'test-project-snapshot-01', TestObjects.tokens.chris, basicDeviceSnapshot)
            response.statusCode.should.equal(404) // 404 as a non member should not know the resource exists
        })

        it('Create a device snapshot - empty state', async function () {
            const response = await createSnapshot(TestObjects.appOwnedDevice.hashid, 'test-project-snapshot-01', TestObjects.tokens.alice, basicDeviceSnapshot)
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'test-project-snapshot-01')
            result.should.have.property('createdAt')
            result.should.have.property('updatedAt')
            result.should.have.property('user')
            result.user.should.have.property('id', TestObjects.alice.hashid)

            const snapshotObj = await app.db.models.ProjectSnapshot.byId(result.id)
            const snapshot = snapshotObj.toJSON()
            snapshot.flows.should.have.property('flows')
            snapshot.flows.flows.should.have.lengthOf(0)
            snapshot.flows.should.not.have.property('credentials')
            snapshot.settings.should.have.property('settings')
            snapshot.settings.should.have.property('env')
            snapshot.settings.should.have.property('modules')
        })

        it('Create a device snapshot - capture real state', async function () {
            const deviceSpec = {
                flows: [{ id: 'node1' }],
                credentials: { testCreds: 'abc' },
                package: {
                    modules: {
                        foo: '1.2'
                    }
                },
                settings: {
                    httpAdminRoot: '/test-red',
                    dashboardUI: '/test-dash',
                    env: [
                        { name: 'one', value: 'a' },
                        { name: 'two', value: 'b' }
                    ]
                }
            }
            const response = await createSnapshot(TestObjects.appOwnedDevice.hashid, 'test-project-snapshot-01', TestObjects.tokens.alice, deviceSpec)
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'test-project-snapshot-01')
            result.should.have.property('createdAt')
            result.should.have.property('updatedAt')
            result.should.have.property('user')
            result.user.should.have.property('id', TestObjects.alice.hashid)

            const snapshotObj = await app.db.models.ProjectSnapshot.byId(result.id)
            const snapshot = snapshotObj.toJSON()
            snapshot.flows.should.have.property('flows')
            snapshot.flows.flows.should.have.lengthOf(1)
            snapshot.flows.flows[0].should.have.property('id', 'node1')
            snapshot.flows.should.have.property('credentials')
            snapshot.flows.credentials.should.have.property('$')
            // TODO: device snapshot:  settings not supported yet
            // snapshot.settings.should.have.property('settings')
            // snapshot.settings.settings.should.have.property('httpAdminRoot', '/test-red')
            // snapshot.settings.settings.should.have.property('dashboardUI', '/test-dash')
            // snapshot.settings.should.have.property('env')
            // snapshot.settings.env.should.have.property('one', 'a')
            // snapshot.settings.env.should.have.property('two', 'b')
            snapshot.settings.should.have.property('modules')
        })

        it('Can push a snapshot from an application owned device to a different application owned device', async function () {
            // create a snapshot from TestObjects.device
            const response = await createSnapshot(TestObjects.appOwnedDevice.hashid, 'test-project-snapshot-02', TestObjects.tokens.alice, basicDeviceSnapshotWithFlowsAndCreds)
            response.statusCode.should.equal(200)
            const result = response.json()
            const snapshotObj = await app.db.models.ProjectSnapshot.byId(result.id)
            const snapshot = snapshotObj.toJSON()

            // create a 2nd device
            const device2 = await factory.createDevice({ name: 'device-2' }, TestObjects.ATeam, null, TestObjects.application1)

            // push the snapshot to device2
            const response2 = await app.inject({
                method: 'PUT',
                url: `/api/v1/devices/${device2.hashid}`,
                payload: {
                    targetSnapshot: snapshot.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response2.statusCode.should.equal(200)

            // app.db.controllers.Device.sendDeviceUpdateCommand should have been called
            app.comms.devices.sendCommand.calledOnce.should.be.true()
            const callArgs = app.comms.devices.sendCommand.getCall(0).args
            should(callArgs).have.lengthOf(4)
            callArgs[0].should.equal(TestObjects.ATeam.hashid)
            callArgs[1].should.equal(device2.hashid)
            callArgs[2].should.equal('update')
            callArgs[3].should.be.an.Object()
            callArgs[3].should.have.property('snapshot', snapshot.hashid) // snapshotId should have been be the hashid snapshot
            callArgs[3].should.have.property('application', TestObjects.application1.hashid)
            callArgs[3].should.not.have.property('project') // project must not be present in a transmission to an application owned device

            // get db object for device2 and check the flows and credentials are as expected
            const device2Reloaded = await app.db.models.Device.byId(device2.id)
            device2Reloaded.targetSnapshot.should.have.property('hashid', snapshot.hashid) // ensure the targetSnapshot is the snapshot we pushed
        })
        it('Can push a snapshot from an instance owned device to a different application owned device', async function () {
            // get db object for device
            const device = await app.db.models.Device.byId(TestObjects.instanceOwnedDevice.id)

            // stub app.db.controllers.Project.exportCredentials to return the same credentials
            sinon.stub(app.db.controllers.Project, 'exportCredentials').callsFake((creds, _sourceSecret, _targetSecret) => {
                return creds
            })

            // create a snapshot from TestObjects.device
            const snapshot = await createInstanceOwnedSnapshot(device, TestObjects.alice, 'test-project-snapshot-03', basicDeviceSnapshotWithFlowsAndCreds)
            // we should have called exportCredentials at this point
            app.db.controllers.Project.exportCredentials.calledOnce.should.be.true()

            // create a 2nd (application owned) device
            const device2 = await factory.createDevice({ name: 'device-2' }, TestObjects.ATeam, null, TestObjects.application1)

            // push the snapshot to device2
            const response2 = await app.inject({
                method: 'PUT',
                url: `/api/v1/devices/${device2.hashid}`,
                payload: {
                    targetSnapshot: snapshot.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response2.statusCode.should.equal(200)

            // app.db.controllers.Device.sendDeviceUpdateCommand should have been called
            app.comms.devices.sendCommand.calledOnce.should.be.true()
            const callArgs = app.comms.devices.sendCommand.getCall(0).args
            should(callArgs).have.lengthOf(4)
            callArgs[0].should.equal(TestObjects.ATeam.hashid)
            callArgs[1].should.equal(device2.hashid)
            callArgs[2].should.equal('update')
            callArgs[3].should.be.an.Object()
            callArgs[3].should.have.property('snapshot', snapshot.hashid) // snapshotId should have been be the hashid snapshot
            callArgs[3].should.have.property('application', TestObjects.application1.hashid)
            callArgs[3].should.not.have.property('project') // project must not be present in a transmission to an application owned device

            // get db object for device2 and check the flows and credentials are as expected
            const device2Reloaded = await app.db.models.Device.byId(device2.id)
            device2Reloaded.targetSnapshot.should.have.property('hashid', snapshot.hashid) // ensure the targetSnapshot is the snapshot we pushed
        })
    })

    describe('Get snapshot information', function () {
        it('Non-member cannot get device snapshot', async function () {
            // Chris (non-member) cannot create in ATeam

            // First alice creates one
            const snapshotResponse = await createSnapshot(TestObjects.appOwnedDevice.hashid, 'test-device-snapshot-01', TestObjects.tokens.alice, basicDeviceSnapshotWithFlows)
            const result = snapshotResponse.json()
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${TestObjects.appOwnedDevice.hashid}/snapshots/${result.id}`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            // 404 as a non member should not know the resource exists
            response.statusCode.should.equal(404)
        })
        it('Get snapshot', async function () {
            // First alice creates one
            const snapshotResponse = await createSnapshot(TestObjects.appOwnedDevice.hashid, 'test-device-snapshot-01', TestObjects.tokens.alice, basicDeviceSnapshotWithFlows)
            const snapshotResult = snapshotResponse.json()
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${TestObjects.appOwnedDevice.hashid}/snapshots/${snapshotResult.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.should.have.property('id', snapshotResult.id)
        })
        it('Cannot get snapshot for mismatched device', async function () {
            const snapshotResponse = await createSnapshot(TestObjects.appOwnedDevice.hashid, 'test-device-snapshot-01', TestObjects.tokens.alice, basicDeviceSnapshotWithFlows)
            const snapshotResult = snapshotResponse.json()
            // Try to get the snapshot using a different device id
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${TestObjects.instanceOwnedDevice.hashid}/snapshots/${snapshotResult.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(404)
        })
    })

    describe('Delete a snapshot', function () {
        it('Non-owner cannot delete a device snapshot', async function () {
            // Bob (non-owner) cannot delete in ATeam

            // First alice creates one
            const snapshotResponse = await createSnapshot(TestObjects.appOwnedDevice.hashid, 'test-device-snapshot-01', TestObjects.tokens.alice, basicDeviceSnapshotWithFlows)
            const result = snapshotResponse.json()

            // Then bob tries to delete it
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/devices/${TestObjects.appOwnedDevice.hashid}/snapshots/${result.id}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })
        it('Team owner can delete a project snapshot', async function () {
            // Alice (owner) can delete in ATeam

            // First alice creates one
            const snapshotResponse = await createSnapshot(TestObjects.appOwnedDevice.hashid, 'test-project-snapshot-01', TestObjects.tokens.alice, basicDeviceSnapshotWithFlows)
            const result = snapshotResponse.json()
            // Then alice tries to delete it
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/devices/${TestObjects.appOwnedDevice.hashid}/snapshots/${result.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)

            const snapshotList = (await listDeviceSnapshots(TestObjects.appOwnedDevice.hashid, TestObjects.tokens.alice)).json()
            const snapshot = snapshotList.snapshots.filter(snap => snap.id === result.id)
            snapshot.should.have.lengthOf(0)
        })
    })
})
