const should = require('should') // eslint-disable-line
const setup = require('../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('User Invitations API', function () {
    let app
    const TestObjects = {}

    beforeEach(async function () {
        app = await setup()

        // alice : admin
        // bob
        // chris

        // ATeam ( alice  (owner), bob )
        // BTeam ( bob (owner) )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'David Dooku', email: 'dave@example.com', email_verified: true, password: 'ddPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam' })
        TestObjects.CTeam = await app.db.models.Team.create({ name: 'CTeam' })

        // Alice set as ATeam owner in setup()
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.CTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })
        await TestObjects.CTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })

        // generate invite for bob to join CTeam
        TestObjects.invites = await app.db.controllers.Invitation.createInvitations(TestObjects.alice, TestObjects.CTeam, ['bob'])

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')
        await login('dave', 'ddPassword')
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

    describe('List invitations', async function () {
        // PATCH /api/v1/user/invitations

        it('user can list own invitations (1 invite)', async () => {
            // Bob can list own team invites (should have 1 invite)
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user/invitations',
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('count', 1)
            result.should.have.property('invitations')
            result.invitations[0].should.have.property('invitee')
            result.invitations[0].invitee.should.have.property('id', TestObjects.bob.hashid)
            result.invitations[0].team.should.have.property('name', 'CTeam')
        })
        it('user can list own invitations (no invites)', async () => {
            // Dave can list own team invites (should be no invite)
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user/invitations',
                cookies: { sid: TestObjects.tokens.dave }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('count', 0)
            result.should.have.property('invitations', [])
        })
        it('anonymous can not list invitations', async () => {
            // non user can not list invites
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user/invitations'
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.have.property('error', 'unauthorized')
        })
    })

    describe('Accept an invitation', async function () {
        // PATCH /api/v1/user/invitations/:invitationId

        it('member user can accept own team invitation', async () => {
            // Bob can accept invite to CTeam
            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/user/invitations/${TestObjects.invites.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('status', 'okay')
        })

        it('other team member can not accept another members team invitation', async () => {
            // Chris should not be able to accept bobs invite to CTeam
            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/user/invitations/${TestObjects.invites.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
            // TODO: should be a JSON or HTML response?
            //       Additional tests might be necessary once a suitable
            //       response is determined. For now, we verify a 403 is returned
        })

        it('non team member can not accept another members team invitation', async () => {
            // Dave should not be able to accept bobs invite to CTeam
            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/user/invitations/${TestObjects.invites.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.dave }
            })
            response.statusCode.should.equal(403)
            // TODO: should be a JSON or HTML response?
            //       Additional tests might be necessary once a suitable
            //       response is determined. For now, we verify a 403 is returned
        })

        it('anonymous can not accept another members team invitation', async () => {
            // anonymous should not be able to accept bobs invite to CTeam
            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/user/invitations/${TestObjects.invites.bob.hashid}`
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.not.have.property('status', 'okay')
            result.should.have.property('error', 'unauthorized')
        })
    })

    describe('Delete an invitation', async function () {
        // DELETE /api/v1/user/invitations/:invitationId

        it('admin user can delete invitation', async () => {
            // Alice can delete bobs invite to CTeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/user/invitations/${TestObjects.invites.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('status', 'okay')
        })

        it('member user can delete own team invitation', async () => {
            // Bob can delete his own invite
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/user/invitations/${TestObjects.invites.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('status', 'okay')
        })

        it('other team member can not delete invitation', async () => {
            // Chris can not delete bobs invite to CTeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/user/invitations/${TestObjects.invites.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
            // TODO: should be a JSON or HTML response?
            //       Additional tests might be necessary once a suitable
            //       response is determined. For now, we verify a 403 is returned
        })

        it('non team member can not delete invitation', async () => {
            // Dave can not delete bobs invite to CTeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/user/invitations/${TestObjects.invites.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.dave }
            })
            response.statusCode.should.equal(403)
            // TODO: should be a JSON or HTML response?
            //       Additional tests might be necessary once a suitable
            //       response is determined. For now, we verify a 403 is returned
        })

        it('anonymous can not delete invitation', async () => {
            // anonymous can not delete bobs invite to CTeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/user/invitations/${TestObjects.invites.bob.hashid}`
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.not.have.property('status', 'okay')
            result.should.have.property('error', 'unauthorized')
        })
    })
})
