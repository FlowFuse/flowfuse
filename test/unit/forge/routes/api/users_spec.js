const should = require('should') // eslint-disable-line
const setup = require('../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Users API', async function () {
    let app
    const TestObjects = {}

    beforeEach(async function () {
        app = await setup({
            features: { devices: true }
        })

        // alice : admin, team owner
        // bob : admin, team owner
        // chris (team owner)
        // dave <-- the only user who can be cleanly deleted
        // elvis <-- this user doesn't have email_verified

        // ATeam ( alice  (owner), bob (owner), chris)
        // BTeam ( bob (owner), chris, dave)
        // CTeam ( chris (owner), dave)

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', email_verified: true, password: 'ddPassword' })
        TestObjects.elvis = await app.db.models.User.create({ username: 'elvis', name: 'Elvis Dooku', email: 'elvis@example.com', email_verified: false, password: 'eePassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        TestObjects.CTeam = await app.db.models.Team.create({ name: 'CTeam', TeamTypeId: app.defaultTeamType.id })
        TestObjects.DTeam = await app.db.models.Team.create({ name: 'DTeam', TeamTypeId: app.defaultTeamType.id })

        // Alice set as ATeam owner in setup()
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.ATeam.addUser(TestObjects.elvis, { through: { role: Roles.Member } })
        await TestObjects.ATeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.dave, { through: { role: Roles.Member } })
        await TestObjects.CTeam.addUser(TestObjects.chris, { through: { role: Roles.Owner } })
        await TestObjects.CTeam.addUser(TestObjects.dave, { through: { role: Roles.Member } })
        await TestObjects.DTeam.addUser(TestObjects.dave, { through: { role: Roles.Owner } })
        await TestObjects.DTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.DTeam.addUser(TestObjects.elvis, { through: { role: Roles.Member } })

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')
        await login('dave', 'ddPassword')
        await login('elvis', 'eePassword')
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

    describe('Update user settings', async function () {
        describe('Default Team', async function () {
            // PUT /api/v1/users/:userId
            it('can set defaultTeam to a team the user is in', async function () {
                // Alice can set bobs default team to ATeam
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.bob.hashid}`,
                    payload: {
                        defaultTeam: TestObjects.ATeam.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('defaultTeam', TestObjects.ATeam.hashid)
            })
            it('cannot set defaultTeam to a team the user is not in', async function () {
                // Alice cannot set bobs default team to CTeam
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.bob.hashid}`,
                    payload: {
                        defaultTeam: TestObjects.CTeam.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                const result = response.json()
                result.should.have.property('error')
            })
            it('cannot set defaultTeam to null', async function () {
                // Alice cannot set bobs default team to null
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.bob.hashid}`,
                    payload: {
                        defaultTeam: null
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                const result = response.json()
                result.should.have.property('error')
            })
            it('cannot set defaultTeam to invalid value', async function () {
                // Alice cannot set bobs default team to 'abc'
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.bob.hashid}`,
                    payload: {
                        defaultTeam: 'abc'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                const result = response.json()
                result.should.have.property('error')
            })
        })
        describe('Modify a user', async function () {
            // PUT /api/v1/users/:userId  (sharedUser.updateUser)
            it('admin can manually verify email', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.elvis.hashid}`,
                    payload: {
                        email_verified: true
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('email_verified', true)
                result.should.not.have.property('error')
            })
            it('team owner can not manually verify email', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.elvis.hashid}`,
                    payload: {
                        email_verified: true
                    },
                    cookies: { sid: TestObjects.tokens.dave }
                })
                response.statusCode.should.equal(401)
                const result = response.json()
                result.should.have.property('error')
            })
            it('member can not manually verify own email', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.elvis.hashid}`,
                    payload: {
                        email_verified: true
                    },
                    cookies: { sid: TestObjects.tokens.elvis }
                })
                response.statusCode.should.equal(401)
                const result = response.json()
                result.should.have.property('error')
            })
            it('team member can not manually verify a users email', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.elvis.hashid}`,
                    payload: {
                        email_verified: true
                    },
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response.statusCode.should.equal(401)
                const result = response.json()
                result.should.have.property('error')
            })
            it('other team owner can not manually verify a users email', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.elvis.hashid}`,
                    payload: {
                        email_verified: true
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(401)
                const result = response.json()
                result.should.have.property('error')
            })
            it('anonymous can not manually verify a users email', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.elvis.hashid}`,
                    payload: {
                        email_verified: true
                    }
                })
                response.statusCode.should.equal(401)
                const result = response.json()
                result.should.have.property('error')
            })
        })
    })

    describe('Delete a user', async function () {
        // DELETE /api/v1/users/:userId

        it('Cannot delete an admin user', async function () {
            // Alice cannot delete Bob
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/users/${TestObjects.bob.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('error')
        })

        it('Admin cannot delete themselves', async function () {
            // Alice cannot delete Alice
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/users/${TestObjects.alice.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('error')
        })

        it('Cannot delete a team owner', async function () {
            // Alice cannot delete Chris
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/users/${TestObjects.chris.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('error')
        })

        it('Non-admin cannot delete user', async function () {
            // Chris cannot delete Dave
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/users/${TestObjects.dave.hashid}`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.have.property('error', 'unauthorized')
        })

        it('A deleted user can no longer access the API with an existing session token', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.dave }
            })
            response.statusCode.should.equal(200)
            const deleteResult = await app.inject({
                method: 'DELETE',
                url: `/api/v1/users/${TestObjects.elvis.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            deleteResult.statusCode.should.equal(200)
            const postDeleteResponse = await app.inject({
                method: 'GET',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.elvis }
            })
            postDeleteResponse.statusCode.should.equal(401)
        })

        it('Deleting a user removes pending invites for them', async function () {
            // Chris invites Elvis to TeamC
            // Delete Elvis
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.CTeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.chris },
                payload: {
                    user: 'elvis'
                }
            })
            response.statusCode.should.equal(200)
            const inviteListA = (await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.CTeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.chris }
            })).json()
            inviteListA.should.have.property('count', 1)
            const deleteResult = await app.inject({
                method: 'DELETE',
                url: `/api/v1/users/${TestObjects.elvis.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            deleteResult.statusCode.should.equal(200)
            const inviteListB = (await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.CTeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.chris }
            })).json()
            inviteListB.should.have.property('count', 0)
        })

        it('Deleting a user removes them from all teams they are in', async function () {
            // elvis is in ATeam and DTeam
            // - delete elvis - check the member lists

            const getTeamMembers = async (teamId) => {
                return (await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${teamId}/members`,
                    cookies: { sid: TestObjects.tokens.alice }
                })).json()
            }
            const membersBeforeA = await getTeamMembers(TestObjects.ATeam.hashid)
            const membersBeforeD = await getTeamMembers(TestObjects.DTeam.hashid)
            membersBeforeA.should.have.property('count', 4)
            membersBeforeD.should.have.property('count', 3)
            // ensure elvis was actually added
            membersBeforeA.members.filter(e => e.username === 'elvis').should.have.property('length', 1)
            membersBeforeD.members.filter(e => e.username === 'elvis').should.have.property('length', 1)

            await app.inject({
                method: 'DELETE',
                url: `/api/v1/users/${TestObjects.elvis.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const membersAfterA = await getTeamMembers(TestObjects.ATeam.hashid)
            const membersAfterD = await getTeamMembers(TestObjects.DTeam.hashid)
            membersAfterA.should.have.property('count', 3)
            membersAfterD.should.have.property('count', 2)
            // ensure elvis was actually removed
            membersAfterA.members.filter(e => e.username === 'elvis').should.have.property('length', 0)
            membersAfterA.members.filter(e => e.username === 'elvis').should.have.property('length', 0)
        })
    })
})
