const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../setup')

describe('Logging API', function () {
    let app
    /** @type {import('../../../../lib/TestModelFactory')} */
    let factory
    let objectCount = 0
    const generateName = (root = 'object') => `${root}-${objectCount++}`
    const TestObjects = {
        tokens: {
            alice: null,
            project1: null,
            project2: null,
            device1: null,
            device2: null
        },
        team1: null,
        project1: null,
        project2: null,
        device1: null,
        device2: null,
        alice: null
    }

    before(async function () {
        app = await setup({})
        factory = app.factory
        TestObjects.application = app.application
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.team1 = app.team
        TestObjects.project1 = app.project
        TestObjects.project2 = await app.db.models.Project.create({ name: 'project2', type: '', url: '' })
        const device1 = await factory.createDevice({ name: generateName('device-1') }, TestObjects.team1, null, TestObjects.application)
        TestObjects.device1 = await app.db.models.Device.byId(device1.id)
        const device2 = await factory.createDevice({ name: generateName('device-2') }, TestObjects.team1, null, TestObjects.application)
        TestObjects.device2 = await app.db.models.Device.byId(device2.id)
        await TestObjects.team1.addProject(TestObjects.project2)
        TestObjects.tokens.project1 = (await TestObjects.project1.refreshAuthTokens()).token
        TestObjects.tokens.project2 = (await TestObjects.project2.refreshAuthTokens()).token
        TestObjects.tokens.device1 = (await TestObjects.device1.refreshAuthTokens()).token
        TestObjects.tokens.device2 = (await TestObjects.device2.refreshAuthTokens()).token

        sinon.stub(app.db.controllers.Project, 'addProjectModule')
        sinon.stub(app.db.controllers.Project, 'removeProjectModule')
    })
    afterEach(function () {
        app.db.controllers.Project.addProjectModule.reset()
        app.db.controllers.Project.removeProjectModule.reset()
    })

    after(async () => {
        app && await app.close()
        delete TestObjects.tokens
        delete TestObjects.team1
        delete TestObjects.project1
        delete TestObjects.project2
        delete TestObjects.device1
        delete TestObjects.device2
        delete TestObjects.alice
        delete TestObjects.application
        app.db.controllers.Project.addProjectModule.restore()
        app.db.controllers.Project.removeProjectModule.restore()
    })
    describe('instance audit logging', function () {
        it('Accepts valid token', async function () {
            const url = `/logging/${TestObjects.project1.id}/audit`
            const response = await app.inject({
                method: 'POST',
                url,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.project1}`
                },
                payload: { event: 'started' }
            })
            response.should.have.property('statusCode', 200)
        })

        it('Rejects invalid token', async function () {
            const url = `/logging/${TestObjects.project1.id}/audit`
            const response = await app.inject({
                method: 'POST',
                url,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.project2}`
                },
                payload: {}
            })
            response.should.have.property('statusCode', 404)
        })

        it('Allows error to be included in body', async function () {
            const url = `/logging/${TestObjects.project1.id}/audit`
            const response = await app.inject({
                method: 'POST',
                url,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.project1}`
                },
                payload: { event: 'start-failed', error: { code: 'test_code', error: 'test_error' } }
            })
            response.should.have.property('statusCode', 200)
        })

        it('Adds module to instance settings for nodes.install event', async function () {
            const url = `/logging/${TestObjects.project1.id}/audit`
            const response = await app.inject({
                method: 'POST',
                url,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.project1}`
                },
                payload: { event: 'nodes.install', module: '@flowfuse/newmodule', version: '0.4.0', path: '/nodes' }
            })
            response.should.have.property('statusCode', 200)
            app.db.controllers.Project.addProjectModule.called.should.be.true()
            const args = app.db.controllers.Project.addProjectModule.lastCall.args
            args.should.have.length(3)
            args[0].should.have.property('id', TestObjects.project1.id)
            args[1].should.equal('@flowfuse/newmodule')
            args[2].should.equal('0.4.0')
        })

        it('Does not add module to instance settings for nodes.install event with error', async function () {
            const url = `/logging/${TestObjects.project1.id}/audit`
            const response = await app.inject({
                method: 'POST',
                url,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.project1}`
                },
                payload: { event: 'nodes.install', module: '@flowfuse/error', error: 'not_found', version: '0.4.0', path: '/nodes' }
            })
            response.should.have.property('statusCode', 200)
            app.db.controllers.Project.addProjectModule.called.should.be.false()
        })

        it('Removes module from instance settings for nodes.remove event', async function () {
            const url = `/logging/${TestObjects.project1.id}/audit`
            const response = await app.inject({
                method: 'POST',
                url,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.project1}`
                },
                payload: { event: 'nodes.remove', module: '@flowfuse/removemodule', version: '0.4.0', path: '/nodes' }
            })
            response.should.have.property('statusCode', 200)
            app.db.controllers.Project.removeProjectModule.called.should.be.true()
            const args = app.db.controllers.Project.removeProjectModule.lastCall.args
            args.should.have.length(2)
            args[0].should.have.property('id', TestObjects.project1.id)
            args[1].should.equal('@flowfuse/removemodule')
        })

        it('Adds module to instance settings for modules.install event', async function () {
            const url = `/logging/${TestObjects.project1.id}/audit`
            const response = await app.inject({
                method: 'POST',
                url,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.project1}`
                },
                payload: { event: 'modules.install', module: '@flowfuse/newmodule', path: '/nodes' }
            })
            response.should.have.property('statusCode', 200)
            app.db.controllers.Project.addProjectModule.called.should.be.true()
            const args = app.db.controllers.Project.addProjectModule.lastCall.args
            args.should.have.length(3)
            args[0].should.have.property('id', TestObjects.project1.id)
            args[1].should.equal('@flowfuse/newmodule')
            args[2].should.equal('*')
        })

        describe('When an audit event for flows.set is received', function () {
            async function injectFlowSetEvent (app, project, token, deployType) {
                const url = `/logging/${project.id}/audit`
                const response = await app.inject({
                    method: 'POST',
                    url,
                    headers: {
                        authorization: `Bearer ${token}`
                    },
                    payload: { event: 'flows.set', type: deployType }
                })
                return response
            }
            before(async function () {
                app.config.features.register('instanceAutoSnapshot', true, true)
                // Enable instanceAutoSnapshot feature for default team type
                const defaultTeamType = await app.db.models.TeamType.findOne({ where: { name: 'starter' } })
                const defaultTeamTypeProperties = defaultTeamType.properties
                defaultTeamTypeProperties.features.instanceAutoSnapshot = true
                defaultTeamType.properties = defaultTeamTypeProperties
                await defaultTeamType.save()

                // stub ProjectSnapshot controller `doInstanceAutoSnapshot`
                sinon.stub(app.db.controllers.ProjectSnapshot, 'doInstanceAutoSnapshot').resolves({})

                // spy app.config.features.enabled function
                sinon.spy(app.config.features, 'enabled')
            })
            afterEach(async function () {
                app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot.reset()
                app.config.features.enabled.resetHistory()
            })
            after(async function () {
                app.config.features.register('instanceAutoSnapshot', false, false)
                app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot.restore()
                app.config.features.enabled.restore()
            })
            it('Generates a snapshot for instance when deploy type === full', async function () {
                app.config.features.enabled.resetHistory()
                const response = await injectFlowSetEvent(app, TestObjects.project1, TestObjects.tokens.project1, 'full')
                response.should.have.property('statusCode', 200)
                // wait a moment for the (stubbed) methods to be called asynchronously
                // then check if the `doInstanceAutoSnapshot` method was called
                // with the expected arguments
                await new Promise(resolve => setTimeout(resolve, 25))
                app.config.features.enabled.called.should.be.true() // the API calls `app.config.features.enabled` to check if the feature is enabled
                app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot.called.should.be.true()
                const args = app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot.lastCall.args
                args.should.have.length(4)
                should(args[0]).be.an.Object().and.have.property('id', TestObjects.project1.id)
                args[1].should.equal('full')
                should(args[2]).be.an.Object().and.deepEqual({ clean: true, setAsTarget: false })
                should(args[3]).be.an.Object()
                args[3].should.have.property('user')
            })
            it('Does not generates a snapshot for instance if the deploy type is not one of full, flows or nodes', async function () {
                app.config.features.enabled.resetHistory()
                const response = await injectFlowSetEvent(app, TestObjects.project1, TestObjects.tokens.project1, 'bad-deploy-type')
                // response should be 200 even if the deploy type is not valid
                // that is because the audit event was processed successfully.
                // The auto snapshot feature is simply spawned and not awaited.
                response.should.have.property('statusCode', 200) // 200 is expected (the audit event was processed successfully)
                // wait a moment for the (stubbed) methods to be (not) called
                await new Promise(resolve => setTimeout(resolve, 25))
                app.config.features.enabled.called.should.be.false() // should not have reached the feature.enabled check in the API call
                app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot.called.should.be.false()
            })
        })
    })
    describe('device instance audit logging', function () {
        it('Accepts valid token', async function () {
            const url = `/logging/device/${TestObjects.device1.hashid}/audit`
            const response = await app.inject({
                method: 'POST',
                url,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.device1}`
                },
                payload: { event: 'started' }
            })
            response.should.have.property('statusCode', 200)
        })

        it('Rejects invalid token', async function () {
            const url = `/logging/device/${TestObjects.device1.hashid}/audit`
            const response = await app.inject({
                method: 'POST',
                url,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.device2}`
                },
                payload: {}
            })
            response.should.have.property('statusCode', 404)
        })

        it('Allows error to be included in body', async function () {
            const url = `/logging/device/${TestObjects.device1.hashid}/audit`
            const response = await app.inject({
                method: 'POST',
                url,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.device1}`
                },
                payload: { event: 'start-failed', error: { code: 'test_code', error: 'test_error' } }
            })
            response.should.have.property('statusCode', 200)
        })

        it.skip('Adds module to instance settings for nodes.install event', async function () {
            // future
        })

        it.skip('Does not add module to instance settings for nodes.install event with error', async function () {
            // future
        })

        it.skip('Removes module from instance settings for nodes.remove event', async function () {
            // future
        })

        it.skip('Adds module to instance settings for modules.install event', async function () {
            // future
        })
        describe('When an audit event for flows.set is received', function () {
            async function injectFlowSetEvent (app, device, token, deployType) {
                const url = `/logging/device/${device.hashid}/audit`
                const response = await app.inject({
                    method: 'POST',
                    url,
                    headers: {
                        authorization: `Bearer ${token}`
                    },
                    payload: { event: 'flows.set', type: deployType }
                })
                return response
            }
            before(async function () {
                app.config.features.register('deviceAutoSnapshot', true, true)
                // Enable deviceAutoSnapshot feature for default team type
                const defaultTeamType = await app.db.models.TeamType.findOne({ where: { name: 'starter' } })
                const defaultTeamTypeProperties = defaultTeamType.properties
                defaultTeamTypeProperties.features.deviceAutoSnapshot = true
                defaultTeamType.properties = defaultTeamTypeProperties
                await defaultTeamType.save()

                // stub sendCommandAwaitReply to fake the device response
                /** @type {DeviceCommsHandler} */
                const commsHandler = app.comms.devices
                sinon.stub(commsHandler, 'sendCommandAwaitReply').resolves({})

                // stub ProjectSnapshot controller `doDeviceAutoSnapshot`
                sinon.stub(app.db.controllers.ProjectSnapshot, 'doDeviceAutoSnapshot').resolves({})

                // spy app.config.features.enabled function
                sinon.spy(app.config.features, 'enabled')
            })
            afterEach(async function () {
                app.comms.devices.sendCommandAwaitReply.reset()
                app.db.controllers.ProjectSnapshot.doDeviceAutoSnapshot.reset()
                app.config.features.enabled.resetHistory()
            })
            after(async function () {
                app.config.features.register('deviceAutoSnapshot', false, false)
                app.comms.devices.sendCommandAwaitReply.restore()
                app.db.controllers.ProjectSnapshot.doDeviceAutoSnapshot.restore()
                app.config.features.enabled.restore()
            })
            it('Generates a snapshot for device when deploy type === full', async function () {
                app.config.features.enabled.resetHistory()
                const response = await injectFlowSetEvent(app, TestObjects.device1, TestObjects.tokens.device1, 'full')
                response.should.have.property('statusCode', 200)
                // wait a moment for the (stubbed) methods to be called asynchronously
                // then check if the `doDeviceAutoSnapshot` method was called
                // with the expected arguments
                await new Promise(resolve => setTimeout(resolve, 25))
                app.config.features.enabled.called.should.be.true() // the API calls `app.config.features.enabled` to check if the feature is enabled
                app.db.controllers.ProjectSnapshot.doDeviceAutoSnapshot.called.should.be.true()
                const args = app.db.controllers.ProjectSnapshot.doDeviceAutoSnapshot.lastCall.args
                args.should.have.length(4)
                should(args[0]).be.an.Object().and.have.property('id', TestObjects.device1.id)
                args[1].should.equal('full')
                should(args[2]).be.an.Object().and.deepEqual({ clean: true, setAsTarget: false })
                should(args[3]).be.an.Object()
                args[3].should.have.property('user')
            })
            it('Does not generates a snapshot for device if the deploy type is not one of full, flows or nodes', async function () {
                app.config.features.enabled.resetHistory()
                const response = await injectFlowSetEvent(app, TestObjects.device1, TestObjects.tokens.device1, 'bad-deploy-type')
                // response should be 200 even if the deploy type is not valid
                // that is because the audit event was processed successfully.
                // The auto snapshot feature is simply spawned and not awaited.
                response.should.have.property('statusCode', 200) // 200 is expected (the audit event was processed successfully)
                // wait a moment for the (stubbed) methods to be (not) called
                await new Promise(resolve => setTimeout(resolve, 25))
                app.config.features.enabled.called.should.be.false() // should not have reached the feature.enabled check in the API call
                app.db.controllers.ProjectSnapshot.doDeviceAutoSnapshot.called.should.be.false()
            })
        })
    })
})
