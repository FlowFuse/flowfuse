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
    })
})
