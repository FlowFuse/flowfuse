const should = require('should') // eslint-disable-line
const setup = require('../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Team Invitations API', function () {
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

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
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

    describe('Create an invitation', async function () {
        // POST /api/v1/teams/:teamId/invitations

        it('team owner can invite user to team', async () => {
            // Alice invite Chris to ATeam
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    user: 'chris'
                }
            })
            const result = response.json()
            result.should.have.property('status', 'okay')
            app.config.email.transport.getMessageQueue().should.have.lengthOf(1)
        })

        it('team member cannot invite user to team', async () => {
            // Bob cannot invite Chris to ATeam
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.bob },
                payload: {
                    user: 'chris'
                }
            })
            response.statusCode.should.equal(403)
        })

        it('admin can invite user to team they are not in', async () => {
            // Alice can invite Chris to BTeam
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    user: 'chris'
                }
            })
            const result = response.json()
            result.should.have.property('status', 'okay')
            app.config.email.transport.getMessageQueue().should.have.lengthOf(1)
        })

        it('team owner can invite multiple users to team', async () => {
            // Bob invite Alice,Chris to ATeam
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.bob },
                payload: {
                    user: 'chris , alice'
                }
            })
            const result = response.json()
            result.should.have.property('status', 'okay')
            app.config.email.transport.getMessageQueue().should.have.lengthOf(2)
        })

        it('owner cannot invite existing team user to team', async () => {
            // Alice cannot invite Bob to ATeam
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    user: 'bob'
                }
            })
            const result = response.json()
            result.should.have.property('status', 'error')
            result.message.should.have.property('bob', 'Already a member of the team')
            app.config.email.transport.getMessageQueue().should.have.lengthOf(0)
        })

        it('owner can request invites for existing and new users', async () => {
            // Alice invites Bob and Chris to ATeam - mixed result
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    user: 'bob, chris'
                }
            })
            const result = response.json()
            result.should.have.property('status', 'error')
            result.message.should.have.property('bob', 'Already a member of the team')
            // But an email is still sent to chris
            app.config.email.transport.getMessageQueue().should.have.lengthOf(1)
        })

        describe('external users', async function () {
            it('team owner cannot invite external user if disabled', async () => {
                // Alice cannot invite dave@example.com to ATeam
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${TestObjects.ATeam.hashid}/invitations`,
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: {
                        user: 'dave@example.com'
                    }
                })
                const result = response.json()
                result.should.have.property('status', 'error')
                result.message.should.have.property('dave@example.com', 'External invites not permitted')

                app.config.email.transport.getMessageQueue().should.have.lengthOf(0)
            })
        })
    })

    describe('List team invitations', async function () {
        // GET /api/v1/teams/:teamId/invitations

        it('admin can list team invites', async () => {
            // Alice can list CTeam invites
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.CTeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('count', 1)
            result.should.have.property('invitations')
            result.invitations[0].should.have.property('invitee')
            result.invitations[0].invitee.should.have.property('id', TestObjects.bob.hashid)
            result.invitations[0].team.should.have.property('name', 'CTeam')
        })

        it('member can not list team invites', async () => {
            // Chris can not list CTeam invites
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.CTeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
            const result = response.json()
            result.should.not.have.property('count', 1)
            result.should.not.have.property('invitations')
            result.should.have.property('error', 'unauthorized')
        })

        it('anonymous can not list team invites', async () => {
            // anonymous can not list CTeam invites
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.CTeam.hashid}/invitations`
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.not.have.property('count', 1)
            result.should.not.have.property('invitations')
            result.should.have.property('error', 'unauthorized')
        })
    })

    describe('Delete an invitation', async function () {
        // DELETE /api/v1/teams/:teamId/invitations/:invitationId

        it('team owner can delete invited user', async () => {
            // Alice accepts Bobs invite into CTeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.CTeam.hashid}/invitations/${TestObjects.invites.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.should.have.property('status', 'okay')
        })

        it('team member can not delete invite', async () => {
            // Chris can not delete invite to CTeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.CTeam.hashid}/invitations/${TestObjects.invites.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
            const result = response.json()
            result.should.have.property('error', 'unauthorized')
        })

        it('anonymous can not delete invite', async () => {
            // anonymous can not delete invite to CTeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.CTeam.hashid}/invitations/${TestObjects.invites.bob.hashid}`
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.have.property('error', 'unauthorized')
        })
    })
})
