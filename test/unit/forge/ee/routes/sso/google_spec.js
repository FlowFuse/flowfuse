const { OAuth2Client } = require('google-auth-library')
const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../../setup')

describe('Google SSO callback', function () {
    let app
    let userinfo
    let codeCounter = 0

    before(async function () {
        app = await setup({ billing: undefined })
        await app.settings.set('platform:sso:google', true)
        await app.settings.set('platform:sso:google:clientId', 'test-client-id')

        await app.db.models.User.create({ username: 'carol', name: 'Carol', email: 'carol@corp.com', email_verified: true, password: 'ccPassword1!' })
        await app.db.models.User.create({ username: 'dave', name: 'Dave', email: 'dave@plain.com', email_verified: true, password: 'ddPassword1!' })
        await app.db.models.SAMLProvider.create({
            name: 'corp.com',
            domainFilter: '@corp.com',
            active: true,
            options: {
                cert: '-----BEGIN CERTIFICATE-----abcde-----END CERTIFICATE-----',
                entryPoint: 'https://sso.corp.com/entry'
            }
        })

        await app.db.models.SAMLProvider.create({
            name: 'ldap.com',
            domainFilter: '@ldap.com',
            active: true,
            type: 'ldap',
            options: {
                server: 'ldap://localhost:3893',
                username: 'cn=search,dc=ldap,dc=com',
                password: 'secret',
                baseDN: 'dc=ldap,dc=com',
                userFilter: '(mail=${email})' // eslint-disable-line no-template-curly-in-string
            }
        })

        sinon.stub(OAuth2Client.prototype, 'getTokenInfo').resolves({ aud: 'test-client-id' })
        sinon.stub(OAuth2Client.prototype, 'request').callsFake(async () => ({ data: userinfo }))
    })

    after(async function () {
        sinon.restore()
        await app.close()
    })

    async function googleCallback (info) {
        userinfo = info
        return app.inject({
            method: 'POST',
            url: `/ee/sso/login/callback/google?code=code-${codeCounter++}`
        })
    }

    it('redirects a consumer account on an SSO enforced domain to the provider', async function () {
        const response = await googleCallback({ email: 'carol@corp.com', email_verified: true })
        response.statusCode.should.equal(200)
        response.json().should.have.property('url', `/ee/sso/login?u=${encodeURIComponent('carol@corp.com')}`)
        response.cookies.should.have.length(0)
    })

    it('redirects a Workspace account on an SSO enforced domain to the provider', async function () {
        const response = await googleCallback({ email: 'carol@corp.com', email_verified: true, hd: 'corp.com' })
        response.statusCode.should.equal(200)
        response.json().should.have.property('url', `/ee/sso/login?u=${encodeURIComponent('carol@corp.com')}`)
        response.cookies.should.have.length(0)
    })

    it('rejects an account on a domain whose SSO provider is LDAP', async function () {
        const response = await googleCallback({ email: 'erin@ldap.com', email_verified: true })
        response.statusCode.should.equal(403)
        response.json().should.have.property('code', 'ldap_sso')
        response.cookies.should.have.length(0)
    })

    it('rejects an account whose email Google reports as unverified', async function () {
        const response = await googleCallback({ email: 'dave@plain.com', email_verified: false })
        response.statusCode.should.equal(403)
        response.json().should.have.property('code', 'unverified_email')
        response.cookies.should.have.length(0)
    })

    it('rejects an account with no email_verified claim', async function () {
        const response = await googleCallback({ email: 'dave@plain.com' })
        response.statusCode.should.equal(403)
        response.json().should.have.property('code', 'unverified_email')
        response.cookies.should.have.length(0)
    })

    it('returns an error for a Workspace account on a domain with no SSO provider', async function () {
        const response = await googleCallback({ email: 'dave@plain.com', email_verified: true, hd: 'plain.com' })
        response.statusCode.should.equal(200)
        response.json().should.have.property('error', 'SSO not available for this Google Workspace domain')
        response.cookies.should.have.length(0)
    })

    it('signs in an existing user on a domain with no SSO provider', async function () {
        const response = await googleCallback({ email: 'dave@plain.com', email_verified: true })
        response.statusCode.should.equal(200)
        response.json().should.have.property('url', '/')
        response.cookies.should.have.length(1)
        response.cookies[0].name.should.equal('sid')
    })
})
