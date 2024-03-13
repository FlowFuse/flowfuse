const should = require('should') // eslint-disable-line

const setup = require('../setup')

describe('Accounts API', async function () {
    let app
    const TestObjects = { tokens: {} }

    async function registerUser (payload) {
        return app.inject({
            method: 'POST',
            url: '/account/register',
            payload
        })
    }

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

    describe('Register User', async function () {
        before(async function () {
            app = await setup({
                limits: {
                    users: 100,
                    instances: 100,
                    teams: 100
                }
            })
        })
        after(async function () {
            await app.close()
        })
        afterEach(async function () {
            // Reset settings to default
            app.settings.set('user:signup', false)
            app.settings.set('team:user:invite:external', false)
            app.settings.set('user:team:auto-create', false)
        })

        async function expectRejection (opts, reason) {
            const response = await registerUser(opts)
            response.statusCode.should.equal(400)
            response.json().error.should.match(reason)
        }

        it('rejects user registration if not enabled', async function () {
            app.settings.get('user:signup').should.be.false()
            app.settings.get('team:user:invite:external').should.be.false()
            await expectRejection({
                username: 'u1',
                password: 'p1',
                name: 'u1',
                email: 'u1@example.com'
            }, /user registration not enabled/)

            // TODO: check user audit logs - expect 'account.xxx-yyy' { code: '', error, '' }
        })
        it('allows user to register', async function () {
            app.settings.set('user:signup', true)

            const response = await registerUser({
                username: 'u1',
                password: '12345678',
                name: 'u1',
                email: 'u1@example.com'
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('username', 'u1')
            result.should.have.property('id')
            // Ensure the id looks like a hash id
            result.id.should.not.match(/^\d+$/)
            // TODO: check user audit logs - expect 'account.xxx-yyy' { status: 'okay', ... }
        })

        it('allows user to register - mixed case username', async function () {
            app.settings.set('user:signup', true)

            const response = await registerUser({
                username: 'MixedCaseUserName',
                password: '12345678',
                name: 'MixedCaseUserName',
                email: 'MixedCaseUserName@example.com'
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('username', 'MixedCaseUserName')
            result.should.have.property('id')
        })
        it('rejects reserved user names', async function () {
            app.settings.set('user:signup', true)

            await expectRejection({
                username: 'admin',
                password: '12345678',
                name: 'u1',
                email: 'u1@example.com'
            }, /invalid username/)

            await expectRejection({
                username: 'root',
                password: '12345678',
                name: 'u1',
                email: 'u1@example.com'
            }, /invalid username/)

            // TODO: check user audit logs - expect 'account.xxx-yyy' { code: '', error, '' }
        })

        it('rejects duplicate username', async function () {
            app.settings.set('user:signup', true)

            await registerUser({
                username: 'u1',
                password: '12345678',
                name: 'u1',
                email: 'u1@example.com'
            })

            await expectRejection({
                username: 'u1',
                password: '12345678',
                name: 'u1.2',
                email: 'u1-2@example.com'
            }, /Username or email not available/)

            // Try with uppercase
            await expectRejection({
                username: 'U1',
                password: '12345678',
                name: 'u1.3',
                email: 'u1-3@example.com'
            }, /Username or email not available/)

            // TODO: check user audit logs - expect 'account.xxx-yyy' { code: '', error, '' }
        })
        it('rejects duplicate email', async function () {
            app.settings.set('user:signup', true)

            await registerUser({
                username: 'u1',
                password: '12345678',
                name: 'u1',
                email: 'u1@example.com'
            })

            await expectRejection({
                username: 'u1-2',
                password: '12345678',
                name: 'u1.2',
                email: 'u1@example.com'
            }, /Username or email not available/)

            // TODO: check user audit logs - expect 'account.xxx-yyy' { code: '', error, '' }
        })
        it('rejects bad username', async function () {
            app.settings.set('user:signup', true)

            await expectRejection({
                username: 'bad@user!',
                password: '12345678',
                name: 'u1.2',
                email: 'u1@example.com'
            }, /invalid username/)
        })

        it('Limits how many users can be created when unlicensed', async function () {
            app.settings.set('user:signup', true)
            const currentCount = await app.db.models.User.count()
            const currentLimit = app.license.defaults.users
            app.license.defaults.users = currentCount + 2
            for (let i = currentCount; i < currentCount + 2; i++) {
                const resp = await registerUser({
                    username: `u-limit-${i}`,
                    password: '12345678',
                    name: `u-limit-${i}`,
                    email: `u-limit-${i}@example.com`
                })
                resp.statusCode.should.equal(200)
            }
            await expectRejection({
                username: 'u-final',
                password: '12345678',
                name: 'u-final',
                email: 'u-final@example.com'
            }, /license limit reached/)
            app.license.defaults.users = currentLimit
            // TODO: check user audit logs - expect 'account.xxx-yyy' { code: '', error, '' }
        })

        it('allows user to register with + in email (no sso)', async function () {
            app.settings.set('user:signup', true)

            const response = await registerUser({
                username: 'u7',
                password: '12345678',
                name: 'u7',
                email: 'u7+test@example.com'
            })
            response.statusCode.should.equal(200)

            // TODO: check user audit logs - expect 'account.xxx-yyy' { status: 'okay', ... }
        })

        it('auto-creates personal team if option set - default team type', async function () {
            app.settings.set('user:signup', true)
            app.settings.set('user:team:auto-create', true)

            const response = await registerUser({
                username: 'user',
                password: '12345678',
                name: 'user',
                email: 'user@example.com'
            })
            response.statusCode.should.equal(200)

            // Team is only created once they verify their email.
            const user = await app.db.models.User.findOne({ where: { username: 'user' } })
            const verificationToken = await app.db.controllers.User.generateEmailVerificationToken(user)
            await app.inject({
                method: 'POST',
                url: `/account/verify/${verificationToken}`,
                payload: {},
                cookies: { sid: TestObjects.tokens.user }
            })
            await login('user', '12345678')

            const userTeamsResponse = await app.inject({
                method: 'GET',
                url: '/api/v1/user/teams',
                cookies: { sid: TestObjects.tokens.user }
            })

            const userTeams = userTeamsResponse.json()
            userTeams.should.have.property('teams')
            userTeams.teams.should.have.length(1)
        })

        it('auto-creates personal team if option set - selected team type', async function () {
            app.settings.set('user:signup', true)
            app.settings.set('user:team:auto-create', true)

            const newTeamType = await app.db.models.TeamType.create({
                name: 'new-starter',
                properties: {}
            })
            app.settings.set('user:team:auto-create:teamType', newTeamType.hashid)

            const response = await registerUser({
                username: 'user2',
                password: '12345678',
                name: 'user',
                email: 'user2@example.com'
            })
            response.statusCode.should.equal(200)

            // Team is only created once they verify their email.
            const user = await app.db.models.User.findOne({ where: { username: 'user2' } })
            const verificationToken = await app.db.controllers.User.generateEmailVerificationToken(user)
            await app.inject({
                method: 'POST',
                url: `/account/verify/${verificationToken}`,
                payload: {},
                cookies: { sid: TestObjects.tokens.user2 }
            })
            await login('user2', '12345678')

            const userTeamsResponse = await app.inject({
                method: 'GET',
                url: '/api/v1/user/teams',
                cookies: { sid: TestObjects.tokens.user2 }
            })

            const userTeams = userTeamsResponse.json()
            userTeams.should.have.property('teams')
            userTeams.teams.should.have.length(1)
            userTeams.teams[0].should.have.property('type')
            userTeams.teams[0].type.should.have.property('id', newTeamType.hashid)

            // cleanup else this becomes the new default and breaks other tests
            newTeamType.active = false
            await newTeamType.save()
            app.settings.set('user:team:auto-create:teamType', null)
        })

        describe('auto-creation of application and instances', function () {
            it('auto-creates an instance if instanceType option is set', async function () {
                app.settings.set('user:signup', true)
                app.settings.set('user:team:auto-create', true)
                app.settings.set('user:team:auto-create:instanceType', app.projectType.hashid)

                const response = await registerUser({
                    username: 'user3',
                    password: '12345678',
                    name: 'user',
                    email: 'user3@example.com'
                })
                response.statusCode.should.equal(200)

                // Process only runs after email verification
                const user = await app.db.models.User.findOne({ where: { username: 'user3' } })
                const verificationToken = await app.db.controllers.User.generateEmailVerificationToken(user)
                const verifyResponse = await app.inject({
                    method: 'POST',
                    url: `/account/verify/${verificationToken}`,
                    payload: {},
                    cookies: { sid: TestObjects.tokens.user3 }
                })
                verifyResponse.statusCode.should.equal(200)

                const instances = await app.db.models.Project.byUser(user)
                instances.length.should.equal(1)

                const instance = instances[0]
                instance.safeName.should.match(/team-user-user3-(\w)+/)
            })

            it('auto-creates an application & instance if instanceType option is set and there is no application yet', async function () {
                app.settings.set('user:signup', true)
                app.settings.set('user:team:auto-create', true)
                app.settings.set('user:team:auto-create:instanceType', app.projectType.hashid)

                const response = await registerUser({
                    username: 'user4',
                    password: '12345678',
                    name: 'dave',
                    email: 'user4@example.com'
                })
                response.statusCode.should.equal(200)

                // Process only runs after email verification
                const user = await app.db.models.User.findOne({ where: { username: 'user4' } })
                const verificationToken = await app.db.controllers.User.generateEmailVerificationToken(user)
                const verifyResponse = await app.inject({
                    method: 'POST',
                    url: `/account/verify/${verificationToken}`,
                    payload: {},
                    cookies: { sid: TestObjects.tokens.user4 }
                })
                verifyResponse.statusCode.should.equal(200)

                const teams = await app.db.models.Team.forUser(user)
                const userTeam = teams[0].Team

                const applications = await app.db.models.Application.byTeam(userTeam.id, { includeInstances: true })
                applications.length.should.equal(1)

                const application = applications[0]
                application.name.should.match('Dave\'s Application')

                application.Instances.length.should.equal(1)
                application.Instances[0].safeName.should.match(/team-dave-user4-(\w)+/)
            })

            it('handles a custom team type being set, still creating an application & instance if the flag is set', async function () {
                app.settings.set('user:signup', true)
                app.settings.set('user:team:auto-create', true)
                app.settings.set('user:team:auto-create:instanceType', app.projectType.hashid)

                // Allow this new project type to be used by the new team type
                const teamTypeProperties = { instances: {} }
                teamTypeProperties.instances[app.projectType.hashid] = {
                    active: true,
                    limit: 2,
                    free: 2
                }
                const newTeamType = await app.db.models.TeamType.create({
                    name: 'new-starter-test',
                    properties: teamTypeProperties
                })
                app.settings.set('user:team:auto-create:teamType', newTeamType.hashid)

                const response = await registerUser({
                    username: 'user5',
                    password: '12345678',
                    name: 'Pez Cuckow',
                    email: 'user5@example.com'
                })
                response.statusCode.should.equal(200)

                // Process only runs after email verification
                const user = await app.db.models.User.findOne({ where: { username: 'user5' } })
                const verificationToken = await app.db.controllers.User.generateEmailVerificationToken(user)
                const verifyResponse = await app.inject({
                    method: 'POST',
                    url: `/account/verify/${verificationToken}`,
                    payload: {},
                    cookies: { sid: TestObjects.tokens.user4 }
                })
                verifyResponse.statusCode.should.equal(200)

                const teams = await app.db.models.Team.forUser(user)
                const userTeam = teams[0].Team

                const applications = await app.db.models.Application.byTeam(userTeam.id, { includeInstances: true })
                applications.length.should.equal(1)

                const application = applications[0]
                application.name.should.match('Pez Cuckow\'s Application')

                application.Instances.length.should.equal(1)
                application.Instances[0].safeName.should.match(/team-pez-cuckow-user5-(\w)+/)

                // cleanup else this becomes the new default and breaks other tests
                newTeamType.active = false
                await newTeamType.save()
                app.settings.set('user:team:auto-create:teamType', null)
            })
        })
    })

    describe('Register User - Licensed', async function () {
        afterEach(async function () {
            await app.close()
        })

        it('auto-creates personal team if option set - in trial mode', async function () {
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTA4ODAwLCJleHAiOjc5ODY5ODg3OTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjo1LCJ0ZWFtcyI6NTAsInByb2plY3RzIjo1MCwiZGV2aWNlcyI6NTAsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNTQ4NjAyfQ.vvSw6pm-NP5e0NUL7yMOG-w0AgB8H3NRGGN7b5Dw_iW5DiIBbVQ4HVLEi3dyy9fk7WgKnloiCCkIFJvN79fK_g'
            const TEST_TRIAL_DURATION = 5

            app = await setup({ license, billing: { stripe: {} } })
            app.settings.set('user:signup', true)
            app.settings.set('user:team:auto-create', true)

            // Set trial mode options against the default team type
            const teamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const props = teamType.properties
            props.trial = {
                active: true,
                duration: TEST_TRIAL_DURATION
            }
            teamType.properties = props
            await teamType.save()

            const response = await registerUser({
                username: 'user',
                password: '12345678',
                name: 'user',
                email: 'user@example.com'
            })
            response.statusCode.should.equal(200)

            // Team is only created once they verify their email.
            const user = await app.db.models.User.findOne({ where: { username: 'user' } })
            const verificationToken = await app.db.controllers.User.generateEmailVerificationToken(user)
            await app.inject({
                method: 'POST',
                url: `/account/verify/${verificationToken}`,
                payload: {},
                cookies: { sid: TestObjects.tokens.user }
            })
            await login('user', '12345678')

            const userTeamsResponse = await app.inject({
                method: 'GET',
                url: '/api/v1/user/teams',
                cookies: { sid: TestObjects.tokens.user }
            })

            const userTeams = userTeamsResponse.json()
            userTeams.should.have.property('teams')
            userTeams.teams.should.have.length(1)

            const userTeam = await app.db.models.Team.byId(userTeams.teams[0].id)
            const subscription = await app.db.models.Subscription.byTeamId(userTeam.id)
            should.exist(subscription)
            subscription.isActive().should.be.false()
            subscription.isTrial().should.be.true()
            subscription.isTrialEnded().should.be.false()
            subscription.trialStatus.should.equal(app.db.models.Subscription.TRIAL_STATUS.CREATED)
        })

        it('Does not limit how many users can be created when licensed', async function () {
            // This license has limit of 5 users (1 created by default test setup (test/unit/forge/routes/setup.js))
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTA4ODAwLCJleHAiOjc5ODY5ODg3OTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjo1LCJ0ZWFtcyI6NTAsInByb2plY3RzIjo1MCwiZGV2aWNlcyI6NTAsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNTQ4NjAyfQ.vvSw6pm-NP5e0NUL7yMOG-w0AgB8H3NRGGN7b5Dw_iW5DiIBbVQ4HVLEi3dyy9fk7WgKnloiCCkIFJvN79fK_g'
            app = await setup({ license })
            app.settings.set('user:signup', true)

            // Register 5 more users to breach the limit
            for (let i = 1; i <= 5; i++) {
                const resp = await registerUser({
                    username: `u${i}`,
                    password: '12345678',
                    name: `u${i}`,
                    email: `u${i}@example.com`
                })
                resp.statusCode.should.equal(200)
            }
            // TODO: check user audit logs - expect 'account.xxx-yyy' { code: '', error, '' }
        })
    })

    describe('Verify FF Tokens', async function () {
        before(async function () {
            app = await setup()
        })
        after(async function () {
            await app.close()
        })
        it('Test token belongs to a project', async function () {
            const authTokens = await app.project.refreshAuthTokens()
            const response = await app.inject({
                method: 'GET',
                url: `/account/check/project/${app.project.id}`,
                headers: {
                    authorization: `Bearer ${authTokens.token}`
                }
            })
            response.statusCode.should.equal(200)
        })

        it('Fail to verify with random project id', async function () {
            const authTokens = await app.project.refreshAuthTokens()
            const response = await app.inject({
                method: 'GET',
                url: '/account/check/project/random',
                headers: {
                    authorization: `Bearer ${authTokens.token}`
                }
            })
            response.statusCode.should.equal(401)
        })

        it('Fail to verify with random project id', async function () {
            const authTokens = await app.project.refreshAuthTokens()
            const response = await app.inject({
                method: 'GET',
                url: `/account/check/team/${app.project.id}`,
                headers: {
                    authorization: `Bearer ${authTokens.token}`
                }
            })
            response.statusCode.should.equal(401)
        })

        it('Test token gets quota', async function () {
            const authTokens = await app.project.refreshAuthTokens()
            const response = await app.inject({
                method: 'GET',
                url: `/account/check/project/${app.project.id}`,
                headers: {
                    authorization: `Bearer ${authTokens.token}`,
                    'ff-quota': 'true'
                }
            })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('quota')
            body.quota.should.have.property('file')
            body.quota.should.have.property('context')
        })
    })

    describe('MFA Tokens', async function () {
        let mfaToken
        before(async function () {
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTA4ODAwLCJleHAiOjc5ODY5ODg3OTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjo1LCJ0ZWFtcyI6NTAsInByb2plY3RzIjo1MCwiZGV2aWNlcyI6NTAsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNTQ4NjAyfQ.vvSw6pm-NP5e0NUL7yMOG-w0AgB8H3NRGGN7b5Dw_iW5DiIBbVQ4HVLEi3dyy9fk7WgKnloiCCkIFJvN79fK_g'
            app = await setup({ license })
            const user = await app.factory.createUser({
                admin: true,
                username: 'mfaUser',
                name: 'MFA User',
                email: 'mfa@example.com',
                password: 'mmPassword',
                mfa_enabled: 'true'
            })
            mfaToken = await app.db.models.MFAToken.createTokenForUser(user)
        })
        after(async function () {
            await app.close()
        })
        describe('login', function () {
            it('prompts for mfa token when enabled', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/account/login',
                    payload: { username: 'mfauser', password: 'mmPassword' }
                })
                response.should.have.property('statusCode', 403)
                response.cookies.should.have.length(1)
                response.cookies[0].should.have.property('name', 'sid')
                const result = response.json()
                result.should.have.property('code', 'mfa_required')

                // Provide a good token - TODO: real token handling
                const mfaResponse = await app.inject({
                    method: 'POST',
                    url: '/account/login/token',
                    payload: { token: mfaToken.generateToken() },
                    cookies: { sid: response.cookies[0].value }
                })
                mfaResponse.should.have.property('statusCode', 200)
            })

            it('rejects invalid mfa token', async function () {
                // Do initial login
                const response = await app.inject({
                    method: 'POST',
                    url: '/account/login',
                    payload: { username: 'mfauser', password: 'mmPassword' }
                })
                // Check we got 403'd to prompt for mfa token
                response.should.have.property('statusCode', 403)

                // Provide a bad token - TODO: real token handling
                const mfaResponse = await app.inject({
                    method: 'POST',
                    url: '/account/login/token',
                    payload: { token: '000000' },
                    cookies: { sid: response.cookies[0].value }
                })
                mfaResponse.should.have.property('statusCode', 401)
                // Check it clears the old session cookie
                mfaResponse.cookies.should.have.length(1)
                mfaResponse.cookies[0].should.have.property('name', 'sid')
                mfaResponse.cookies[0].should.have.property('value', '')
            })

            it('rejects access if session does not have mfa verified flag set', async function () {
                // Do initial login
                const response = await app.inject({
                    method: 'POST',
                    url: '/account/login',
                    payload: { username: 'mfauser', password: 'mmPassword' }
                })
                // Check we got 403'd to prompt for mfa token
                response.should.have.property('statusCode', 403)

                // Check our session cookie doesn't allow general api access
                const apiResponse = await app.inject({
                    method: 'GET',
                    url: '/api/v1/user',
                    cookies: { sid: response.cookies[0].value }
                })
                apiResponse.should.have.property('statusCode', 401)
                // Check it clears the old session cookie
                apiResponse.cookies.should.have.length(1)
                apiResponse.cookies[0].should.have.property('name', 'sid')
                apiResponse.cookies[0].should.have.property('value', '')

                // Check we cannot continue the mfa auth flow with this session - TODO: real token handling
                const mfaResponse = await app.inject({
                    method: 'POST',
                    url: '/account/login/token',
                    payload: { token: mfaToken.generateToken() },
                    cookies: { sid: response.cookies[0].value }
                })
                mfaResponse.should.have.property('statusCode', 401)
            })
        })

        describe('setup', function () {
            let userCount = 0
            async function createUser () {
                userCount++
                const user = await app.factory.createUser({
                    admin: true,
                    username: `mfaUser${userCount}`,
                    name: 'MFA User',
                    email: `mfa${userCount}@example.com`,
                    password: 'mmPassword'
                })
                await login(`mfaUser${userCount}`, 'mmPassword')
                return user
            }

            it('setup mfa returns qrcode that needs to be verified', async function () {
                const user = await createUser()
                const mfaResponse = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user/mfa',
                    payload: { },
                    cookies: { sid: TestObjects.tokens[user.username] }
                })
                mfaResponse.statusCode.should.equal(200)
                const reply = mfaResponse.json()
                reply.should.have.property('url').match(/\/mfaUser1@FlowFuse\?/)
                reply.should.have.property('qrcode')

                // Check the mfa_* flags are set properly on user and token
                await user.reload()
                user.mfa_enabled.should.be.false()
                const token = await app.db.models.MFAToken.forUser(user)
                token.verified.should.be.false()

                // Generate a valid code and use it to verify the mfa setup
                const goodToken = token.generateToken()
                const verifyResponse = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user/mfa/verify',
                    payload: { token: goodToken },
                    cookies: { sid: TestObjects.tokens[user.username] }
                })
                verifyResponse.statusCode.should.equal(200)

                // Verify the mfa_* flags are set properly on user and token
                await user.reload()
                user.mfa_enabled.should.be.true()
                await token.reload()
                token.verified.should.be.true()
            })

            it('resets mfa if verification step fails', async function () {
                const user = await createUser()
                const mfaResponse = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user/mfa',
                    payload: { },
                    cookies: { sid: TestObjects.tokens[user.username] }
                })
                mfaResponse.statusCode.should.equal(200)

                // Check the mfa_* flags are set properly on user and token
                await user.reload()
                user.mfa_enabled.should.be.false()
                const token = await app.db.models.MFAToken.forUser(user)
                token.verified.should.be.false()

                // Submit an invalid code
                const verifyResponse = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user/mfa/verify',
                    payload: { token: '000000' },
                    cookies: { sid: TestObjects.tokens[user.username] }
                })
                verifyResponse.statusCode.should.equal(400)
                const reply = verifyResponse.json()
                reply.should.have.property('code', 'mfa_failed')

                // Verify the mfa_* flags are set properly on user and token
                await user.reload()
                user.mfa_enabled.should.be.false()
                // Check there's no pending token for this user
                const token2 = await app.db.models.MFAToken.forUser(user)
                should.not.exist(token2)
            })

            it('user can delete mfa token', async function () {
                const user = await createUser(true)
                const mfaResponse = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user/mfa',
                    payload: { },
                    cookies: { sid: TestObjects.tokens[user.username] }
                })
                mfaResponse.statusCode.should.equal(200)

                const token = await app.db.models.MFAToken.forUser(user)
                const goodToken = token.generateToken()
                const verifyResponse = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user/mfa/verify',
                    payload: { token: goodToken },
                    cookies: { sid: TestObjects.tokens[user.username] }
                })
                verifyResponse.statusCode.should.equal(200)

                // Now we can finally delete the mfa setup
                const deleteResponse = await app.inject({
                    method: 'DELETE',
                    url: '/api/v1/user/mfa',
                    cookies: { sid: TestObjects.tokens[user.username] }
                })
                deleteResponse.statusCode.should.equal(200)

                // Verify the mfa_* flags are set properly on user and token
                await user.reload()
                user.mfa_enabled.should.be.false()
                // Check there's no pending token for this user
                const token2 = await app.db.models.MFAToken.forUser(user)
                should.not.exist(token2)
            })

            it('user cannot modify mfa without deleting', async function () {
                // Setup MFA
                const user = await createUser(true)
                const mfaResponse = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user/mfa',
                    payload: { },
                    cookies: { sid: TestObjects.tokens[user.username] }
                })
                mfaResponse.statusCode.should.equal(200)

                const token = await app.db.models.MFAToken.forUser(user)
                const goodToken = token.generateToken()
                const verifyResponse = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user/mfa/verify',
                    payload: { token: goodToken },
                    cookies: { sid: TestObjects.tokens[user.username] }
                })
                verifyResponse.statusCode.should.equal(200)

                // Now we try to setup mfa again
                const mfaResponse2 = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user/mfa',
                    payload: { },
                    cookies: { sid: TestObjects.tokens[user.username] }
                })
                mfaResponse2.statusCode.should.equal(400)
                const reply = mfaResponse2.json()
                reply.should.have.property('code', 'mfa_enabled')
            })
        })
    })

    describe('Password reset', async function () {
        let testUser
        before(async function () {
            app = await setup()
        })
        after(async function () {
            await app.close()
        })
        beforeEach(async function () {
            testUser = await app.factory.createUser({
                username: 'testUser',
                name: 'Test User',
                email: 'testReset@example.com',
                password: 'ttPassword'
            })
            await login('testUser', 'ttPassword')
        })
        afterEach(async function () {
            // Reset settings to default
            app.settings.set('user:reset-password', false)
            await testUser.destroy()
        })

        it('Password reset rejected if not enabled on platform', async function () {
            app.settings.set('user:reset-password', false)
            const response = await app.inject({
                method: 'POST',
                url: '/account/forgot_password',
                payload: { email: 'testReset@example.com' }
            })
            response.statusCode.should.equal(400)
        })

        it('Password reset can be submitted for a known user', async function () {
            app.settings.set('user:reset-password', true)

            // Create a second login session to verify existing sessions are ended
            const secondLoginSession = await app.inject({
                method: 'POST',
                url: '/account/login',
                payload: { username: 'testUser', password: 'ttPassword', remember: false }
            })
            secondLoginSession.cookies.should.have.length(1)
            secondLoginSession.cookies[0].should.have.property('name', 'sid')
            const secondLoginSessionId = secondLoginSession.cookies[0].value

            // Submit the reset request
            const response = await app.inject({
                method: 'POST',
                url: '/account/forgot_password',
                payload: { email: 'testReset@example.com' }
            })
            response.statusCode.should.equal(200)
            app.config.email.transport.getMessageQueue().should.have.lengthOf(1)
            const resetEmail = app.config.email.transport.getMessageQueue()[0].text
            // Extract token from the email notification
            const m = /\/account\/change-password\/(ffpr_\S+)/.exec(resetEmail)
            should.exist(m[1])
            const token = m[1]

            // Submit reset
            const resetResponse = await app.inject({
                method: 'POST',
                url: `/account/reset_password/${token}`,
                payload: { password: 'BoatShelfLegoDroid' }
            })
            resetResponse.statusCode.should.equal(200)

            // The existing session token should no longer work
            const checkOldToken = await app.inject({
                method: 'GET',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.testUser }
            })
            checkOldToken.statusCode.should.equal(401)

            // The existing session token should no longer work
            const checkSecondToken = await app.inject({
                method: 'GET',
                url: '/api/v1/user',
                cookies: { sid: secondLoginSessionId }
            })
            checkSecondToken.statusCode.should.equal(401)

            // The reset token cannot be reused
            const resetResponse2 = await app.inject({
                method: 'POST',
                url: `/account/reset_password/${token}`,
                payload: { password: 'BoatShelfLegoDroidAgain' }
            })
            resetResponse2.statusCode.should.equal(400)

            // Should be able to login with new password
            await login('testUser', 'BoatShelfLegoDroid')
        })

        it('Password reset for an unknown user does not error', async function () {
            // We do not disclose whether this is a valid user or not
            app.settings.set('user:reset-password', true)
            const response = await app.inject({
                method: 'POST',
                url: '/account/forgot_password',
                payload: { email: 'unknown@example.com' }
            })
            response.statusCode.should.equal(200)
        })
    })
})
