const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')

describe('First run setup', function () {
    // forge - this will be the running FF application we are testing
    let forge
    // inbox - a local transport we can use to capture email without an SMTP server
    const inbox = new LocalTransport()

    before(async function () {
        // Create the FF application with a suitable test configuration
        forge = await FF_UTIL.setupApp({
            telemetry: { enabled: false },
            driver: {
                type: 'stub'
            },
            db: {
                type: 'sqlite',
                storage: ':memory:'
            },
            email: {
                enabled: true,
                transport: inbox
            }
        })
    })

    after(function () {
        return forge.close()
    })

    let CSRF_TOKEN
    const CSRF_COOKIE = {}

    it('setup:initialised should start false', async function () {
        forge.settings.get('setup:initialised').should.be.false()
    })

    it('should redirect / to setup application', async function () {
        const response = await forge.inject({
            method: 'GET',
            url: '/'
        })
        response.statusCode.should.equal(302)
        response.headers.location.should.equal('/setup')
    })

    it('should load the setup application', async function () {
        const response = await forge.inject({
            method: 'GET',
            url: '/setup'
        })

        const match = /SETUP_CSRF_TOKEN = "(.*?)"/.exec(response.payload)
        CSRF_TOKEN = match[1]
        should.exist(CSRF_TOKEN)

        const cookies = response.cookies
        cookies.should.have.lengthOf(1)
        cookies[0].should.have.property('name', '_csrf')
        CSRF_COOKIE[cookies[0].name] = cookies[0].value
    })

    it('should have correct initial status', async function () {
        const response = await forge.inject({
            method: 'GET',
            url: '/setup/status'
        })
        const body = response.json()

        body.adminUser.should.be.false()
        body.license.should.be.false()
        body.email.should.be.true()
    })

    describe('Create Admin User', function () {
        it('should reject missing csrf - secret', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/create-user',
                payload: { _csrf: CSRF_TOKEN }
                // cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('statusCode', 403)
            body.should.have.property('error', 'Forbidden')
            body.should.have.property('message').match(/Missing csrf secret/)
        })
        it('should reject missing csrf - token', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/create-user',
                payload: {},
                cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('statusCode', 403)
            body.should.have.property('error', 'Forbidden')
            body.should.have.property('message').match(/Invalid csrf token/)
        })
        it('should create an admin user', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/create-user',
                payload: {
                    _csrf: CSRF_TOKEN,
                    name: 'Alice Skywalker',
                    email: 'alice@example.com',
                    username: 'alice',
                    password: '12345678'
                },
                cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('status', 'okay')

            const userCount = await forge.db.models.User.count()
            const adminCount = (await forge.db.models.User.admins()).length
            userCount.should.equal(1)
            adminCount.should.equal(1)

            const adminUser = await forge.db.models.User.byUsername('alice')
            should.exist(adminUser)
            adminUser.name.should.equal('Alice Skywalker')
            adminUser.username.should.equal('alice')
            adminUser.email.should.equal('alice@example.com')
            adminUser.email_verified.should.equal(true)
        })
        it('should reject admin username', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/create-user',
                payload: {
                    _csrf: CSRF_TOKEN,
                    name: 'Alice Skywalker',
                    email: 'alice@example.com',
                    username: 'alice <test>',
                    password: '12345678'
                },
                cookies: CSRF_COOKIE
            })
            const body = response.json()
            response.statusCode.should.equal(400)
            body.should.have.property('error', 'invalid username')
        })
        it('status should report admin created', async function () {
            const response = await forge.inject({
                method: 'GET',
                url: '/setup/status'
            })
            const body = response.json()

            body.adminUser.should.be.true()
            body.license.should.be.false()
            body.email.should.be.true()

            forge.settings.get('setup:initialised').should.be.false()
        })
    })

    describe('Apply settings (pre-license)', function () {
        it('should accept settings', async function () {
            forge.settings.get('telemetry:enabled').should.be.true()

            const response = await forge.inject({
                method: 'POST',
                url: '/setup/settings',
                payload: {
                    _csrf: CSRF_TOKEN,
                    telemetry: false
                },
                cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('status', 'okay')
            // Telemetry can be disabled because license is not yet applied
            forge.settings.get('telemetry:enabled').should.be.false()
            forge.settings.get('setup:initialised').should.be.false()
        })
    })
    describe('Upload license', function () {
        it('should reject missing csrf - secret', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/add-license',
                payload: { _csrf: CSRF_TOKEN }
                // cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('statusCode', 403)
            body.should.have.property('error', 'Forbidden')
            body.should.have.property('message').match(/Missing csrf secret/)
        })
        it('should reject missing csrf - token', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/add-license',
                payload: {},
                cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('statusCode', 403)
            body.should.have.property('error', 'Forbidden')
            body.should.have.property('message').match(/Invalid csrf token/)
        })
        it('should reject invalid license', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/add-license',
                payload: {
                    _csrf: CSRF_TOKEN,
                    license: '1234'
                },
                cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('error', 'Failed to parse license')
        })
        it('should accept valid license', async function () {
            // Ensure no active license to start
            forge.license.active().should.be.false()

            const response = await forge.inject({
                method: 'POST',
                url: '/setup/add-license',
                payload: {
                    _csrf: CSRF_TOKEN,
                    license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjM5NzUxMTc1LCJleHAiOjcyNTgxMTg0MDAsIm5vdGUiOiJGb3IgZGV2ZWxvcG1lbnQgb25seSIsInRpZXIiOiJ0ZWFtcyIsInVzZXJzIjoiMTAwIiwidGVhbXMiOiIxMDAiLCJwcm9qZWN0cyI6IjEwMCIsImlhdCI6MTYzOTc1MTE3NX0.CZwIbUV9-vC1dPHaJqVJx1YchK_4JgRMBCd5UEQfNYblXNJKiaR9BFY7T-Qvzg1HsR3rbDhmraiiVMfGuR75gw'
                },
                cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('status', 'okay')

            forge.license.active().should.be.true()
            forge.license.get('organisation', 'FlowForge Inc. Development')

            forge.settings.get('setup:initialised').should.be.false()
        })
        it('status should report license added', async function () {
            const response = await forge.inject({
                method: 'GET',
                url: '/setup/status'
            })
            const body = response.json()

            body.adminUser.should.be.true()
            body.license.should.be.true()
            body.email.should.be.true()
        })
    })

    describe('Apply settings (post-license)', function () {
        it('should reject missing csrf - secret', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/settings',
                payload: { _csrf: CSRF_TOKEN }
                // cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('statusCode', 403)
            body.should.have.property('error', 'Forbidden')
            body.should.have.property('message').match(/Missing csrf secret/)
        })
        it('should reject missing csrf - token', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/settings',
                payload: {},
                cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('statusCode', 403)
            body.should.have.property('error', 'Forbidden')
            body.should.have.property('message').match(/Invalid csrf token/)
        })

        it('should not disable telemetry', async function () {
            forge.settings.get('telemetry:enabled').should.be.true()

            const response = await forge.inject({
                method: 'POST',
                url: '/setup/settings',
                payload: {
                    _csrf: CSRF_TOKEN,
                    telemetry: false
                },
                cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('status', 'okay')
            // Telemetry should not be disabled because license is active
            forge.settings.get('telemetry:enabled').should.be.true()
            forge.settings.get('setup:initialised').should.be.false()
        })
    })
    describe('Finalise setup', function () {
        it('should reject missing csrf - secret', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/finish',
                payload: { _csrf: CSRF_TOKEN }
                // cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('statusCode', 403)
            body.should.have.property('error', 'Forbidden')
            body.should.have.property('message').match(/Missing csrf secret/)
        })
        it('should reject missing csrf - token', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/finish',
                payload: {},
                cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('statusCode', 403)
            body.should.have.property('error', 'Forbidden')
            body.should.have.property('message').match(/Invalid csrf token/)
        })

        it('should finish setup ', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/finish',
                payload: {
                    _csrf: CSRF_TOKEN
                },
                cookies: CSRF_COOKIE
            })
            const body = response.json()
            body.should.have.property('status', 'okay')
            forge.settings.get('setup:initialised').should.be.true()
        })

        it('all setup routes should be disabled once complete - finish', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/finish',
                payload: {
                    _csrf: CSRF_TOKEN
                },
                cookies: CSRF_COOKIE
            })
            response.statusCode.should.equal(404)
        })
        it('all setup routes should be disabled once complete - settings', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/settings',
                payload: {
                    _csrf: CSRF_TOKEN,
                    telemetry: false
                },
                cookies: CSRF_COOKIE
            })
            response.statusCode.should.equal(404)
        })
        it('all setup routes should be disabled once complete - license', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/add-license',
                payload: {
                    _csrf: CSRF_TOKEN,
                    license: '123456'
                },
                cookies: CSRF_COOKIE
            })
            response.statusCode.should.equal(404)
        })
        it('all setup routes should be disabled once complete - admin user', async function () {
            const response = await forge.inject({
                method: 'POST',
                url: '/setup/create-user',
                payload: {
                    _csrf: CSRF_TOKEN,
                    name: 'Alice Skywalker',
                    email: 'alice@example.com',
                    username: 'alice',
                    password: '12345678'
                },
                cookies: CSRF_COOKIE
            })
            response.statusCode.should.equal(404)
        })

        it('should redirect /setup to /', async function () {
            const response = await forge.inject({
                method: 'GET',
                url: '/setup'
            })
            response.statusCode.should.equal(302)
            response.headers.location.should.equal('/')
        })

        it('should have created default objects', async function () {
            const defaultProjectTypeList = await forge.db.models.ProjectType.findAll()
            defaultProjectTypeList.should.have.length(1)
            const defaultProjectType = defaultProjectTypeList[0]

            const defaultTeamTypeList = await forge.db.models.TeamType.findAll()
            defaultTeamTypeList.should.have.length(1)

            const defaultTeamType = defaultTeamTypeList[0]

            defaultTeamType.properties.should.have.property('instances')
            defaultTeamType.properties.instances.should.have.property(defaultProjectType.hashid)
            defaultTeamType.properties.instances[defaultProjectType.hashid].should.have.property('active', true)

            const defaultTemplateList = await forge.db.models.ProjectTemplate.findAll()
            defaultTemplateList.should.have.length(1)

            const defaultStackList = await forge.db.models.ProjectStack.findAll()
            defaultStackList.should.have.length(1)
        })
    })
})
