const should = require('should') // eslint-disable-line
const setup = require('../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('User API', async function () {
    let app
    const TestObjects = {}

    async function setupApp (license) {
        const setupConfig = { limits: { instances: 50, users: 50 }, features: { devices: true } }
        if (license) {
            setupConfig.license = license
        }
        app = await setup(setupConfig)
        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        TestObjects.Project1 = app.project
        TestObjects.tokens = {}
        await setupUsers()
    }
    async function setupUsers () {
        await app.db.models.TeamMember.destroy({ where: {} })
        await app.db.models.User.destroy({ where: {} })

        // alice : admin, team owner
        // bob: admin, (sso_enabled)
        // chris : (unverified_email)
        // dave : (password_expired)
        // elvis: (no teams)
        // frank: (B team owner)
        // grace: (B team member only)
        // harry: not-admin, sso_enabled

        // ATeam ( alice  (owner), bob (owner), chris, dave)
        // BTeam ( bob (owner), chris, dave)

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        if (!TestObjects.alice) {
            TestObjects.alice = await app.db.models.User.create({
                admin: true,
                username: 'alice',
                name: 'Alice Skywalker',
                email: 'alice@example.com',
                password: 'aaPassword',
                email_verified: 'true'
            })
            await TestObjects.ATeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })
        }
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword', admin: true, sso_enabled: true })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', password: 'ccPassword' })
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', password: 'ddPassword', email_verified: true, password_expired: true })
        TestObjects.elvis = await app.db.models.User.create({ username: 'elvis', name: 'Elvis Dooku', email: 'elvis@example.com', email_verified: true, password: 'eePassword' })
        TestObjects.frank = await app.db.models.User.create({ username: 'frank', name: 'Frank Stein', email: 'frank@example.com', email_verified: true, password: 'ffPassword' })
        TestObjects.grace = await app.db.models.User.create({ username: 'grace', name: 'Grace Hut', email: 'grace@example.com', email_verified: true, password: 'ggPassword' })
        TestObjects.harry = await app.db.models.User.create({ username: 'harry', name: 'Harry Palpatine', email: 'harry@example.com', email_verified: true, password: 'hhPassword', sso_enabled: true })

        // Alice set as ATeam owner in setup()
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.ATeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.ATeam.addUser(TestObjects.dave, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.dave, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.frank, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.grace, { through: { role: Roles.Member } })
    }

    before(async function () {
        return setupApp()
    })
    after(async function () {
        await app.close()
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

    describe('User teams', async function () {
        it('lists the logged in user teams', async function () {
            await login('bob', 'bbPassword')
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user/teams',
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
    })

    describe('User settings', async function () {
        afterEach(async function () {
            // restore elvis
            await TestObjects.elvis.reload()
            TestObjects.elvis.username = 'elvis'
            TestObjects.elvis.name = 'Elvis Dooku'
            TestObjects.elvis.email = 'elvis@example.com'
            TestObjects.elvis.email_verified = true
            TestObjects.elvis.password = 'eePassword'
            await TestObjects.elvis.save()
        })
        // TODO: re-introduce the below once #1183 is complete
        // async function getAuditLog (limit = 1) {
        //     const logEntries = await app.db.models.AuditLog.forPlatform({ limit: limit || 1 })
        //     const logRaw = [...(logEntries.log || [])]
        //     const result = app.db.views.AuditLog.auditLog(logEntries)
        //     return { log: result.log, logRaw }
        // }
        it('returns 401 on /user if not logged in', async function () {
            // await login('alice', 'aaPassword')
            // await login('bob', 'bbPassword')
            // await login('chris', 'ccPassword')
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user'
            })
            response.statusCode.should.equal(401)
        })
        it('return user info for logged in user', async function () {
            await login('alice', 'aaPassword')
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id', TestObjects.alice.hashid)
            result.should.have.property('username', TestObjects.alice.username)
            result.should.have.property('email', TestObjects.alice.email)
            result.should.not.have.property('sso_enabled')
        })
        describe('sso', function () {
            before(async function () {
                await app.close()
                return setupApp('eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A')
            })
            after(async function () {
                await app.close()
                return setupApp()
            })
            it('return user info for logged in user - sso enabled', async function () {
                // Check !sso_enabled
                await login('alice', 'aaPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/user',
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('id', TestObjects.alice.hashid)
                result.should.have.property('username', TestObjects.alice.username)
                result.should.have.property('email', TestObjects.alice.email)
                result.should.have.property('sso_enabled', false)

                // Check sso_enabled
                await login('bob', 'bbPassword')
                const response2 = await app.inject({
                    method: 'GET',
                    url: '/api/v1/user',
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response2.statusCode.should.equal(200)
                const result2 = response2.json()
                result2.should.have.property('sso_enabled', true)
            })
            it('sso_enabled user cannot change email', async function () {
                await login('harry', 'hhPassword')
                const response = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user',
                    cookies: { sid: TestObjects.tokens.harry },
                    payload: {
                        email: 'new-email@example.com' // user setting
                    }
                })
                response.statusCode.should.equal(400)
                const result = response.json()
                result.should.have.property('code', 'invalid_request')
                result.error.should.match(/Cannot change email/)
            })
        })

        it('member user can modify non admin settings (name, email, username)', async function () {
            await login('elvis', 'eePassword')
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.elvis },
                payload: {
                    name: 'afkae presley', // user setting
                    email: 'afkae@example.com', // user setting
                    username: 'afkae' // user setting
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.not.have.property('error')
            result.should.have.property('name', 'afkae presley')
            result.should.have.property('email', 'elvis@example.com') // Email should NOT be updated, instead a pending change email is sent
            result.should.have.property('pendingEmailChange', true)
            result.should.have.property('username', 'afkae')
            // ensure audit log entry is made
            // TODO: re-introduce audit log tests below once #1183 is complete
            // const auditLogs = await getAuditLog(1)
            // auditLogs.log[0].should.have.a.property('event', 'user.update-user') // what happened
            // auditLogs.log[0].should.have.a.property('trigger').and.be.an.Object() // who/what did it
            // auditLogs.log[0].trigger.should.have.a.property('id', TestObjects.elvis.id) // actioned by
            // auditLogs.log[0].should.have.a.property('scope').and.be.an.Object() // who/what was affected
            // auditLogs.log[0].scope.should.have.a.property('id', TestObjects.elvis.id.toString()) // affected user
            // auditLogs.log[0].body.should.have.a.property('updates')
            // auditLogs.log[0].body.updates.should.have.a.property('length', 4)
        })

        it('member user cannot set invalid email', async function () {
            await TestObjects.elvis.reload()
            await login('elvis', 'eePassword')
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.elvis },
                payload: {
                    email: 'afkae@example.com@test' // user setting
                }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('code', 'invalid_email')
            // check result.error is either 'Validation isEmail on email failed' or 'Error: Invalid email address'
            // this is because the error message is different depending on if the validation was done by DB create fail or by internal validation
            should(result.error).equalOneOf('Validation isEmail on email failed', 'Error: Invalid email address')
        })

        it('member user cannot modify admin settings (email_verified, admin)', async function () {
            await login('elvis', 'eePassword')
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.elvis },
                payload: {
                    email_verified: false, // admin only setting
                    admin: true // admin only setting
                }
            })
            response.statusCode.should.equal(400)
        })
        it('member user can provide admin-only settings if they are unchanged (email_verified, admin)', async function () {
            await login('elvis', 'eePassword')
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.elvis },
                payload: {
                    email_verified: true, // admin only setting
                    admin: false // admin only setting
                }
            })
            response.statusCode.should.equal(200)
        })

        it('user can change password', async function () {
            // Create a password reset token so we can verify it gets cleared
            ;(await app.db.models.AccessToken.count({ where: { scope: 'password:reset' } })).should.equal(0)
            await app.db.controllers.AccessToken.createTokenForPasswordReset(TestObjects.dave)
            ;(await app.db.models.AccessToken.count({ where: { scope: 'password:reset' } })).should.equal(1)

            await login('dave', 'ddPassword')

            const secondLoginSession = await app.inject({
                method: 'POST',
                url: '/account/login',
                payload: { username: 'dave', password: 'ddPassword', remember: false }
            })
            secondLoginSession.cookies.should.have.length(1)
            secondLoginSession.cookies[0].should.have.property('name', 'sid')
            const secondLoginSessionId = secondLoginSession.cookies[0].value

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/change_password',
                payload: {
                    old_password: 'ddPassword',
                    password: 'StapleBatteryHorse'
                },
                cookies: { sid: TestObjects.tokens.dave }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.not.have.property('error')

            // The response should include a new session token
            response.cookies.should.have.length(1)
            response.cookies[0].should.have.property('name', 'sid')

            // The existing session token should no longer work
            const checkOldToken = await app.inject({
                method: 'GET',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.dave }
            })
            checkOldToken.statusCode.should.equal(401)

            // The new session token should work
            const checkNewToken = await app.inject({
                method: 'GET',
                url: '/api/v1/user',
                cookies: { sid: response.cookies[0].value }
            })
            checkNewToken.statusCode.should.equal(200)

            // The second session token should no longer work
            const checkSecondToken = await app.inject({
                method: 'GET',
                url: '/api/v1/user',
                cookies: { sid: secondLoginSessionId }
            })
            checkSecondToken.statusCode.should.equal(401)

            // The password_reset token should no longer exist
            ;(await app.db.models.AccessToken.count({ where: { scope: 'password:reset' } })).should.equal(0)

            await TestObjects.dave.reload()
            TestObjects.dave.password = 'ddPassword'
            await TestObjects.dave.save()

            // ensure audit log entry is made
            // TODO: re-introduce audit log tests below once #1183 is complete
            // const auditLogs = await getAuditLog(1)
            // auditLogs.log[0].should.have.a.property('event', 'user.update-password') // what happened
            // auditLogs.log[0].should.have.a.property('trigger').and.be.an.Object() // who/what did it
            // auditLogs.log[0].trigger.should.have.a.property('id', TestObjects.dave.id) // actioned by
            // auditLogs.log[0].should.have.a.property('scope').and.be.an.Object() // who/what was affected
            // auditLogs.log[0].scope.should.have.a.property('id', TestObjects.dave.id.toString()) // affected user
            // auditLogs.log[0].should.have.a.property('body') // details
        })
        it('user can not change password when old password is incorrect', async function () {
            await login('dave', 'ddPassword')
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/change_password',
                payload: {
                    old_password: 'wrong-password',
                    password: 'newDDPassword'
                },
                cookies: { sid: TestObjects.tokens.dave }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('code', 'password_change_failed')
            // ensure audit log entry is made
            // TODO: re-introduce audit log tests below once #1183 is complete
            // const auditLogs = await getAuditLog(1)
            // auditLogs.log[0].should.have.a.property('event', 'user.update-password') // what happened
            // auditLogs.log[0].should.have.a.property('trigger').and.be.an.Object() // who/what did it
            // auditLogs.log[0].trigger.should.have.a.property('id', TestObjects.dave.id) // actioned by
            // auditLogs.log[0].should.have.a.property('scope').and.be.an.Object() // who/what was affected
            // auditLogs.log[0].scope.should.have.a.property('id', TestObjects.dave.id.toString()) // affected user
            // // check an error was included in details
            // auditLogs.log[0].should.have.a.property('body') // details
            // auditLogs.log[0].body.should.have.a.property('error').and.be.an.Object()
            // auditLogs.log[0].body.error.should.have.a.property('code', 'password_change_failed')
            // auditLogs.log[0].body.error.should.have.a.property('message')
        })
        describe('Unverified Email', async function () {
            it('return user info for unverified_email user', async function () {
                await login('chris', 'ccPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/user',
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('id', TestObjects.chris.hashid)
                result.should.have.property('username', TestObjects.chris.username)
                result.should.have.property('email', TestObjects.chris.email)
                result.should.have.property('email_verified', false)
            })
            it('cannot access other parts of api', async function () {
                // Not an exhaustive check by any means, but a simple check the
                // basic blocking is working
                await login('chris', 'ccPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/teams',
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response.statusCode.should.equal(401)

                const response2 = await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${TestObjects.Project1.id}`,
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response2.statusCode.should.equal(401)
            })
        })
        describe('Verify Email', async function () {
            // PUT /api/v1/user
            it('user cannot manually verify own email', async function () {
                await login('chris', 'ccPassword')
                const response = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user',
                    cookies: { sid: TestObjects.tokens.chris },
                    payload: {
                        email_verified: true,
                        password: 'ccPassword'
                    }
                })
                response.statusCode.should.equal(401)
                const result = response.json()
                result.should.have.property('error')
            })
        })
        describe('Terms and Conditions', async function () {
            const TCS_REQUIRED = 'user:tcs-required'
            const TCS_UPDATE_REQ = 'user:tcs-updated'
            const TCS_URL = 'user:tcs-url'
            const TCS_DATE = 'user:tcs-date'
            const enableTermsAndConditions = async () => {
                await app.settings.set(TCS_REQUIRED, true)
                await app.settings.set(TCS_URL, 'http://a.a.a.a')
            }
            const getTcsSettings = async () => {
                return {
                    tcsRequired: await app.settings.get(TCS_REQUIRED),
                    tcsUrl: await app.settings.get(TCS_URL),
                    tcsDate: await app.settings.get(TCS_DATE)
                }
            }
            // PUT /api/v1/user
            afterEach(async function () {
                await app.settings.set(TCS_REQUIRED, false)
            })
            it('admin can enable Terms and Conditions', async function () {
                await login('alice', 'aaPassword')
                const initial = await getTcsSettings()
                initial.should.have.property('tcsRequired', false)
                initial.should.have.property('tcsUrl', '')

                // enable tcs
                const put1 = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/settings',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: {
                        [TCS_REQUIRED]: true,
                        [TCS_URL]: 'http://g.h.i'
                    }
                })
                put1.should.have.property('statusCode', 200)
                const result = await getTcsSettings()
                result.should.have.property('tcsRequired', true)
            })
            it('admin can update Terms and Conditions date', async function () {
                await login('alice', 'aaPassword')
                const testStartTime = new Date()
                // enable tcs
                await enableTermsAndConditions()

                const put1 = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/settings',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: {
                        [TCS_UPDATE_REQ]: true,
                        [TCS_URL]: 'http://x.y.z'
                    }
                })
                put1.should.have.property('statusCode', 200)
                const result = await getTcsSettings()
                result.should.have.property('tcsUrl', 'http://x.y.z')
                const tcsDate = new Date(result.tcsDate)
                should(tcsDate).be.greaterThanOrEqual(testStartTime)
            })
            it('user can accept Terms and Conditions', async function () {
                await login('elvis', 'eePassword')
                // enable tcs
                await enableTermsAndConditions()
                const updatedDate = new Date()
                const response = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user',
                    cookies: { sid: TestObjects.tokens.elvis },
                    payload: {
                        tcs_accepted: true
                    }
                })
                response.statusCode.should.equal(200)
                const getUserResp = await app.inject({
                    method: 'GET',
                    url: '/api/v1/user',
                    cookies: { sid: TestObjects.tokens.elvis }
                })
                getUserResp.statusCode.should.equal(200)
                const user = response.json()
                user.should.have.property('tcs_accepted')
                const tcsAccepted = new Date(user.tcs_accepted)
                should(tcsAccepted).be.greaterThanOrEqual(updatedDate)
                // TODO: re-introduce audit log tests below once #1183 is complete
                // ensure platform audit log entry is made
                // const auditLogs = await getAuditLog(1)
                // auditLogs.log[0].should.have.a.property('event', 'user.update-user') // what happened
                // auditLogs.log[0].should.have.a.property('trigger').and.be.an.Object() // who/what did it
                // auditLogs.log[0].trigger.should.have.a.property('id', TestObjects.elvis.id) // actioned by
                // auditLogs.log[0].should.have.a.property('scope').and.be.an.Object() // who/what was affected
                // auditLogs.log[0].scope.should.have.a.property('id', TestObjects.elvis.id.toString()) // affected user
                // // check updates were recorded
                // auditLogs.log[0].should.have.a.property('body') // details
                // auditLogs.log[0].body.should.have.a.property('updates')
                // auditLogs.log[0].body.updates.should.have.a.property('length', 1)
                // auditLogs.log[0].body.updates[0].key.should.eql('tcs_accepted') // property changed
            })
            it('user API does not return T&Cs properties if T&Cs are disabled', async function () {
                await login('elvis', 'eePassword')
                const response = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user',
                    cookies: { sid: TestObjects.tokens.elvis },
                    payload: {
                        tcs_accepted: true
                    }
                })
                response.statusCode.should.equal(200)
                const getUserResp = await app.inject({
                    method: 'GET',
                    url: '/api/v1/user',
                    cookies: { sid: TestObjects.tokens.elvis }
                })
                getUserResp.statusCode.should.equal(200)
                const user = response.json()
                user.should.not.have.property('tcs_accepted')
            })
        })
        describe('Password Expired', async function () {
            it('return user info for password_expired user', async function () {
                await login('dave', 'ddPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/user',
                    cookies: { sid: TestObjects.tokens.dave }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('id', TestObjects.dave.hashid)
                result.should.have.property('username', TestObjects.dave.username)
                result.should.have.property('email', TestObjects.dave.email)
                result.should.have.property('password_expired', true)
            })
            it('password_expired user can change password', async function () {
                await login('dave', 'ddPassword')
                const response = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user/change_password',
                    payload: {
                        old_password: 'ddPassword',
                        password: 'StapleBatteryHorse'
                    },
                    cookies: { sid: TestObjects.tokens.dave }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('status', 'okay')

                await TestObjects.dave.reload()
                TestObjects.dave.password = 'ddPassword'
                TestObjects.dave.password_expired = true
                await TestObjects.dave.save()
            })

            it('password_expired user can not set weak password', async function () {
                await login('dave', 'ddPassword')
                const response = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user/change_password',
                    payload: {
                        old_password: 'ddPassword',
                        password: 'aaPassword'
                    },
                    cookies: { sid: TestObjects.tokens.dave }
                })
                response.statusCode.should.equal(400)
                const result = response.json()
                result.code.should.equal('password_change_failed_too_weak')
            })

            it('cannot access other parts of api', async function () {
                // Not an exhaustive check by any means, but a simple check the
                // basic blocking is working
                await login('dave', 'ddPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/teams',
                    cookies: { sid: TestObjects.tokens.dave }
                })
                response.statusCode.should.equal(401)

                const response2 = await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${TestObjects.Project1.id}`,
                    cookies: { sid: TestObjects.tokens.dave }
                })
                response2.statusCode.should.equal(401)
            })
        })
    })
    describe('User deletes own account', async function () {
        beforeEach(async function () {
            await setupUsers()
        })
        // alice : admin, team owner
        // bob: (sso_enabled)
        // chris : (unverified_email)
        // dave : (password_expired)
        // elvis: (no teams)
        // frank: (B team owner)
        // grace: (B team member only)
        it('Can not delete own account if cookie not present', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user'
            })
            response.statusCode.should.equal(401)
        })
        it('Admin can delete own account if another admin exists', async function () {
            await login('bob', 'bbPassword')
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            const json = response.json()
            json.should.have.property('status', 'okay')
        })
        it('Last admin cannot delete own account', async function () {
            await login('alice', 'aaPassword')

            // add elvis to teams A & B as owner (so that all teams have 2 owners)
            await TestObjects.ATeam.addUser(TestObjects.elvis, { through: { role: Roles.Owner } })
            await TestObjects.BTeam.addUser(TestObjects.elvis, { through: { role: Roles.Owner } })

            // delete bob so that alice becomes the last admin
            await TestObjects.bob.destroy()

            // now attempt to delete alice, should fail as alice is the last admin
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
            const json = response.json()
            json.should.have.property('error', 'Error: Cannot delete the last platform administrator')
        })
        it('Last owner of a team cannot delete own account', async function () {
            await login('frank', 'ffPassword')
            // delete bob so that grace becomes the remaining owner of team B
            await TestObjects.bob.destroy()

            // frank now attempts to delete own account: should fail as frank is the last owner of team B
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.frank }
            })
            response.statusCode.should.equal(400)
            const json = response.json()
            json.should.have.property('error', 'Error: Cannot delete the last owner of a team')
        })
        it('Non admin user who is a team member can delete own account', async function () {
            await login('grace', 'ggPassword')
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.grace }
            })
            response.statusCode.should.equal(200)
        })
        it('Team owner can delete own account if another team owner exists', async function () {
            await login('grace', 'ggPassword')
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.grace }
            })
            response.statusCode.should.equal(200)
        })
    })

    describe('User PAT', async function () {
        it('Create a PAT', async function () {
            await login('alice', 'aaPassword')
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'Test Token',
                    scope: ''
                }
            })
            response.statusCode.should.equal(200)
            const json = response.json()
            json.should.have.property('id', 1)
            json.should.have.property('name', 'Test Token')
        })
        it('Create a PAT with expiry', async function () {
            await login('alice', 'aaPassword')
            const tomorrow = Date.now() + (24 * 60 * 60 * 10000)
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'Test Token Expiry',
                    scope: '',
                    expiresAt: tomorrow
                }
            })
            response.statusCode.should.equal(200)
            const json = response.json()
            json.should.have.property('id', 2)
            json.should.have.property('name', 'Test Token Expiry')
            json.should.have.property('expiresAt', tomorrow)
        })
        it('Get Existing Tokens', async function () {
            await login('alice', 'aaPassword')
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const json = response.json()
            json.should.be.Array().length(2)
        })
        it('Delete a Token', async function () {
            await login('alice', 'aaPassword')
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user/tokens/1',
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(201)
        })
        it('Delete a missing Token', async function () {
            await login('alice', 'aaPassword')
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user/tokens/1',
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
        })
        it('Update a Token', async function () {
            await login('alice', 'aaPassword')
            const dayAfterTomorrow = Date.now() + (48 * 60 * 60 * 10000)
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/tokens/2',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    scope: '',
                    expiresAt: dayAfterTomorrow
                }
            })
            response.statusCode.should.equal(200)
        })
        it('Use a token', async function () {
            await login('alice', 'aaPassword')
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'Test Token',
                    scope: ''
                }
            })
            response.statusCode.should.equal(200)
            const json = response.json()
            const token = json.token

            const response2 = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}`,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })
            response2.statusCode.should.equal(200)
            const team = response2.json()
            team.name.should.equal('BTeam')
        })
    })
})
