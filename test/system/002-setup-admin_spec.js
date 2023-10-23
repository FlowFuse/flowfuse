const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')
const { compareHash } = require("../../forge/db/utils.js");

describe('Default Admin User', function () {
    // forge - this will be the running FF application we are testing
    let forge
    // inbox - a local transport we can use to capture email without an SMTP server
    const inbox = new LocalTransport()

    async function createFlowForgeApp () {
        return await FF_UTIL.setupApp({
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
        })
    }

    after(function () {
        return forge.close()
    })

    let CSRF_TOKEN
    const CSRF_COOKIE = {}

    it('should create admin user on start of wizard', async function () {
        forge = await createFlowForgeApp()
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

        const admin = await forge.db.models.User.findOne({
            where: {
                admin: true
            }
        })

        admin.should.have.property('username', 'ff-admin')
        admin.should.have.property('email', 'admin@example.com')
        admin.should.have.property('password_expired', true)
    })

    it('should create admin user on start of wizard using FF_ADMIN_PASSWORD as the password', async function () {
        process.env.FF_ADMIN_PASSWORD = '12345678'
        await createFlowForgeApp()
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

        const admin = await forge.db.models.User.findOne({
            where: {
                admin: true
            }
        })

        admin.should.have.property('username', 'ff-admin')
        admin.should.have.property('email', 'admin@example.com')
        admin.should.have.property('password_expired', true)
        should(compareHash(process.env.FF_ADMIN_PASSWORD, admin.password)).true()
    })
})
