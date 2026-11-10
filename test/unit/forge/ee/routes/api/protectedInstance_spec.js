const crypto = require('crypto')

const TestModelFactory = require('../../../../../lib/TestModelFactory.js')
const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Protected Instance API', function () {
    const TestObjects = {
        tokens: {},
        /** @type {TestModelFactory} */
        factory: null
    }

    let app

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        const temp = { ...response.cookies[0] }
        temp.should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    before(async function () {
        app = await setup()

        const factory = new TestModelFactory(app)
        TestObjects.factory = factory

        TestObjects.team = app.team
        TestObjects.application = app.application
        TestObjects.instance = app.instance

        const userBob = await TestObjects.factory.createUser({
            admin: false,
            username: 'bob',
            name: 'Bob Kenobi',
            email: 'bob@example.com',
            password: 'bbPassword'
        })
        await TestObjects.team.addUser(userBob, { through: { role: Roles.Member } })

        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
    })

    after(async function () {
        app.close()
    })

    it('allow Owner to change protected status', async function () {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/projects/${TestObjects.instance.id}/protectInstance`,
            body: { enabled: true },
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(200)
    })
    it('forbid Member to change protected status', async function () {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/projects/${TestObjects.instance.id}/protectInstance`,
            body: { enabled: true },
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(403)
    })
    it('allow Owner to clear protected status', async function () {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/projects/${TestObjects.instance.id}/protectInstance`,
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(200)
    })
    it('forbid Member to clear protected status', async function () {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/projects/${TestObjects.instance.id}/protectInstance`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(403)
    })
    it('allow Member to read protected status', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.instance.id}/protectInstance`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(200)
    })

    describe('Rollback', function () {
        let snapshot

        async function rollback (sid) {
            return app.inject({
                method: 'POST',
                url: `/api/v1/projects/${TestObjects.instance.id}/actions/rollback`,
                payload: { snapshot: snapshot.hashid },
                cookies: { sid }
            })
        }

        async function setProtected (enabled) {
            await TestObjects.instance.updateProtectedInstanceState(enabled ? { enabled: true } : null)
        }

        async function currentFlows () {
            const storage = await app.db.models.StorageFlow.byProject(TestObjects.instance.id)
            return storage?.flow
        }

        before(async function () {
            const userChris = await TestObjects.factory.createUser({
                admin: false,
                username: 'chris',
                name: 'Chris Kenobi',
                email: 'chris@example.com',
                password: 'ccPassword'
            })
            await TestObjects.team.addUser(userChris, { through: { role: Roles.Owner } })
            await login('chris', 'ccPassword')
            await TestObjects.factory.createUser({
                admin: true,
                username: 'dave',
                name: 'Dave Kenobi',
                email: 'dave@example.com',
                password: 'ddPassword'
            })
            await login('dave', 'ddPassword')
            await TestObjects.instance.updateSetting('credentialSecret', crypto.randomBytes(32).toString('hex'))

            snapshot = await TestObjects.factory.createSnapshot({
                name: 'snapshot',
                flows: { flows: [{ id: 'snapshot-tab', type: 'tab' }] }
            }, TestObjects.instance, userChris)
        })

        beforeEach(async function () {
            await app.db.controllers.StorageFlows.updateOrCreateForProject(TestObjects.instance, JSON.stringify([{ id: 'current-tab', type: 'tab' }]))
        })

        afterEach(async function () {
            await setProtected(false)
        })

        it('forbids a Member rolling back a protected instance', async function () {
            await setProtected(true)
            const response = await rollback(TestObjects.tokens.bob)
            response.statusCode.should.equal(403)
            response.json().should.have.property('code', 'protected_instance')
            ;(await currentFlows()).should.containEql('current-tab')
        })

        it('allows an Owner to roll back a protected instance', async function () {
            await setProtected(true)
            const response = await rollback(TestObjects.tokens.chris)
            response.statusCode.should.equal(200)
            ;(await currentFlows()).should.containEql('snapshot-tab')
        })

        it('allows an admin outside the team to roll back a protected instance', async function () {
            await setProtected(true)
            const response = await rollback(TestObjects.tokens.dave)
            response.statusCode.should.equal(200)
            ;(await currentFlows()).should.containEql('snapshot-tab')
        })

        it('allows a Member to roll back an unprotected instance', async function () {
            const response = await rollback(TestObjects.tokens.bob)
            response.statusCode.should.equal(200)
            ;(await currentFlows()).should.containEql('snapshot-tab')
        })
    })
})
