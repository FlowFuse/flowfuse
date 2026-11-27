const should = require('should')

const { getLoginRedirect } = require('../../../../../../forge/ee/routes/sso/auth.js')
const setup = require('../../setup')

function getRelayState (location) {
    return JSON.parse(new URL(location).searchParams.get('RelayState'))
}

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
        app.samlProvider = await app.db.models.SAMLProvider.create({
            name: 'saml.com',
            domainFilter: '@saml.com',
            active: true,
            options: {
                cert: '-----BEGIN CERTIFICATE-----abcde-----END CERTIFICATE-----',
                entryPoint: 'https://sso.saml.com/entry'
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

    it('starts the SAML flow for an email on a SAML domain', async function () {
        const response = await app.inject({ method: 'GET', url: '/ee/sso/login?u=user%40saml.com' })
        response.statusCode.should.equal(302)
        response.headers.location.should.startWith('https://sso.saml.com/entry')
    })

    it('starts the SAML flow for a provider id', async function () {
        const response = await app.inject({ method: 'GET', url: `/ee/sso/login?p=${app.samlProvider.hashid}` })
        response.statusCode.should.equal(302)
        response.headers.location.should.startWith('https://sso.saml.com/entry')
    })

    it('does not include a redirect in the RelayState when none is requested', async function () {
        const response = await app.inject({ method: 'GET', url: '/ee/sso/login?u=user%40saml.com' })
        response.statusCode.should.equal(302)
        const state = getRelayState(response.headers.location)
        state.should.have.property('provider')
        state.should.not.have.property('redirectTo')
    })

    it('includes the requested redirect in the RelayState for an email', async function () {
        const response = await app.inject({ method: 'GET', url: '/ee/sso/login?u=user%40saml.com&r=%2Fteam%2Fabc' })
        response.statusCode.should.equal(302)
        getRelayState(response.headers.location).should.have.property('redirectTo', '/team/abc')
    })

    it('includes the requested redirect in the RelayState for a provider id', async function () {
        const response = await app.inject({ method: 'GET', url: `/ee/sso/login?p=${app.samlProvider.hashid}&r=%2Fteam%2Fabc` })
        response.statusCode.should.equal(302)
        getRelayState(response.headers.location).should.have.property('redirectTo', '/team/abc')
    })

    it('redirects home for an unknown provider id', async function () {
        const response = await app.inject({ method: 'GET', url: '/ee/sso/login?p=unknown' })
        response.statusCode.should.equal(302)
        response.headers.should.have.property('location', '/')
    })

    it('redirects home when no email or provider is given', async function () {
        const response = await app.inject({ method: 'GET', url: '/ee/sso/login' })
        response.statusCode.should.equal(302)
        response.headers.should.have.property('location', '/')
    })

    it('redirects home when the callback names an unknown provider', async function () {
        const response = await app.inject({
            method: 'POST',
            url: '/ee/sso/login/callback',
            payload: { RelayState: JSON.stringify({ provider: 'unknown' }), SAMLResponse: 'abc' }
        })
        response.statusCode.should.equal(302)
        response.headers.should.have.property('location', '/')
    })

    it('redirects home when the callback names an LDAP provider', async function () {
        const ldapProviderId = await app.sso.getProviderForEmail('user@ldap.com')
        const response = await app.inject({
            method: 'POST',
            url: '/ee/sso/login/callback',
            payload: { RelayState: JSON.stringify({ provider: ldapProviderId }), SAMLResponse: 'abc' }
        })
        response.statusCode.should.equal(302)
        response.headers.should.have.property('location', '/')
    })
})

describe('SSO login redirect', function () {
    it('sends an existing user home when no redirect is requested', function () {
        getLoginRedirect(JSON.stringify({ provider: 'abc' }), false).should.equal('/')
        getLoginRedirect(undefined, false).should.equal('/')
    })

    it('sends a new user to their account settings when no redirect is requested', function () {
        getLoginRedirect(JSON.stringify({ provider: 'abc' }), true).should.equal('/account/settings')
        getLoginRedirect(undefined, true).should.equal('/account/settings')
    })

    it('sends an existing user to the requested redirect', function () {
        getLoginRedirect(JSON.stringify({ provider: 'abc', redirectTo: '/team/abc' }), false).should.equal('/team/abc')
    })

    it('sends a new user to the requested redirect', function () {
        getLoginRedirect(JSON.stringify({ provider: 'abc', redirectTo: '/team/abc' }), true).should.equal('/team/abc')
    })

    it('ignores a non-local requested redirect', function () {
        getLoginRedirect(JSON.stringify({ provider: 'abc', redirectTo: 'https://example.com' }), false).should.equal('/')
        getLoginRedirect(JSON.stringify({ provider: 'abc', redirectTo: '//example.com' }), false).should.equal('/')
    })

    it('falls back to the default for a malformed RelayState', function () {
        const warnings = []
        const log = { warn: msg => warnings.push(msg) }
        getLoginRedirect('not json', false, log).should.equal('/')
        getLoginRedirect('not json', true, log).should.equal('/account/settings')
        getLoginRedirect('null', true, log).should.equal('/account/settings')
        warnings.should.have.length(2)
    })
})
