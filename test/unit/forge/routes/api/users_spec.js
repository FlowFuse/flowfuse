const should = require('should') // eslint-disable-line
const setup = require('../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Users API', async function () {
    let app
    const TestObjects = {}
    // async function getAuditLog (limit = 1) {
    //     const logEntries = await app.db.models.AuditLog.forPlatform({ limit: limit || 1 })
    //     const logRaw = [...(logEntries.log || [])]
    //     const result = app.db.views.AuditLog.auditLog(logEntries)
    //     return { log: result.log, logRaw }
    // }

    before(async function () {
        app = await setup({
            limits: { users: 50, instances: 50 },
            features: { devices: true }
        })

        // alice : admin, team owner
        // bob : admin, team owner
        // chris (team owner)
        // dave <-- the only user who can be cleanly deleted
        // elvis <-- this user doesn't have email_verified

        // fred <-- this user only gets created in the 'delete' tests. Do not add elsewhere
        // harry sso_enabled <-- added in the sso test - do not add elsewhere

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
    const getUsers = async (limit, cursor, search) => {
        const query = {}
        // app.inject will inject undefined values as the string 'undefined' rather
        // than ignore them. So need to build-up the query object the long way
        if (limit !== undefined) {
            query.limit = limit
        }
        if (cursor !== undefined) {
            query.cursor = cursor
        }
        if (search !== undefined) {
            query.query = search
        }
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/users',
            query,
            cookies: { sid: TestObjects.tokens.alice }
        })
        return response.json()
    }

    after(async function () {
        await app.close()
    })
    describe('List users', async function () {
        it('returns a list of all users', async function () {
            const result = await getUsers()
            result.users.should.have.length(5)
        })

        it('can page through list', async function () {
            const firstPage = await getUsers(2)
            firstPage.should.have.property('meta')
            firstPage.meta.should.have.property('next_cursor', TestObjects.bob.hashid)
            firstPage.users.should.have.length(2)
            firstPage.users[0].should.have.property('username', 'alice')
            firstPage.users[1].should.have.property('username', 'bob')

            const secondPage = await getUsers(2, firstPage.meta.next_cursor)
            secondPage.should.have.property('meta')
            secondPage.meta.should.have.property('next_cursor', TestObjects.dave.hashid)
            secondPage.users.should.have.length(2)
            secondPage.users[0].should.have.property('username', 'chris')
            secondPage.users[1].should.have.property('username', 'dave')

            const thirdPage = await getUsers(2, secondPage.meta.next_cursor)
            thirdPage.should.have.property('meta')
            thirdPage.meta.should.not.have.property('next_cursor')
            thirdPage.users.should.have.length(1)
            thirdPage.users[0].should.have.property('username', 'elvis')
        })
        it('can search for users - name', async function () {
            const firstPage = await getUsers(undefined, undefined, 'kE')
            firstPage.should.have.property('meta')
            firstPage.meta.should.not.have.property('next_cursor')
            firstPage.users.should.have.length(2)
            firstPage.users[0].should.have.property('username', 'alice') // skywalKEr
            firstPage.users[1].should.have.property('username', 'chris') // KEnobi
        })
        it('can search for users - username', async function () {
            const firstPage = await getUsers(undefined, undefined, 'is')
            firstPage.should.have.property('meta')
            firstPage.meta.should.not.have.property('next_cursor')
            firstPage.users.should.have.length(2)
            firstPage.users[0].should.have.property('username', 'chris')
            firstPage.users[1].should.have.property('username', 'elvis')
        })
        it('can search for users - email', async function () {
            const firstPage = await getUsers(undefined, undefined, 'E@')
            firstPage.should.have.property('meta')
            firstPage.meta.should.not.have.property('next_cursor')
            firstPage.users.should.have.length(2)
            firstPage.users[0].should.have.property('username', 'alice')
            firstPage.users[1].should.have.property('username', 'dave')
        })
    })

    describe('Create a new user', async function () {
        // POST /api/v1/users
        it.skip('Admin can create a new user', async function () {
            // TODO: test audit log has 'users.create-user'  { status: 'okay', user: {} }
        })
        it.skip('Can not create a new user with the name admin or root', async function () {
            // TODO: test audit log has 'users.create-user'  { code: 'invalid_username', error: 'xxx' }
        })
        it.skip('Can not create a new user because of team limit', async function () {
            // TODO: test audit log has 'users.create-user'  { code: 'team_limit_reached', error: 'xxx' }
        })
        it.skip('Can not create a new user with duplicate username', async function () {
            // TODO: test audit log has 'users.create-user'  { code: 'invalid_username', error: 'username not available' }
        })
        it.skip('Can not create a new user with duplicate email', async function () {
            // TODO: test audit log has 'users.create-user'  { code: 'invalid_email', error: 'email not available' }
        })
        it.skip('Non admin can not create a new user', async function () {
            // TODO: response should be unauthorised
        })
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
                // ensure platform audit log entry is made
                // TODO: re-introduce audit log tests below once #1183 is complete
                // const auditLogs = await getAuditLog(1)
                // auditLogs.log[0].should.have.a.property('event', 'users.update-user') // what happened
                // auditLogs.log[0].should.have.a.property('trigger').and.be.an.Object() // who/what did it
                // auditLogs.log[0].trigger.should.have.a.property('id', TestObjects.alice.id) // actioned by
                // auditLogs.log[0].should.have.a.property('scope').and.be.an.Object() // who/what was affected
                // auditLogs.log[0].scope.should.have.a.property('id', TestObjects.elvis.id.toString()) // affected user
                // auditLogs.log[0].should.have.a.property('body') // details
                // // check updates were recorded
                // auditLogs.log[0].body.should.have.a.property('updates')
                // auditLogs.log[0].body.updates.should.have.a.property('length', 1)
                // auditLogs.log[0].body.updates[0].key.should.eql('email_verified') // property changed
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
                response.statusCode.should.equal(403)
                const result = response.json()
                result.should.have.property('error')
            })
            it('member can not manually verify own email', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.elvis.hashid}`,
                    payload: {
                        email_verified: false
                    },
                    cookies: { sid: TestObjects.tokens.elvis }
                })
                // This is a 400 because they are operating on themselves, but
                // making an invalid request.
                response.statusCode.should.equal(400)
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
                // 403 because they are forbidden from updating another user
                response.statusCode.should.equal(403)
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
                response.statusCode.should.equal(403)
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
            it('admin can modify sso_enabled user email', async function () {
                const harry = await app.db.models.User.create({ username: 'harry', name: 'Harry Palpatine', email: 'harry@example.com', email_verified: true, password: 'hhPassword', sso_enabled: true })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${harry.hashid}`,
                    payload: {
                        email: 'harry2@example.com'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('email', 'harry2@example.com')

                await harry.reload()
                harry.sso_enabled.should.be.false()

                await harry.destroy()
            })
            it('user can not set invalid username', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/users/${TestObjects.alice.hashid}`,
                    payload: {
                        username: '<img src="foo.png">'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                const body = response.json()
                body.should.have.property('code', 'invalid_request')
                body.should.have.property('error', 'Error: Invalid username')
            })
        })
    })

    describe('Delete a user', async function () {
        // DELETE /api/v1/users/:userId

        beforeEach(async function () {
            // Create a user just for the delete tests
            const fred = await app.db.models.User.byUsername('fred')
            if (!fred) {
                TestObjects.fred = await app.db.models.User.create({ username: 'fred', name: 'Fred Binks', email: 'fred@example.com', email_verified: false, password: 'ffPassword' })
                await login('fred', 'ffPassword')
                await TestObjects.ATeam.addUser(TestObjects.fred, { through: { role: Roles.Member } })
                await TestObjects.DTeam.addUser(TestObjects.fred, { through: { role: Roles.Member } })
            }
        })

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
            // TODO: test audit log has 'users.delete-user'  { code: 'unexpected_error', error: err.toString(), user: request.user }
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
            response.statusCode.should.equal(403)
            const result = response.json()
            result.should.have.property('error', 'unauthorized')
        })

        it('A deleted user can no longer access the API with an existing session token', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.fred }
            })
            response.statusCode.should.equal(200)
            const deleteResult = await app.inject({
                method: 'DELETE',
                url: `/api/v1/users/${TestObjects.fred.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            deleteResult.statusCode.should.equal(200)
            const postDeleteResponse = await app.inject({
                method: 'GET',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.fred }
            })
            postDeleteResponse.statusCode.should.equal(401)
        })

        it('Deleting a user removes pending invites for them', async function () {
            // Chris invites Fred to TeamC
            // Delete Fred
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.CTeam.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.chris },
                payload: {
                    user: 'fred'
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
                url: `/api/v1/users/${TestObjects.fred.hashid}`,
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
            // fred is in ATeam and DTeam
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
            membersBeforeA.should.have.property('count', 5)
            membersBeforeD.should.have.property('count', 4)
            // ensure elvis was actually added
            membersBeforeA.members.filter(e => e.username === 'fred').should.have.property('length', 1)
            membersBeforeD.members.filter(e => e.username === 'fred').should.have.property('length', 1)

            await app.inject({
                method: 'DELETE',
                url: `/api/v1/users/${TestObjects.fred.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const membersAfterA = await getTeamMembers(TestObjects.ATeam.hashid)
            const membersAfterD = await getTeamMembers(TestObjects.DTeam.hashid)
            membersAfterA.should.have.property('count', 4)
            membersAfterD.should.have.property('count', 3)
            // ensure elvis was actually removed
            membersAfterA.members.filter(e => e.username === 'fred').should.have.property('length', 0)
            membersAfterA.members.filter(e => e.username === 'fred').should.have.property('length', 0)

            // TODO: test audit log has 'users.delete-user'  { status: 'okay', user: request.user }
        })
    })

    describe('Suspend User', async function () {
        it('Suspend/Resume elvis', async function () {
            await app.db.controllers.User.suspend(TestObjects.elvis)
            const suspendedResponse = await app.inject({
                method: 'POST',
                url: '/account/login',
                payload: { username: 'elvis', password: 'eePassword', remember: false }
            })
            suspendedResponse.should.have.property('statusCode', 403)
            TestObjects.elvis.suspended = false
            await TestObjects.elvis.save()
            const response = await app.inject({
                method: 'POST',
                url: '/account/login',
                payload: { username: 'elvis', password: 'eePassword', remember: false }
            })
            response.should.have.property('statusCode', 200)
            // ensure audit log entry is made
            // TODO: re-introduce audit log tests below once #1183 is complete
            // const auditLogs = await getAuditLog(2) // get last 2
            // // the oldest entry should be a failed login
            // auditLogs.log[1].should.have.a.property('event', 'account.login') // what happened
            // // check an error was included in details
            // auditLogs.log[1].body.should.have.a.property('error').and.be.an.Object()
            // auditLogs.log[1].body.error.should.have.a.property('code', 'user_suspended')
            // auditLogs.log[1].body.error.should.have.a.property('message')
            // auditLogs.log[1].body.should.have.a.property('user').and.be.an.Object()
            // auditLogs.log[1].body.user.should.have.a.property('username', 'elvis')

            // // the latest entry should be a successful login
            // auditLogs.log[0].should.have.a.property('trigger').and.be.a.Object()
            // auditLogs.log[0].trigger.should.have.a.property('id', TestObjects.elvis.id)
            // auditLogs.log[0].trigger.should.have.a.property('name', 'elvis')
            // auditLogs.log[0].should.have.a.property('event', 'account.login')
            // if (auditLogs.log[0].body) {
            //     auditLogs.log[0].body.should.not.have.property('error')
            // }
        })
        it('Admin can suspend another user', async function () {
            const elvis = await app.db.views.User.userProfile(TestObjects.elvis)
            elvis.suspended = true
            const suspendResponse = await app.inject({
                method: 'PUT',
                url: `/api/v1/users/${TestObjects.elvis.hashid}`,
                payload: { suspended: true },
                cookies: { sid: TestObjects.tokens.alice }
            })
            suspendResponse.should.have.property('statusCode', 200)
            suspendResponse.json().should.have.property('id', TestObjects.elvis.hashid)
            suspendResponse.json().should.have.property('suspended', true)

            TestObjects.elvis.suspended = false
            await TestObjects.elvis.save()

            // TODO: test audit log has { status: 'okay', old: originalValues, new: newValues, user: logUserInfo }
        })
        it('Admin cannot suspend themselves', async function () {
            const alice = await app.db.views.User.userProfile(TestObjects.alice)
            alice.suspended = true
            const suspendResponse = await app.inject({
                method: 'PUT',
                url: `/api/v1/users/${TestObjects.alice.hashid}`,
                payload: alice,
                cookies: { sid: TestObjects.tokens.alice }
            })
            suspendResponse.should.have.property('statusCode', 400)
            suspendResponse.json().should.have.property('error', 'cannot suspend self')

            // TODO: test audit log has { code: 'invalid_request', error: 'cannot suspend self' }
            // Consider also testing response has code: 'invalid_request' ?
        })
    })

    describe('User teams', async function () {
        it('lists a users teams - as admin', async function () {
            await login('alice', 'aaPassword')
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/users/${TestObjects.bob.hashid}/teams`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('count', 2)
            result.should.have.property('teams')
            result.teams.should.have.length(2)
            result.teams[0].should.have.property('id', TestObjects.ATeam.hashid)
            result.teams[1].should.have.property('id', TestObjects.BTeam.hashid)
        })
        it('lists a users teams - as self', async function () {
            await login('bob', 'bbPassword')
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/users/${TestObjects.bob.hashid}/teams`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('count', 2)
            result.should.have.property('teams')
            result.teams.should.have.length(2)
            result.teams[0].should.have.property('id', TestObjects.ATeam.hashid)
            result.teams[1].should.have.property('id', TestObjects.BTeam.hashid)
        })
        it('non-admin cannot list another users teams', async function () {
            await login('chris', 'ccPassword')
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/users/${TestObjects.bob.hashid}/teams`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
        })
    })
})
