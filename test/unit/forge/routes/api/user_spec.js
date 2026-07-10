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
        TestObjects.application = app.application
        TestObjects.stack = app.stack
        TestObjects.projectType = app.projectType
        TestObjects.template = app.template
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
        const temp = { ...response.cookies[0] }
        temp.should.have.property('name', 'sid')
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
            const secondTemp = { ...secondLoginSession.cookies[0] }
            secondTemp.should.have.property('name', 'sid')
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
            const temp = { ...response.cookies[0] }
            temp.should.have.property('name', 'sid')

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
        it('user can not change password to match username', async function () {
            await login('elvis', 'eePassword')
            TestObjects.elvis.username = 'elvisMoreComplicatedForWeaknessCheck'
            await TestObjects.elvis.save()
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/change_password',
                payload: {
                    old_password: 'eePassword',
                    password: 'elvisMoreComplicatedForWeaknessCheck'
                },
                cookies: { sid: TestObjects.tokens.elvis }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('code', 'password_change_failed')
        })
        it('user can not change password to match email', async function () {
            await login('elvis', 'eePassword')
            TestObjects.elvis.email = 'elvisMoreComplicatedForWeaknessCheck@example.com'
            await TestObjects.elvis.save()
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/change_password',
                payload: {
                    old_password: 'eePassword',
                    password: 'elvisMoreComplicatedForWeaknessCheck@example.com'
                },
                cookies: { sid: TestObjects.tokens.elvis }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('code', 'password_change_failed')
        })
        it('user can not change password to match old password', async function () {
            await login('elvis', 'eePassword')
            TestObjects.elvis.password = 'elvisMoreComplicatedForWeaknessCheck'
            await TestObjects.elvis.save()
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/change_password',
                payload: {
                    old_password: 'elvisMoreComplicatedForWeaknessCheck',
                    password: 'elvisMoreComplicatedForWeaknessCheck'
                },
                cookies: { sid: TestObjects.tokens.elvis }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('code', 'password_change_failed')
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

            it('user can not set too long password', async function () {
                await login('dave', 'ddPassword')
                const response = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user/change_password',
                    payload: {
                        old_password: 'ddPassword',
                        password: 'a'.padStart(129, 'iusegkfsafjsbegouasf')
                    },
                    cookies: { sid: TestObjects.tokens.dave }
                })
                response.statusCode.should.equal(400)
                const result = response.json()
                result.code.should.equal('password_change_failed')
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
        it('Last owner of a team cannot delete own account when the team has other members present', async function () {
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
            json.should.have.property('error', 'Error: Team BTeam which is being deleted alongside your account still has users in it.')
        })
        it('Last owner of a team cannot delete own account when the team has instances present', async function () {
            const amidala = await app.db.models.User.create({ username: 'amidala', name: 'Padme Amidala', email: 'amidala@example.com', email_verified: true, password: 'paPassword', admin: false, sso_enabled: false })
            const nabooTeam = await app.db.models.Team.create({ name: 'nabooTeam', TeamTypeId: app.defaultTeamType.id })

            await nabooTeam.addUser(amidala, { through: { role: Roles.Owner } })

            await login('amidala', 'paPassword')

            const nabooTeamApplication = await app.factory.createApplication({ name: 'senate-app' }, nabooTeam)

            // we create an instance so Padme won't be able to delete her account
            await app.factory.createInstance(
                { name: 'instance' },
                nabooTeamApplication,
                TestObjects.stack,
                TestObjects.template,
                TestObjects.projectType
            )

            // Padme now attempts to delete own account: should fail as she still has instances attached to her team
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.amidala }
            })
            response.statusCode.should.equal(400)
            const json = response.json()
            json.should.have.property('error', 'Error: Team nabooTeam which is being deleted alongside your account still has instances assigned to it.')
        })
        it('Last owner of a team cannot delete own account when the team has devices present', async function () {
            const amidala = await app.db.models.User.create({ username: 'amidala', name: 'Padme Amidala', email: 'amidala@example.com', email_verified: true, password: 'paPassword', admin: false, sso_enabled: false })
            const nabooTeam = await app.db.models.Team.create({ name: 'nabooTeam2', TeamTypeId: app.defaultTeamType.id })

            await nabooTeam.addUser(amidala, { through: { role: Roles.Owner } })

            await login('amidala', 'paPassword')

            const nabooTeamApplication = await app.factory.createApplication({ name: 'senate-app' }, nabooTeam)

            // we create a device so Padme won't be able to delete her account
            await app.factory.createDevice(
                {
                    name: 'some-device'
                },
                nabooTeam,
                null,
                nabooTeamApplication
            )

            // Padme now attempts to delete own account: should fail as owned team has devices attached
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.amidala }
            })
            response.statusCode.should.equal(400)
            const json = response.json()
            json.should.have.property('error', 'Error: Team nabooTeam2 which is being deleted alongside your account still has devices assigned to it.')
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
        it('Team owner can delete own account if no other members, instances or devices exist', async function () {
            const amidala = await app.db.models.User.create({ username: 'amidala', name: 'Padme Amidala', email: 'amidala@example.com', email_verified: true, password: 'paPassword', admin: false, sso_enabled: false })
            const nabooTeam = await app.db.models.Team.create({ name: 'nabooTeam3', TeamTypeId: app.defaultTeamType.id })

            await nabooTeam.addUser(amidala, { through: { role: Roles.Owner } })

            await login('amidala', 'paPassword')

            await app.factory.createApplication({ name: 'senate-app-2' }, nabooTeam)

            // Padme now attempts to delete own account: should succeed even though it has applications attached to the team
            // but no instances or devices
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.amidala }
            })
            response.statusCode.should.equal(200)

            // Verify the team has been deleted

            const team = await app.db.models.Team.byId(nabooTeam.id)
            // Careful using raw sequelize objects and should.js
            // Cannot use `should.not.exist(team)` as it causes a hang
            ;(team === null).should.be.true('Team should have been deleted')
        })
    })

    describe('User PAT', async function () {
        before(async function () {
            await setupUsers()
            await login('alice', 'aaPassword')
        })
        const testTokens = []
        it('Create a PAT', async function () {
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
            json.should.have.property('id')
            ;(typeof json.id).should.equal('string')
            json.should.have.property('name', 'Test Token')
            testTokens.push(json)
        })
        it('Create a PAT with expiry', async function () {
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
            json.should.have.property('id')
            json.should.have.property('name', 'Test Token Expiry')
            json.should.have.property('expiresAt', new Date(tomorrow).toISOString())
            testTokens.push(json)
        })
        it('Get Existing Tokens', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const json = response.json()
            json.should.have.property('count', 2)
            json.should.have.property('tokens')
            json.tokens.should.have.length(2)
            json.tokens[0].should.not.have.property('token')
            json.tokens[0].should.have.property('id')
            json.tokens[1].should.not.have.property('token')
            json.tokens[1].should.have.property('id')
        })
        it('Delete a Token', async function () {
            await login('alice', 'aaPassword')
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user/tokens/' + testTokens[0].id,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(204)
        })
        it('Delete a missing Token', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user/tokens/' + testTokens[0].id,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(404)
        })
        it('Update a Token', async function () {
            const dayAfterTomorrow = Date.now() + (48 * 60 * 60 * 10000)
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/tokens/' + testTokens[1].id,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    scope: '',
                    expiresAt: dayAfterTomorrow
                }
            })
            response.statusCode.should.equal(200)
            const token = response.json()
            token.should.have.property('expiresAt', new Date(dayAfterTomorrow).toISOString())
        })
        it('Use a token', async function () {
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
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}`,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })
            response2.statusCode.should.equal(200)
            const team = response2.json()
            team.name.should.equal('ATeam')
        })
        it('User cannot modify/delete a token they do not own', async function () {
            await login('bob', 'bbPassword')

            // Alice create token
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

            // Verify bob cannot modify it
            const modifyResponse = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/tokens/' + token.id,
                cookies: { sid: TestObjects.tokens.bob },
                payload: {
                    scope: '123'
                }
            })
            modifyResponse.statusCode.should.equal(404)

            // Verify bob cannot delete it
            const deleteResponse = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user/tokens/' + token.id,
                cookies: { sid: TestObjects.tokens.bob }
            })
            deleteResponse.statusCode.should.equal(404)
        })
        it('Deleting a user removes any PATs from the db', async function () {
            const userToDelete = await app.db.models.User.create({ username: 'wayne', name: 'Wayne Vane', email: 'wayne@example.com', email_verified: true, password: 'wwPassword' })
            await login('wayne', 'wwPassword')
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.wayne },
                payload: {
                    name: 'Waynes Token',
                    scope: ''
                }
            })
            response.statusCode.should.equal(200)

            const userId = userToDelete.id
            const tokens = await app.db.models.AccessToken.getPersonalAccessTokens({ id: userId })
            tokens.should.have.length(1)

            await userToDelete.destroy()

            const tokens2 = await app.db.models.AccessToken.getPersonalAccessTokens({ id: userId })
            tokens2.should.have.length(0)
        })

        it('Create a PAT with readOnly and teamIds returns scoped fields', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'Scoped Token',
                    scope: '',
                    readOnly: true,
                    adminOptIn: false,
                    teamIds: [TestObjects.ATeam.hashid]
                }
            })
            response.statusCode.should.equal(200)
            const json = response.json()
            json.should.have.property('readOnly', true)
            json.should.have.property('adminOptIn', false)
            json.should.have.property('teams').which.is.an.Array()
            json.teams.should.have.length(1)
            json.teams[0].should.have.property('id', TestObjects.ATeam.hashid)
            json.teams[0].should.have.property('name', 'ATeam')
        })

        it('Non-admin cannot set adminOptIn: true', async function () {
            await login('elvis', 'eePassword')
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.elvis },
                payload: {
                    name: 'Admin Token',
                    scope: '',
                    adminOptIn: true
                }
            })
            response.statusCode.should.equal(403)
            response.json().should.have.property('code', 'unauthorized')
        })

        it('teamIds referencing teams user does not belong to are rejected', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'Bad Team Token',
                    scope: '',
                    teamIds: [TestObjects.BTeam.hashid]
                }
            })
            response.statusCode.should.equal(400)
            response.json().should.have.property('code', 'invalid_team')
        })

        it('Updating replaces team scopes', async function () {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'Team Replace Token',
                    scope: '',
                    teamIds: [TestObjects.ATeam.hashid]
                }
            })
            createResponse.statusCode.should.equal(200)
            const created = createResponse.json()
            created.teams.should.have.length(1)
            created.teams[0].id.should.equal(TestObjects.ATeam.hashid)

            const updateResponse = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/tokens/' + created.id,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    scope: '',
                    teamIds: []
                }
            })
            updateResponse.statusCode.should.equal(200)
            const updated = updateResponse.json()
            updated.should.have.property('teams').which.is.an.Array()
            updated.teams.should.have.length(0)
        })

        it('GET /tokens returns readOnly, adminOptIn and teams', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const json = response.json()
            for (const tok of json.tokens) {
                tok.should.have.property('readOnly')
                tok.should.have.property('adminOptIn')
                tok.should.have.property('teams')
            }
        })

        it('Create/update without new fields still works (backwards compat)', async function () {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.alice },
                payload: { name: 'Compat Token', scope: '' }
            })
            createResponse.statusCode.should.equal(200)
            const created = createResponse.json()
            created.should.have.property('readOnly', false)
            created.should.have.property('adminOptIn', false)
            created.teams.should.have.length(0)

            const updateResponse = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/tokens/' + created.id,
                cookies: { sid: TestObjects.tokens.alice },
                payload: { scope: '' }
            })
            updateResponse.statusCode.should.equal(200)
        })

        it('PAT-authenticated POST /tokens returns 403', async function () {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.alice },
                payload: { name: 'Bootstrap PAT', scope: '' }
            })
            createResponse.statusCode.should.equal(200)
            const bootstrapToken = createResponse.json().token

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/user/tokens',
                headers: { authorization: `Bearer ${bootstrapToken}` },
                payload: { name: 'PAT via PAT', scope: '' }
            })
            response.statusCode.should.equal(403)
            response.json().should.have.property('code', 'pat_cannot_create_pat')
        })

        it('PAT-authenticated PUT /tokens/:id returns 403', async function () {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.alice },
                payload: { name: 'PAT for Update Test', scope: '' }
            })
            createResponse.statusCode.should.equal(200)
            const { id, token: rawToken } = createResponse.json()

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/tokens/' + id,
                headers: { authorization: `Bearer ${rawToken}` },
                payload: { scope: '' }
            })
            response.statusCode.should.equal(403)
            response.json().should.have.property('code', 'pat_cannot_create_pat')
        })

        it('Cookie session can create tokens with readOnly and adminOptIn', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/user/tokens',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'Admin Scoped Token',
                    scope: '',
                    readOnly: false,
                    adminOptIn: true
                }
            })
            response.statusCode.should.equal(200)
            const json = response.json()
            json.should.have.property('readOnly', false)
            json.should.have.property('adminOptIn', true)
        })

        describe('PAT auth metadata', async function () {
            it('getOrExpire eager-loads AccessTokenTeamScopes for PATs', async function () {
                // Create a PAT with team scopes
                const createResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/user/tokens',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: {
                        name: 'Eager Load PAT',
                        scope: '',
                        teamIds: [TestObjects.ATeam.hashid]
                    }
                })
                createResponse.statusCode.should.equal(200)
                const patToken = createResponse.json().token

                // Call getOrExpire directly and verify includes
                const accessToken = await app.db.controllers.AccessToken.getOrExpire(patToken)
                accessToken.should.have.property('name', 'Eager Load PAT')
                accessToken.should.have.property('readOnly')
                accessToken.should.have.property('adminOptIn')
                accessToken.should.have.property('AccessTokenTeamScopes')
                accessToken.AccessTokenTeamScopes.should.be.an.Array()
                accessToken.AccessTokenTeamScopes.should.have.length(1)
                accessToken.AccessTokenTeamScopes[0].should.have.property('TeamId')
                accessToken.AccessTokenTeamScopes[0].should.have.property('Team')
                accessToken.AccessTokenTeamScopes[0].Team.should.have.property('name', 'ATeam')
            })

            it('getOrExpire returns empty AccessTokenTeamScopes for PATs without team scopes', async function () {
                const createResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/user/tokens',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: { name: 'No Scope PAT', scope: '' }
                })
                createResponse.statusCode.should.equal(200)
                const patToken = createResponse.json().token

                const accessToken = await app.db.controllers.AccessToken.getOrExpire(patToken)
                accessToken.should.have.property('name', 'No Scope PAT')
                accessToken.AccessTokenTeamScopes.should.be.an.Array()
                accessToken.AccessTokenTeamScopes.should.have.length(0)
            })

            it('PAT-authenticated request is identified as PAT (blockPAT rejects)', async function () {
                const createResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/user/tokens',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: { name: 'Block Test PAT', scope: '' }
                })
                createResponse.statusCode.should.equal(200)
                const patToken = createResponse.json().token

                // PAT can access normal routes
                const userResponse = await app.inject({
                    method: 'GET',
                    url: '/api/v1/user',
                    headers: { authorization: `Bearer ${patToken}` }
                })
                userResponse.statusCode.should.equal(200)

                // But is blocked by blockPAT preHandler
                const blockedResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/user/tokens',
                    headers: { authorization: `Bearer ${patToken}` },
                    payload: { name: 'Should Fail', scope: '' }
                })
                blockedResponse.statusCode.should.equal(403)
                blockedResponse.json().should.have.property('code', 'pat_cannot_create_pat')
            })

            it('cookie session is not identified as PAT', async function () {
                // Cookie sessions should not be blocked by blockPAT
                const createResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/user/tokens',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: { name: 'Cookie Session PAT', scope: '' }
                })
                createResponse.statusCode.should.equal(200)
            })

            it('non-PAT bearer tokens are not identified as PAT', async function () {
                const device = await app.factory.createDevice({ name: 'pat-test-device' }, TestObjects.ATeam, null, TestObjects.application)
                const deviceToken = await app.db.controllers.AccessToken.createTokenForDevice(device)

                // Verify via getOrExpire that device tokens don't get AccessTokenTeamScopes
                const accessToken = await app.db.controllers.AccessToken.getOrExpire(deviceToken.token)
                should(accessToken.name).be.null()
                // Device tokens have empty scopes array (no team scope entries)
                accessToken.AccessTokenTeamScopes.should.be.an.Array()
                accessToken.AccessTokenTeamScopes.should.have.length(0)
            })
        })

        describe('PAT scope enforcement', async function () {
            // alice: admin, ATeam owner
            // bob: admin, ATeam owner, BTeam owner

            it('team-scoped PAT can access allowed team', async function () {
                const createResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/user/tokens',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: {
                        name: 'ATeam Scoped',
                        scope: '',
                        teamIds: [TestObjects.ATeam.hashid]
                    }
                })
                createResponse.statusCode.should.equal(200)
                const patToken = createResponse.json().token

                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${TestObjects.ATeam.hashid}`,
                    headers: { authorization: `Bearer ${patToken}` }
                })
                response.statusCode.should.equal(200)
                response.json().should.have.property('name', 'ATeam')
            })

            it('team-scoped PAT cannot access a team outside its scope', async function () {
                await login('bob', 'bbPassword')
                // bob is member of both ATeam and BTeam, but scope the PAT to ATeam only
                const createResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/user/tokens',
                    cookies: { sid: TestObjects.tokens.bob },
                    payload: {
                        name: 'ATeam Only',
                        scope: '',
                        teamIds: [TestObjects.ATeam.hashid]
                    }
                })
                createResponse.statusCode.should.equal(200)
                const patToken = createResponse.json().token

                // Accessing BTeam should fail
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${TestObjects.BTeam.hashid}`,
                    headers: { authorization: `Bearer ${patToken}` }
                })
                // 404 from the shared team preHandler nullifying membership,
                // or 403 from needsPermission team scope check
                response.statusCode.should.be.oneOf([403, 404])
            })

            it('team-agnostic PAT (no teamScopes) can access any team the user belongs to', async function () {
                await login('bob', 'bbPassword')
                const createResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/user/tokens',
                    cookies: { sid: TestObjects.tokens.bob },
                    payload: { name: 'No Scope', scope: '' }
                })
                createResponse.statusCode.should.equal(200)
                const patToken = createResponse.json().token

                // Can access both ATeam and BTeam
                const aResponse = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${TestObjects.ATeam.hashid}`,
                    headers: { authorization: `Bearer ${patToken}` }
                })
                aResponse.statusCode.should.equal(200)

                const bResponse = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${TestObjects.BTeam.hashid}`,
                    headers: { authorization: `Bearer ${patToken}` }
                })
                bResponse.statusCode.should.equal(200)
            })

            it('read-only PAT can call read endpoints', async function () {
                const createResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/user/tokens',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: {
                        name: 'ReadOnly PAT',
                        scope: '',
                        readOnly: true
                    }
                })
                createResponse.statusCode.should.equal(200)
                const patToken = createResponse.json().token

                // GET team (read) should succeed
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${TestObjects.ATeam.hashid}`,
                    headers: { authorization: `Bearer ${patToken}` }
                })
                response.statusCode.should.equal(200)
            })

            it('read-only PAT cannot call write endpoints', async function () {
                const createResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/user/tokens',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: {
                        name: 'ReadOnly Write Test',
                        scope: '',
                        readOnly: true
                    }
                })
                createResponse.statusCode.should.equal(200)
                const patToken = createResponse.json().token

                // PUT user (write) should be rejected
                const response = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user',
                    headers: { authorization: `Bearer ${patToken}` },
                    payload: { name: 'Should Not Change' }
                })
                response.statusCode.should.equal(403)
            })

            it('adminOptIn: false strips admin privileges', async function () {
                // alice is admin but PAT has adminOptIn: false (default)
                const createResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/user/tokens',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: { name: 'No Admin PAT', scope: '' }
                })
                createResponse.statusCode.should.equal(200)
                const patToken = createResponse.json().token

                // Admin-only endpoint (e.g. list all users) should be rejected
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/admin/users',
                    headers: { authorization: `Bearer ${patToken}` }
                })
                response.statusCode.should.not.equal(200)
            })

            it('adminOptIn: true preserves admin privileges', async function () {
                const createResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/user/tokens',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: {
                        name: 'Admin PAT',
                        scope: '',
                        adminOptIn: true
                    }
                })
                createResponse.statusCode.should.equal(200)
                const patToken = createResponse.json().token

                // Admin can access a team they are not a member of
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${TestObjects.BTeam.hashid}`,
                    headers: { authorization: `Bearer ${patToken}` }
                })
                response.statusCode.should.equal(200)
            })

            it('adminOptIn: true + readOnly still enforces read-only', async function () {
                const createResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/user/tokens',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: {
                        name: 'Admin ReadOnly',
                        scope: '',
                        adminOptIn: true,
                        readOnly: true
                    }
                })
                createResponse.statusCode.should.equal(200)
                const patToken = createResponse.json().token

                // Read should work (admin bypass + read-only allows reads)
                const readResponse = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${TestObjects.ATeam.hashid}`,
                    headers: { authorization: `Bearer ${patToken}` }
                })
                readResponse.statusCode.should.equal(200)

                // Write should be blocked by read-only even though admin
                const writeResponse = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user',
                    headers: { authorization: `Bearer ${patToken}` },
                    payload: { name: 'Should Not Change' }
                })
                writeResponse.statusCode.should.equal(403)
            })

            it('cookie session is unaffected by PAT enforcement', async function () {
                // Cookie session should still have full access
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${TestObjects.BTeam.hashid}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)

                // Write should also work
                const writeResponse = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user',
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: { name: 'Alice Skywalker' }
                })
                writeResponse.statusCode.should.equal(200)
            })

            describe('broker credential endpoints blocked for PATs', async function () {
                let patToken

                before(async function () {
                    await login('alice', 'aaPassword')
                    const createResponse = await app.inject({
                        method: 'POST',
                        url: '/api/v1/user/tokens',
                        cookies: { sid: TestObjects.tokens.alice },
                        payload: { name: 'Broker Test PAT', scope: '', adminOptIn: true }
                    })
                    createResponse.statusCode.should.equal(200)
                    patToken = createResponse.json().token
                })

                it('PAT cannot call POST /user/expert-creds', async function () {
                    const response = await app.inject({
                        method: 'POST',
                        url: '/api/v1/user/expert-creds',
                        headers: { authorization: `Bearer ${patToken}` },
                        payload: { sessionId: 'abcd1234' }
                    })
                    response.statusCode.should.equal(403)
                    response.json().should.have.property('code', 'pat_cannot_create_pat')
                })

                it('cookie session can call POST /user/expert-creds', async function () {
                    const response = await app.inject({
                        method: 'POST',
                        url: '/api/v1/user/expert-creds',
                        cookies: { sid: TestObjects.tokens.alice },
                        payload: { sessionId: 'abcd1234' }
                    })
                    response.statusCode.should.equal(200)
                })

                it('PAT cannot call POST /teams/:teamId/comms-credentials', async function () {
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${TestObjects.ATeam.hashid}/comms-credentials`,
                        headers: { authorization: `Bearer ${patToken}` },
                        payload: { sessionId: 'abcd1234' } // somewhat defeats the purpose of this test but better safe than sorry
                    })
                    response.statusCode.should.equal(403)
                    response.json().should.have.property('code', 'pat_cannot_create_pat')
                })

                it('PAT cannot call POST /devices/:deviceId/logs', async function () {
                    const device = await app.factory.createDevice({ name: 'broker-test-device' }, TestObjects.ATeam, null, TestObjects.application)
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/devices/${device.hashid}/logs`,
                        headers: { authorization: `Bearer ${patToken}` }
                    })
                    response.statusCode.should.equal(403)
                    response.json().should.have.property('code', 'pat_cannot_create_pat')
                })

                it('PAT cannot call POST /devices/:deviceId/resources', async function () {
                    const device = await app.factory.createDevice({ name: 'broker-test-device-2' }, TestObjects.ATeam, null, TestObjects.application)
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/devices/${device.hashid}/resources`,
                        headers: { authorization: `Bearer ${patToken}` }
                    })
                    response.statusCode.should.equal(403)
                    response.json().should.have.property('code', 'pat_cannot_create_pat')
                })
            })
        })
    })

    describe('User invites', async function () {
        beforeEach(async function () {
            await setupUsers()
        })

        async function getUserInvites (userToken) {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user/invitations',
                cookies: { sid: userToken }
            })
            return response.json().invitations
        }
        async function getUserTeams (userToken) {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user/teams',
                cookies: { sid: userToken }
            })
            return response.json().teams
        }
        async function getUserNotifications (userToken) {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user/notifications',
                cookies: { sid: userToken }
            })
            return response.json().notifications
        }

        it('user can accept an invite to a team', async function () {
            await login('grace', 'ggPassword')
            ;(await getUserInvites(TestObjects.tokens.grace)).should.have.length(0)
            ;(await getUserTeams(TestObjects.tokens.grace)).should.have.length(1)
            ;(await getUserNotifications(TestObjects.tokens.grace)).should.have.length(0)

            // Create invitation
            const invitor = TestObjects.alice
            const team = await app.db.models.Team.byName('ATeam')
            const userList = ['grace']
            const result = await app.db.controllers.Invitation.createInvitations(invitor, team, userList)

            const invite = result.grace

            ;(await getUserNotifications(TestObjects.tokens.grace)).should.have.length(1)
            ;(await getUserInvites(TestObjects.tokens.grace)).should.have.length(1)

            // Accept invitation
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/user/invitations/' + invite.hashid,
                cookies: { sid: TestObjects.tokens.grace }
            })
            response.statusCode.should.equal(200)
            ;(await getUserInvites(TestObjects.tokens.grace)).should.have.length(0)
            ;(await getUserTeams(TestObjects.tokens.grace)).should.have.length(2)
            ;(await getUserNotifications(TestObjects.tokens.grace)).should.have.length(0)
        })

        it('user can reject an invite to a team', async function () {
            await login('grace', 'ggPassword')
            ;(await getUserInvites(TestObjects.tokens.grace)).should.have.length(0)
            ;(await getUserTeams(TestObjects.tokens.grace)).should.have.length(1)
            ;(await getUserNotifications(TestObjects.tokens.grace)).should.have.length(0)

            // Create invitation
            const invitor = TestObjects.alice
            const team = await app.db.models.Team.byName('ATeam')
            const userList = ['grace']
            const result = await app.db.controllers.Invitation.createInvitations(invitor, team, userList)

            const invite = result.grace

            ;(await getUserNotifications(TestObjects.tokens.grace)).should.have.length(1)
            ;(await getUserInvites(TestObjects.tokens.grace)).should.have.length(1)

            // Accept invitation
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user/invitations/' + invite.hashid,
                cookies: { sid: TestObjects.tokens.grace }
            })
            response.statusCode.should.equal(200)
            ;(await getUserInvites(TestObjects.tokens.grace)).should.have.length(0)
            ;(await getUserTeams(TestObjects.tokens.grace)).should.have.length(1)
            ;(await getUserNotifications(TestObjects.tokens.grace)).should.have.length(0)
        })

        it('user cannot accept an invite they do not own', async function () {
            await login('grace', 'ggPassword')
            ;(await getUserInvites(TestObjects.tokens.grace)).should.have.length(0)
            ;(await getUserTeams(TestObjects.tokens.grace)).should.have.length(1)

            // Create invitation
            const invitor = TestObjects.alice
            const team = await app.db.models.Team.byName('ATeam')
            const userList = ['grace']
            const result = await app.db.controllers.Invitation.createInvitations(invitor, team, userList)

            const invite = result.grace

            ;(await getUserInvites(TestObjects.tokens.grace)).should.have.length(1)

            // Try to accept invitation as frank
            await login('frank', 'ffPassword')
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/user/invitations/' + invite.hashid,
                cookies: { sid: TestObjects.tokens.frank }
            })
            response.statusCode.should.equal(404)
        })

        it('user cannot reject an invite they do not own', async function () {
            await login('grace', 'ggPassword')
            ;(await getUserInvites(TestObjects.tokens.grace)).should.have.length(0)
            ;(await getUserTeams(TestObjects.tokens.grace)).should.have.length(1)

            // Create invitation
            const invitor = TestObjects.alice
            const team = await app.db.models.Team.byName('ATeam')
            const userList = ['grace']
            const result = await app.db.controllers.Invitation.createInvitations(invitor, team, userList)

            const invite = result.grace

            ;(await getUserInvites(TestObjects.tokens.grace)).should.have.length(1)

            // Try to accept invitation as frank
            await login('frank', 'ffPassword')
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/user/invitations/' + invite.hashid,
                cookies: { sid: TestObjects.tokens.frank }
            })
            response.statusCode.should.equal(404)
        })
    })

    describe('User Expert Creds', async function () {
        beforeEach(async function () {
            await setupUsers()
        })
        it('user can request expert credentials', async function () {
            // /api/v1/user/expert-creds
            await login('elvis', 'eePassword')
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/user/expert-creds',
                cookies: { sid: TestObjects.tokens.elvis },
                body: {
                    sessionId: 'abcd1234'
                }
            })
            response.statusCode.should.equal(200)
            const json = response.json()
            json.should.only.have.keys('url', 'username', 'password')
            json.should.have.property('url', ':test:')
            json.should.have.property('username', `expert-client:${TestObjects.elvis.hashid}:abcd1234`)
            json.should.have.property('password').and.match(/^ffbec_/)
        })
        it('user cannot request expert credentials without sessionId', async function () {
            await login('elvis', 'eePassword')
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/user/expert-creds',
                cookies: { sid: TestObjects.tokens.elvis },
                body: {}
            })
            response.statusCode.should.equal(400)
        })
        it('user cannot request expert credentials with invalid sessionId', async function () {
            await login('elvis', 'eePassword')
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/user/expert-creds',
                cookies: { sid: TestObjects.tokens.elvis },
                body: {
                    sessionId: '1' // too short
                }
            })
            response.statusCode.should.equal(400)
        })
        it('user cannot request expert credentials if not logged in', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/user/expert-creds',
                body: {
                    sessionId: 'abcd1234'
                }
            })
            response.statusCode.should.equal(401)
        })
    })
})
