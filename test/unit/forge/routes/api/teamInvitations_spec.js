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

        // Alice set as ATeam owner in setup()
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })

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
                    user: 'chris',
                    role: Roles.Viewer
                }
            })
            const result = response.json()
            result.should.have.property('status', 'okay')
            app.config.email.transport.getMessageQueue().should.have.lengthOf(1)

            const invites = await app.db.models.Invitation.findAll()
            invites.should.have.lengthOf(1)
            invites[0].should.have.property('role', Roles.Viewer)
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
                },
                role: Roles.Member
            })
            const result = response.json()
            result.should.have.property('status', 'okay')
            app.config.email.transport.getMessageQueue().should.have.lengthOf(1)
            const invites = await app.db.models.Invitation.findAll()
            invites.should.have.lengthOf(1)
            invites[0].should.have.property('role', Roles.Member)
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
            result.should.have.property('code', 'invitation_failed')
            result.should.have.property('error')
            result.error.should.have.property('bob', 'Already a member of the team')
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
            result.should.have.property('code', 'invitation_failed')
            result.should.have.property('error')
            result.error.should.have.property('bob', 'Already a member of the team')
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
                result.should.have.property('code', 'invitation_failed')
                result.should.have.property('error')
                result.error.should.have.property('dave@example.com', 'External invites not permitted')

                app.config.email.transport.getMessageQueue().should.have.lengthOf(0)
            })
        })
    })

    describe('List team invitations', async function () {
        // GET /api/v1/teams/:teamId/invitations

    })

    describe('Delete an invitation team member', async function () {
        // DELETE /api/v1/teams/:teamId/invitations/:invitationId
    })
})
