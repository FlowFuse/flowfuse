const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
const setup = require('../setup')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Application API', function () {
    let app
    const TestObjects = {}
    beforeEach(async function () {
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

    afterEach(async function () {
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
            result.should.have.property('id')
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

            response.statusCode.should.equal(403)

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
            result.should.have.property('id')
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

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/applications/${TestObjects.application.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)
        })

        it('Owner: Deletes the application', async function () {
            const sid = await login('bob', 'bbPassword')

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/applications/${TestObjects.application.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)
        })

        it('Member: Errors if the user only has read access to the application', async function () {
            const sid = await login('chris', 'ccPassword') // member not owner

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/applications/${TestObjects.application.hashid}`,
                cookies: { sid }
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
                method: 'DELETE',
                url: `/api/v1/applications/${TestObjects.application.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(404)

            const result = response.json()
            result.should.have.property('code', 'not_found')
            result.should.have.property('error')
        })
    })
})
