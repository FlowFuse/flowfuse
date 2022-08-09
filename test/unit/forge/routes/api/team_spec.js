const should = require('should') // eslint-disable-line
const setup = require('../setup')
// const FF_UTIL = require('flowforge-test-utils')
// const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Team API', function () {
    let app
    const TestObjects = {}
    beforeEach(async function () {
        app = await setup()

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

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

    afterEach(async function () {
        await app.close()
    })

    describe('Get team details', async function () {
        // GET /api/v1/teams/:teamId
        // - Must be admin or team owner/member
    })

    describe('Get team details by slug', async function () {
        // GET /api/v1/teams/:teamId?slug=<teamSlug>
        // - Must be admin or team owner/member
    })

    describe('Get list of teams', async function () {
        // GET /api/v1/teams/:teamId
        // - Admin only
    })

    describe('Get list of a teams projects', async function () {
        // GET /api/v1/teams/:teamId/projects
        // - Admin/Owner/Member
    })

    describe('Create team', async function () {
        // POST /api/v1/teams
        // - Admin/Owner/Member
    })

    describe('Delete team', async function () {
        // DELETE /api/v1/teams/:teamId
        // - Admin/Owner/Member
        // - should fail if team owns projects
    })

    describe('Edit team details', async function () {
        // PUT /api/v1/teams/:teamId
    })

    describe('Get current users membership', async function () {
        // GET /api/v1/teams/:teamId/user
    })

    describe('Get team audit-log', async function () {
        // GET /api/v1/teams/:teamId/audit-log
    })
})
