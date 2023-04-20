const should = require('should') // eslint-disable-line

const { KEY_SETTINGS } = require('../../../../../forge/db/models/ProjectSettings')
const setup = require('../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Application API', function () {
    let app
    const TestObjects = {}
    let objectCount = 0
    const generateName = (root = 'object') => `${root}-${objectCount++}`

    before(async function () {
        app = await setup()

        // ATeam ( alice  (owner), bob )
        // BTeam ( bob (owner), chris )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Crackers', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'Dave Smith', email: 'dave@example.com', email_verified: true, password: 'ddPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })

        // alice : admin - owns ateam (setup)
        // bob - owner of bteam
        // chris - member of b team
        // dave - not connected to any teams
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })

        TestObjects.application = await app.db.models.Application.create({
            name: 'B-team Application',
            TeamId: TestObjects.BTeam.id
        })
    })

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        return response.cookies[0].value
    }

    after(async function () {
        await app.close()
    })

    describe('Create application', async function () {
        // POST /api/v1/application
        it('Admin: Create a simple application', async function () {
            const sid = await login('alice', 'aaPassword')

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/applications',
                cookies: { sid },
                payload: {
                    name: 'my first application',
                    teamId: TestObjects.ATeam.hashid
                }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            const newApplication = await app.db.models.Application.byId(result.id)
            result.should.have.property('id', newApplication.hashid)
            result.should.have.property('name', 'my first application')
        })

        it('Owner: Create a simple application', async function () {
            const sid = await login('bob', 'bbPassword')

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/applications',
                cookies: { sid },
                payload: {
                    name: 'my second application',
                    teamId: TestObjects.BTeam.hashid
                }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'my second application')
        })

        it('Member: Cannot create an application', async function () {
            const sid = await login('chris', 'ccPassword')

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/applications',
                cookies: { sid },
                payload: {
                    name: 'my second application',
                    teamId: TestObjects.BTeam.hashid
                }
            })

            response.statusCode.should.equal(403)

            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error')
        })

        it('None: Cannot create an application for another team', async function () {
            const sid = await login('bob', 'bbPassword')

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/applications',
                cookies: { sid },
                payload: {
                    name: 'my first application',
                    teamId: TestObjects.ATeam.hashid // wrong team
                }
            })

            response.statusCode.should.equal(401)

            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error')
        })
    })

    describe('Get application info', async function () {
        it('Admin: Returns application info', async function () {
            const sid = await login('alice', 'aaPassword')

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${TestObjects.application.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            result.should.have.property('id', TestObjects.application.hashid)
            result.should.have.property('name', 'B-team Application')
        })

        it('Owner: Returns application info', async function () {
            const sid = await login('bob', 'bbPassword')

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${TestObjects.application.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'B-team Application')
        })

        it('Member: Returns application info', async function () {
            const sid = await login('chris', 'ccPassword')

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${TestObjects.application.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'B-team Application')
        })

        it('None: Errors if the user is not a member of the application', async function () {
            const sid = await login('dave', 'ddPassword')

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${TestObjects.application.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(404)

            const result = response.json()
            result.should.have.property('code', 'not_found')
            result.should.have.property('error')
        })
    })

    describe('Update application', async function () {
        it('Admin: Can update the application properties', async function () {
            const sid = await login('alice', 'aaPassword') // admin

            // Alice
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/applications/${TestObjects.application.hashid}`,
                cookies: { sid },
                payload: {
                    name: 'Updated Name'
                }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            result.should.have.property('name', 'Updated Name')
        })

        it('Owner: Can update the application properties', async function () {
            const sid = await login('bob', 'bbPassword') // owner

            // Alice
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/applications/${TestObjects.application.hashid}`,
                cookies: { sid },
                payload: {
                    name: 'Updated Name'
                }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            result.should.have.property('name', 'Updated Name')
        })

        it('Member: Can update the application properties', async function () {
            const sid = await login('chris', 'ccPassword') // member

            // Alice
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/applications/${TestObjects.application.hashid}`,
                cookies: { sid },
                payload: {
                    name: 'Updated Name'
                }
            })

            response.statusCode.should.equal(403)

            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error')
        })

        it('None: Errors if the user is not a member of the application', async function () {
            const sid = await login('dave', 'ddPassword') // not connected

            // Bob (non-admin)
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/applications/${TestObjects.application.hashid}`,
                cookies: { sid },
                payload: {
                    name: 'Updated Name'
                }
            })

            response.statusCode.should.equal(404)

            const result = response.json()
            result.should.have.property('code', 'not_found')
            result.should.have.property('error')
        })
    })

    describe('Delete application', async function () {
        it('All: Prevents deleting an application with projects', async function () {
            const sid = await login('alice', 'aaPassword')

            await app.db.models.Project.create({ name: 'new-project', type: 'basic', url: 'http://instance1.example.com', ApplicationId: TestObjects.application.id })

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/applications/${TestObjects.application.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(422)

            const result = response.json()
            result.should.have.property('code', 'invalid_application')
            result.should.have.property('error')
        })

        it('Admin: Deletes the application', async function () {
            const sid = await login('alice', 'aaPassword')
            const application = await app.factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/applications/${application.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)
        })

        it('Owner: Deletes the application', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await app.factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/applications/${application.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)
        })

        it('Member: Errors if the user only has read access to the application', async function () {
            const sid = await login('chris', 'ccPassword') // member not owner
            const application = await app.factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/applications/${application.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(403)

            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error')
        })

        it('None: Errors if the user is not a member of the application', async function () {
            const sid = await login('dave', 'ddPassword') // not connected
            const application = await app.factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)

            // Bob (non-admin)
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/applications/${application.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(404)

            const result = response.json()
            result.should.have.property('code', 'not_found')
            result.should.have.property('error')
        })
    })

    describe('List instances', async function () {
        it('Returns application instances - empty list', async function () {
            const sid = await login('bob', 'bbPassword')

            const application = await app.factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${application.hashid}/instances`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            result.should.have.property('instances')
            result.instances.should.have.length(0)
        })

        it('Returns application instances - non-empty list', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await app.factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)

            const instance = await app.factory.createInstance({ name: 'main-instance' }, application, app.stack, app.template, app.projectType, { start: true })
            await instance.updateSetting(KEY_SETTINGS, { httpAdminRoot: '/editor' })

            // Create another project *not* in the Application
            // to verify it doesn't get included in the list
            const otherApplication = await app.factory.createApplication({ name: generateName('other-application') }, TestObjects.BTeam)
            await app.factory.createInstance({ name: generateName('other-instance') }, otherApplication, app.stack, app.template, app.projectType, { start: false })

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${application.hashid}/instances`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            result.should.have.property('instances')
            result.instances.should.have.length(1)
            result.instances[0].should.have.property('id', instance.id)
            result.instances[0].should.have.property('name', instance.name)
        })

        it('Includes each instances URL accounting for httpAdminRoot', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await app.factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)

            const name = generateName('main-instance')
            const instance = await app.factory.createInstance({ name }, application, app.stack, app.template, app.projectType, { start: true })
            await instance.updateSetting(KEY_SETTINGS, { httpAdminRoot: '/editor' })

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${application.hashid}/instances`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            result.should.have.property('instances')
            result.instances.should.have.length(1)
            result.instances[0].should.have.property('id', instance.id)
            result.instances[0].should.have.property('url', `http://${name}.example.com/editor`) // from stub driver
        })
    })

    describe('List instances statuses', async function () {
        it('Returns application instance statuses & meta', async function () {
            const application = await app.factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const instance1 = await app.factory.createInstance({ name: generateName('instance-b') }, application, app.stack, app.template, app.projectType, { start: false })
            const instance2 = await app.factory.createInstance({ name: generateName('instance-b') }, application, app.stack, app.template, app.projectType)
            const instance3 = await app.factory.createInstance({ name: generateName('instance-b') }, application, app.stack, app.template, app.projectType, { start: false })

            // Started
            const startResult = await app.containers.start(instance1)
            await startResult.started

            // Suspended
            await app.containers.stop(instance2)

            const sid = await login('bob', 'bbPassword')

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${application.hashid}/instances/status`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            result.should.have.property('instances')
            result.instances.should.have.length(3)

            const instance1Results = result.instances.find((instance) => instance.id === instance1.id)
            instance1Results.meta.state.should.equal('running')

            const instance2Results = result.instances.find((instance) => instance.id === instance2.id)
            instance2Results.meta.state.should.equal('suspended')

            const instance3Results = result.instances.find((instance) => instance.id === instance3.id)
            instance3Results.meta.state.should.equal('unknown')
        })
    })
})
