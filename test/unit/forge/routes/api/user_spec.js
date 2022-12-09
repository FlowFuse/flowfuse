const should = require('should') // eslint-disable-line
const setup = require('../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('User API', async function () {
    let app
    const TestObjects = {}
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
    beforeEach(async function () {
        const setupConfig = { features: { devices: true } }
        if (this.currentTest.license) {
            setupConfig.license = this.currentTest.license
        }
        app = await setup(setupConfig)

        // alice : admin, team owner
        // bob: (sso_enabled)
        // chris : (unverified_email)
        // dave : (password_expired)

        // ATeam ( alice  (owner), bob (owner), chris, dave)
        // BTeam ( bob (owner), chris, dave)

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword', admin: true, sso_enabled: true })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', password: 'ccPassword' })
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', password: 'ddPassword', email_verified: true, password_expired: true })
        TestObjects.elvis = await app.db.models.User.create({ username: 'elvis', name: 'Elvis Dooku', email: 'elvis@example.com', email_verified: true, password: 'eePassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })

        // Alice set as ATeam owner in setup()
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.ATeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.ATeam.addUser(TestObjects.dave, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.dave, { through: { role: Roles.Member } })

        TestObjects.Project1 = app.project

        TestObjects.tokens = {}
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

    describe('User settings', async function () {
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
        const ssoUserInfoTest = it('return user info for logged in user - sso enabled', async function () {
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
        ssoUserInfoTest.license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A'

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
            result.should.have.property('email', 'afkae@example.com')
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
            result.should.have.property('error', 'Validation isEmail on email failed')
        })
        const ssoUserUpdateEmailTest = it('sso_enabled user cannot change email', async function () {
            await login('bob', 'bbPassword')
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.bob },
                payload: {
                    email: 'new-email@example.com' // user setting
                }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('code', 'invalid_request')
            result.error.should.match(/Cannot change password/)
        })
        ssoUserUpdateEmailTest.license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A'

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
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.not.have.property('error')
            result.should.have.property('email_verified', true) // unchanged
            result.should.have.property('admin', false) // unchanged
        })
        it('user can change password', async function () {
            await login('dave', 'ddPassword')
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/change_password',
                payload: {
                    old_password: 'ddPassword',
                    password: 'newDDPassword'
                },
                cookies: { sid: TestObjects.tokens.dave }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.not.have.property('error')
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
            // PUT /api/v1/user
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
                        password: 'newDDPassword'
                    },
                    cookies: { sid: TestObjects.tokens.dave }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('status', 'okay')
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
})
