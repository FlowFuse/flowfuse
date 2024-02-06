const should = require('should') // eslint-disable-line
const { compareHash } = require('../../forge/db/utils.js')

const FF_UTIL = require('flowforge-test-utils')

const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')

describe('Default Admin User', function () {
    // forge - this will be the running FF application we are testing
    let forge
    // inbox - a local transport we can use to capture email without an SMTP server
    const inbox = new LocalTransport()

    const defaultConfig = {
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
        },
        create_admin: true
    }

    async function createFlowForgeApp (config) {
        return await FF_UTIL.setupApp({ ...defaultConfig, ...config })
    }

    afterEach(async function () {
        return await forge.close()
    })

    it('should create admin user on start', async function () {
        forge = await createFlowForgeApp()
        const admin = await forge.db.models.User.findOne({
            where: {
                admin: true
            }
        })

        admin.should.have.property('username', 'ff-admin')
        admin.should.have.property('email', 'admin@example.com')
        admin.should.have.property('password_expired', true)
    })

    it('should create admin user on start using FF_ADMIN_PASSWORD as the password', async function () {
        process.env.FF_ADMIN_PASSWORD = '12345678'
        forge = await createFlowForgeApp()
        const admin = await forge.db.models.User.findOne({
            where: {
                admin: true
            }
        })

        should(compareHash(process.env.FF_ADMIN_PASSWORD, admin.password)).true()
    })

    it('should create admin access token on start if create_admin = true and create_admin_access_token = true', async function () {
        forge = await createFlowForgeApp({
            create_admin: true,
            create_admin_access_token: true
        })
        const accessToken = await forge.db.models.AccessToken.findAll()
        should(accessToken.length).be.equal(1)
    })

    it('should not create admin access token on start if create_admin = true and create_admin_access_token = false', async function () {
        forge = await createFlowForgeApp({
            create_admin: true,
            create_admin_access_token: false
        })
        const accessToken = await forge.db.models.AccessToken.findAll()

        accessToken.should.be.empty()
    })

    it('should not create admin access token on start if create_admin = false and create_admin_access_token = true', async function () {
        forge = await createFlowForgeApp({
            create_admin: false,
            create_admin_access_token: true
        })
        const accessToken = await forge.db.models.AccessToken.findAll()

        accessToken.should.be.empty()
    })

    it('should not create admin access token on start if create_admin = false and create_admin_access_token = false', async function () {
        forge = await createFlowForgeApp({
            create_admin: false,
            create_access_token: false
        })
        const accessToken = await forge.db.models.AccessToken.findAll()

        accessToken.should.be.empty()
    })

    it('setup:initialised should start false if create_admin = false and create_admin_access_token = false', async function () {
        forge = await createFlowForgeApp({
            create_admin: false,
            create_access_token: false
        })
        const setupInitialized = await forge.settings.get('setup:initialised')
        setupInitialized.should.be.false()
    })

    it('setup:initialised should start true if create_admin = true and create_admin_access_token = false', async function () {
        forge = await createFlowForgeApp({
            create_admin: true,
            create_access_token: false
        })
        const setupInitialized = await forge.settings.get('setup:initialised')
        setupInitialized.should.be.true()
    })

    it('setup:initialised should start false if create_admin = false and create_admin_access_token = true', async function () {
        forge = await createFlowForgeApp({
            create_admin: false,
            create_access_token: true
        })
        const setupInitialized = await forge.settings.get('setup:initialised')
        setupInitialized.should.be.false()
    })

    it('setup:initialised should start true if create_admin = true and create_admin_access_token = true', async function () {
        forge = await createFlowForgeApp({
            create_admin: true,
            create_access_token: true
        })
        const setupInitialized = await forge.settings.get('setup:initialised')
        setupInitialized.should.be.true()
    })
})
