const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../setup')

describe('Logging API', function () {
    let app
    const TestObjects = {
        tokens: {
            alice: null,
            project1: null,
            project2: null
        },
        team1: null,
        project1: null,
        project2: null,
        alice: null
    }

    before(async function () {
        app = await setup({})
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.team1 = app.team
        TestObjects.project1 = app.project
        TestObjects.project2 = await app.db.models.Project.create({ name: 'project2', type: '', url: '' })
        await TestObjects.team1.addProject(TestObjects.project2)
        TestObjects.tokens.project1 = (await TestObjects.project1.refreshAuthTokens()).token
        TestObjects.tokens.project2 = (await TestObjects.project2.refreshAuthTokens()).token

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
        delete TestObjects.alice
        app.db.controllers.Project.addProjectModule.restore()
        app.db.controllers.Project.removeProjectModule.restore()
    })

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
            payload: { event: 'nodes.install', module: '@flowforge/newmodule', version: '0.4.0', path: '/nodes' }
        })
        response.should.have.property('statusCode', 200)
        app.db.controllers.Project.addProjectModule.called.should.be.true()
        const args = app.db.controllers.Project.addProjectModule.lastCall.args
        args.should.have.length(3)
        args[0].should.have.property('id', TestObjects.project1.id)
        args[1].should.equal('@flowforge/newmodule')
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
            payload: { event: 'nodes.install', module: '@flowforge/error', error: 'not_found', version: '0.4.0', path: '/nodes' }
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
            payload: { event: 'nodes.remove', module: '@flowforge/removemodule', version: '0.4.0', path: '/nodes' }
        })
        response.should.have.property('statusCode', 200)
        app.db.controllers.Project.removeProjectModule.called.should.be.true()
        const args = app.db.controllers.Project.removeProjectModule.lastCall.args
        args.should.have.length(2)
        args[0].should.have.property('id', TestObjects.project1.id)
        args[1].should.equal('@flowforge/removemodule')
    })
})
