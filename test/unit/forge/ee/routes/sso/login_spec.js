const should = require('should')

const setup = require('../../setup')

describe('SSO login for providers the SAML flow cannot start', function () {
    let app

    before(async function () {
        app = await setup({ billing: undefined })
        await app.db.models.SAMLProvider.create({
            name: 'ldap.com',
            domainFilter: '@ldap.com',
            active: true,
            type: 'ldap',
            options: {
                server: 'ldap://localhost:3893',
                username: 'admin',
                password: 'secret',
                baseDN: 'dc=ldap,dc=com',
                userFilter: '(mail=${email})' // eslint-disable-line no-template-curly-in-string
            }
        })
        await app.db.models.SAMLProvider.create({
            name: 'nocert.com',
            domainFilter: '@nocert.com',
            active: true,
            options: {
                entryPoint: 'https://sso.nocert.com/entry'
            }
        })
    })

    after(async function () {
        await app.close()
    })

    it('does not offer SAML options for an LDAP provider', async function () {
        const providerId = await app.sso.getProviderForEmail('user@ldap.com')
        should(providerId).be.ok()
        should(await app.sso.getProviderOptions(providerId)).be.null()
    })

    it('redirects home when SSO login is requested for an LDAP domain', async function () {
        const response = await app.inject({ method: 'GET', url: '/ee/sso/login?u=user%40ldap.com' })
        response.statusCode.should.equal(302)
        response.headers.should.have.property('location', '/')
    })

    it('redirects home when a SAML provider has no certificate', async function () {
        const response = await app.inject({ method: 'GET', url: '/ee/sso/login?u=user%40nocert.com' })
        response.statusCode.should.equal(302)
        response.headers.should.have.property('location', '/')
    })
})
