const should = require('should') // eslint-disable-line
const setup = require('../../setup')
const fastify = require('fastify')

describe('SSO Providers', function () {
    let app

    beforeEach(async function () {
        app = await setup()

        app.samlProviders = {}
        app.samlProviders.provider1 = await app.db.models.SAMLProvider.create({
            name: 'example.com',
            domainFilter: '@example.com',
            active: true,
            options: {
                cert: '-----BEGIN CERTIFICATE-----abcde-----END CERTIFICATE-----',
                entryPoint: 'https://sso.example.com/entry'
            }
        })
        app.samlProviders.provider2 = await app.db.models.SAMLProvider.create({
            name: 'inactive.com',
            domainFilter: '@inactive.com',
            active: false,
            options: {}
        })

        app.samlProviders.provider3 = await app.db.models.SAMLProvider.create({
            name: 'multilinecert',
            domainFilter: 'certtest.com',
            active: true,
            options: {
                cert: `-----BEGIN CERTIFICATE-----
                a
        b
c
        d
    e-----END CERTIFICATE-----`
            }
        })
        app.samlProviders.provider4 = await app.db.models.SAMLProvider.create({
            name: 'no-prefix-cert',
            domainFilter: 'certtest2.com',
            active: true,
            options: {
                cert: `
                a
b
c
d
    e`
            }
        })
    })

    afterEach(async function () {
        if (app) {
            await app.close()
            app = null
        }
    })

    describe('isSSOEnabledForEmail', async function () {
        it('it checks the email domain for an active provider', async function () {
            let result = await app.sso.isSSOEnabledForEmail('test@example.com')
            result.should.be.true()

            result = await app.sso.isSSOEnabledForEmail('test@ExAmple.com')
            result.should.be.true()

            result = await app.sso.isSSOEnabledForEmail('test@inactive.com')
            result.should.be.false()

            result = await app.sso.isSSOEnabledForEmail('test@unknown.com')
            result.should.be.false()
        })
    })

    describe('getProviderForEmail', async function () {
        it('gets provider id for known domain', async function () {
            const providerId = await app.sso.getProviderForEmail('test@ExAmple.com')
            providerId.should.equal(app.samlProviders.provider1.hashid)
        })
        it('returns null for unknown domain', async function () {
            const providerId = await app.sso.getProviderForEmail('test@unknown.com')
            should.not.exist(providerId)
        })
        it('returns null for inactive domain', async function () {
            const providerId = await app.sso.getProviderForEmail('test@inactive.com')
            should.not.exist(providerId)
        })
    })

    describe('getProviderOptions', async function () {
        it('gets provider options for known provider', async function () {
            const result = await app.sso.getProviderOptions(app.samlProviders.provider1.hashid)
            result.should.have.only.keys('issuer', 'callbackUrl', 'cert', 'entryPoint')
            result.issuer.should.equal(`http://localhost:3000/ee/sso/entity/${app.samlProviders.provider1.hashid}`)
            result.callbackUrl.should.equal('http://localhost:3000/ee/sso/login/callback')
            result.cert.should.equal('abcde')
            result.entryPoint.should.equal('https://sso.example.com/entry')
        })
        it('returns null for unknown provider', async function () {
            const result = await app.sso.getProviderOptions('unknown')
            should.not.exist(result)
        })
        it('handles multi-line cert', async function () {
            const result = await app.sso.getProviderOptions(app.samlProviders.provider3.hashid)
            result.cert.should.equal('abcde')
        })
        it('handles multi-line cert without header/footer', async function () {
            const result = await app.sso.getProviderOptions(app.samlProviders.provider4.hashid)
            result.cert.should.equal('abcde')
        })
    })

    describe('handleLoginRequest', async function () {
        let localApp
        beforeEach(async function () {
            localApp = fastify()
            localApp.post('/test-sso', async (request, reply) => {
                if (await app.sso.handleLoginRequest(request, reply)) {
                    return
                }
                reply.code(200).send({})
            })
            await localApp.ready()
        })
        afterEach(async function () {
            await localApp.close()
        })

        it('ignores login attempts for non sso domains - email provided', async function () {
            const response = await localApp.inject({
                method: 'POST',
                url: '/test-sso',
                payload: {
                    username: 'nick@normal.com'
                }
            })
            response.statusCode.should.equal(200)
        })
        it('ignores login attempts for non sso domains - username provided', async function () {
            const response = await localApp.inject({
                method: 'POST',
                url: '/test-sso',
                payload: {
                    username: 'randomUser'
                }
            })
            response.statusCode.should.equal(200)
        })
        it('handles sso enabled login request - email provided', async function () {
            const response = await localApp.inject({
                method: 'POST',
                url: '/test-sso',
                payload: {
                    username: 'alice@example.com'
                }
            })
            const result = response.json()
            response.statusCode.should.equal(401)
            result.should.have.property('code', 'sso_required')
            result.should.have.property('redirect')
        })
        it('handles sso enabled login request - username provided, non-admin', async function () {
            await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
            const response = await localApp.inject({
                method: 'POST',
                url: '/test-sso',
                payload: {
                    username: 'bob'
                }
            })
            const result = response.json()
            response.statusCode.should.equal(401)
            result.should.have.property('code', 'sso_required')
            result.should.not.have.property('redirect')
            result.should.have.property('error', 'Please login with your email address')
        })
        it('skips sso requirement if sso enabled admin provides username', async function () {
            const response = await localApp.inject({
                method: 'POST',
                url: '/test-sso',
                payload: {
                    username: 'alice'
                }
            })
            response.statusCode.should.equal(200)
        })
    })
})
