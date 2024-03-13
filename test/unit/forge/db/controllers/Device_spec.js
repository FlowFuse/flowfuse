const sinon = require('sinon')
const should = require('should') // eslint-disable-line

const snapshotServices = require('../../../../../forge/services/snapshots.js')
const TestModelFactory = require('../../../../lib/TestModelFactory.js')
const setup = require('../setup')

describe('Device controller', function () {
    let app
    /** @type {TestModelFactory} */ let factory
    const TestObjects = {}

    async function setupCE () {
        app = await setup({
            limits: {
                instances: 50
            }
        })
        factory = new TestModelFactory(app)
        await setupTestObjects()
    }

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

    async function setupTestObjects () {
        // alice : admin
        // ATeam ( alice  (owner) )

        // Alice is created in setup()
        const userAlice = await app.db.models.User.byUsername('alice')
        // ATeam is created in setup()
        const ATeam = await app.db.models.Team.byName('ATeam')
        // Alice is set as ATeam owner in setup()

        // generate a template
        const template1 = await factory.createProjectTemplate({
            name: 'template1',
            settings: {
                httpAdminRoot: '',
                codeEditor: '',
                palette: {
                    modules: []
                }
            }
        }, userAlice)
        const projectType1 = await factory.createProjectType({
            name: 'projectType1',
            description: 'default project type',
            properties: { foo: 'bar' }
        })
        const stack1 = await factory.createStack({ name: 'stack1' }, projectType1)
        const application1 = await factory.createApplication({ name: 'application-1' }, ATeam)
        const instance1 = await factory.createInstance(
            { name: 'project1' },
            application1,
            stack1,
            template1,
            projectType1,
            { start: false }
        )

        // Set up TestObjects
        TestObjects.alice = userAlice
        TestObjects.team = ATeam
        TestObjects.stack = stack1
        TestObjects.template = template1
        TestObjects.projectType = projectType1
        TestObjects.application = application1
        TestObjects.project = instance1
        TestObjects.projectCredentials = await instance1.refreshAuthTokens()

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
    }

    before(async function () {
        return setupCE()
    })
    after(async function () {
        await app.close()
    })

    describe('updateState', function () {
        it('updates the activeSnapshot if snapshot matching hashid is found', async function () {
            const applicationDevice = await factory.createDevice({
                name: 'device',
                ownerType: 'application'
            }, TestObjects.team)

            const knownSnapshot = await snapshotServices.createSnapshot(app, TestObjects.project, TestObjects.alice, {
                name: 'instance 3 snapshot 1',
                description: 'snapshot 1 on instance 3'
            })

            await app.db.controllers.Device.updateState(applicationDevice, {
                snapshot: knownSnapshot.hashid
            })

            await applicationDevice.reload()

            applicationDevice.activeSnapshotId.should.equal(knownSnapshot.id)
        })

        it('does not update activeSnapshot if snapshot matching hashid does not exist', async function () {
            const applicationDevice = await factory.createDevice({
                name: 'device',
                ownerType: 'application'
            }, TestObjects.team)

            const oldSnapshot = await snapshotServices.createSnapshot(app, TestObjects.project, TestObjects.alice, {
                name: 'instance 3 snapshot 1',
                description: 'snapshot 1 on instance 3'
            })

            const oldSnapshotHashId = oldSnapshot.hashid

            await oldSnapshot.destroy()

            await app.db.controllers.Device.updateState(applicationDevice, {
                snapshot: oldSnapshotHashId
            })

            await applicationDevice.reload()

            should(applicationDevice.activeSnapshotId).equal(null)
        })

        it('does not update activeSnapshot if snapshot hashid is invalid', async function () {
            const applicationDevice = await factory.createDevice({
                name: 'device',
                ownerType: 'application'
            }, TestObjects.team)

            await app.db.controllers.Device.updateState(applicationDevice, {
                snapshot: 'invalid-hash-id'
            })

            await applicationDevice.reload()

            should(applicationDevice.activeSnapshotId).equal(null)
        })
    })

    describe('Platform Specific Environment Variables', function () {
        it('generates env array', async function () {
            const device = {
                id: '1',
                hashid: 'a-b-c-device-1',
                name: 'device1',
                type: 'PI4',
                targetSnapshot: {
                    name: 'snapshot-name',
                    hashid: 'snapshot-id'
                }
            }
            const env = app.db.controllers.Device.insertPlatformSpecificEnvVars(device, null)
            should(env).be.an.Array().with.lengthOf(5)
            env.should.containEql({ name: 'FF_DEVICE_ID', value: device.hashid, platform: true })
            env.should.containEql({ name: 'FF_DEVICE_NAME', value: 'device1', platform: true })
            env.should.containEql({ name: 'FF_DEVICE_TYPE', value: 'PI4', platform: true })
            env.should.containEql({ name: 'FF_SNAPSHOT_ID', value: 'snapshot-id', platform: true })
            env.should.containEql({ name: 'FF_SNAPSHOT_NAME', value: 'snapshot-name', platform: true })
        })
        it('generates env array with FF_APPLICATION_* vars and a default snapshot for device at application level', async function () {
            const device = {
                id: '1',
                hashid: 'a-b-c-device-1',
                name: 'device1',
                type: 'PI4',
                ownerType: 'application',
                isApplicationOwned: true,
                applicationId: 1,
                Application: {
                    name: 'application-name',
                    hashid: 'app-id'
                }
            }
            const env = app.db.controllers.Device.insertPlatformSpecificEnvVars(device, null)
            should(env).be.an.Array().with.lengthOf(7)
            env.should.containEql({ name: 'FF_DEVICE_ID', value: device.hashid, platform: true })
            env.should.containEql({ name: 'FF_DEVICE_NAME', value: 'device1', platform: true })
            env.should.containEql({ name: 'FF_DEVICE_TYPE', value: 'PI4', platform: true })
            env.should.containEql({ name: 'FF_SNAPSHOT_ID', value: '0', platform: true })
            env.should.containEql({ name: 'FF_SNAPSHOT_NAME', value: 'None', platform: true })
            env.should.containEql({ name: 'FF_APPLICATION_ID', value: 'app-id', platform: true })
            env.should.containEql({ name: 'FF_APPLICATION_NAME', value: 'application-name', platform: true })
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
            should(env).be.an.Array().with.lengthOf(7)
            env.should.containEql({ name: 'FF_DEVICE_ID', value: device.hashid, platform: true })
            env.should.containEql({ name: 'FF_DEVICE_NAME', value: 'device2', platform: true })
            env.should.containEql({ name: 'FF_DEVICE_TYPE', value: 'PI3b', platform: true })
            env.should.containEql({ name: 'one', value: '1' })
            env.should.containEql({ name: 'two', value: '2' })
        })
        it('removes env vars', async function () {
            const dummyEnvVars = [
                { name: 'FF_FUTURE_UNKNOWN_ENV_VAR', value: 'future unknown env var starting with FF_ should be removed' },
                { name: 'FF_INSTANCE_ID', value: 'a' },
                { name: 'FF_INSTANCE_NAME', value: 'b' },
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

    describe('sendDeviceUpdateCommand', function () {
        afterEach(async function () {
            sinon.restore()
        })
        it('sends update command to an instance owned device', async function () {
            const snapshot = await snapshotServices.createSnapshot(app, TestObjects.project, TestObjects.alice, {
                name: 'snapshot 1',
                description: 'snapshot 1 description',
                setAsTarget: true
            })
            await TestObjects.project.reload()

            const device1 = await factory.createDevice({ name: 'device1', type: 'type1' }, TestObjects.team, TestObjects.project)

            // set the snapshot as the target snapshot on the project
            await device1.setTargetSnapshot(snapshot)

            // stub app.comms.devices.sendCommand so we can see what it was called with
            /** @type {DeviceCommsHandler} */
            const commsHandler = app.comms.devices
            sinon.stub(commsHandler, 'sendCommand').resolves()

            // load the full device model & use it in a call to sendDeviceUpdateCommand
            const device = await app.db.models.Device.byId(device1.id)
            await app.db.controllers.Device.sendDeviceUpdateCommand(device)

            // ensure sendCommand was called
            should(commsHandler.sendCommand.calledOnce).be.true('sendCommand was not called')
            // get the args used to call sendCommand
            const args = commsHandler.sendCommand.getCall(0).args
            // check the args are as expected: Team.hashid, device.hashid, 'update', payload
            should(args[0]).eql(TestObjects.team.hashid)
            should(args[1]).eql(device.hashid)
            should(args[2]).eql('update')
            should(args[3]).be.an.Object()
            args[3].should.have.a.property('project', TestObjects.project.id)
            args[3].should.have.a.property('snapshot', snapshot.hashid)
            args[3].should.have.a.property('mode', 'autonomous')
            args[3].should.have.a.property('settings')
            args[3].should.have.a.property('licensed')
        })
        it('can send a snapshot from an instance to an application owned device', async function () {
            // create a new project with snapshot, assign to application owned device
            const instance = await factory.createInstance(
                { name: 'project3' },
                TestObjects.application,
                TestObjects.stack,
                TestObjects.template,
                TestObjects.projectType,
                { start: false }
            )

            const snapshot = await snapshotServices.createSnapshot(app, instance, TestObjects.alice, {
                name: 'instance 3 snapshot 1',
                description: 'snapshot 1 on instance 3',
                setAsTarget: true
            })
            await instance.reload()

            // create a new application owned device
            const newDevice = await factory.createDevice({ name: 'device2', type: 'type1' }, TestObjects.team, null, TestObjects.application)

            // set the snapshot as the target snapshot on the project
            await newDevice.setTargetSnapshot(snapshot)

            // stub app.comms.devices.sendCommand so we can see what it was called with
            /** @type {DeviceCommsHandler} */
            const commsHandler = app.comms.devices
            sinon.stub(commsHandler, 'sendCommand').resolves()

            // load the full device model & use it in a call to sendDeviceUpdateCommand
            const device = await app.db.models.Device.byId(newDevice.id)
            await app.db.controllers.Device.sendDeviceUpdateCommand(device)

            // ensure sendCommand was called
            should(commsHandler.sendCommand.calledOnce).be.true('sendCommand was not called')
            // get the args used to call sendCommand
            const args = commsHandler.sendCommand.getCall(0).args
            // check the args are as expected: Team.hashid, device.hashid, 'update', payload
            should(args[0]).eql(TestObjects.team.hashid)
            should(args[1]).eql(device.hashid)
            should(args[2]).eql('update')
            should(args[3]).be.an.Object()
            args[3].should.not.have.a.property('project') // it is important that `.project` is not present to avoid triggering the wrong kind of update on the device
            args[3].should.have.a.property('application', TestObjects.application.hashid)
            args[3].should.have.a.property('snapshot', snapshot.hashid)
        })
        it('does not send orphaned snapshot in update command to device', async function () {
            // create a new project with snapshot, assign to device, delete project to orphan the snapshot
            const instance2 = await factory.createInstance(
                { name: 'project2' },
                TestObjects.application,
                TestObjects.stack,
                TestObjects.template,
                TestObjects.projectType,
                { start: false }
            )

            const snapshot = await snapshotServices.createSnapshot(app, instance2, TestObjects.alice, {
                name: 'instance 2 snapshot 1',
                description: 'snapshot 1 on instance 2',
                setAsTarget: true
            })
            await instance2.reload()

            // create an instance owned device
            const device1 = await factory.createDevice({ name: 'device1', type: 'type1' }, TestObjects.team, instance2)

            // set the snapshot as the target snapshot on the project
            await device1.setTargetSnapshot(snapshot)

            // delete the project to orphan the snapshot
            await instance2.destroy()

            // stub app.comms.devices.sendCommand so we can see what it was called with
            /** @type {DeviceCommsHandler} */
            const commsHandler = app.comms.devices
            sinon.stub(commsHandler, 'sendCommand').resolves()

            // load the full device model & use it in a call to sendDeviceUpdateCommand
            const device = await app.db.models.Device.byId(device1.id)
            await app.db.controllers.Device.sendDeviceUpdateCommand(device)

            // ensure sendCommand was called
            should(commsHandler.sendCommand.calledOnce).be.true('sendCommand was not called')
            // get the args used to call sendCommand
            const args = commsHandler.sendCommand.getCall(0).args
            // check the args are as expected: Team.hashid, device.hashid, 'update', payload
            should(args[0]).eql(TestObjects.team.hashid)
            should(args[1]).eql(device.hashid)
            should(args[2]).eql('update')
            should(args[3]).be.an.Object()
            args[3].should.not.have.a.property('application') // it is important that `.application` is not present to avoid triggering the wrong kind of update on the device
            args[3].should.have.a.property('project', null)
            args[3].should.have.a.property('snapshot', null)
        })
    })
})
