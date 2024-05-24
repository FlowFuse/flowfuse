const should = require('should') // eslint-disable-line
const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('SSO Provider APIs', function () {
    let app
    /** @type {LocalTransport} */ let inbox
    const TestObjects = { tokens: {} }

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

    before(async function () {
        inbox = new LocalTransport()
        app = await setup({
            email: {
                enabled: true,
                transport: inbox
            },
            billing: undefined
        })
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')

        app.samlProviders = {}
        await addDefaultProviders()
    })

    after(async function () {
        await app.close()
    })
    afterEach(async function () {
        inbox.empty()
        await app.db.models.SAMLProvider.destroy({ where: {} })
        await addDefaultProviders()
    })
    async function addDefaultProviders () {
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
        app.samlProviders.providerLDAP1 = await app.db.models.SAMLProvider.create({
            name: 'ldap-1',
            domainFilter: 'ldap1.com',
            type: 'ldap',
            active: true,
            options: {
                server: 'example.com',
                username: 'bindDN',
                password: 'pw'
            }
        })
    }
    async function countProviders () {
        return await app.db.models.SAMLProvider.count()
    }
    describe('List Providers', async function () {
        it('lists all providers', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/ee/sso/providers',
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.providers.should.have.length(5)

            result.providers.forEach(p => {
                p.should.have.only.keys('id', 'name', 'active', 'domainFilter', 'type')
            })

            result.providers[0].should.have.property('id', app.samlProviders.provider1.hashid)
            // result.providers[0].should.have.property('acsURL', 'http://localhost:3000/ee/sso/login/callback')
            // result.providers[0].should.have.property('entityID', `http://localhost:3000/ee/sso/entity/${app.samlProviders.provider1.hashid}`)

            result.providers[1].should.have.property('id', app.samlProviders.provider2.hashid)
            result.providers[2].should.have.property('id', app.samlProviders.provider3.hashid)
            result.providers[3].should.have.property('id', app.samlProviders.provider4.hashid)
            result.providers[4].should.have.property('id', app.samlProviders.providerLDAP1.hashid)
        })
        it('rejects non-admin request', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/ee/sso/providers',
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })
    })

    describe('Create Provider', async function () {
        it('creates a new provider', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/ee/sso/providers',
                payload: {
                    name: 'newProvider',
                    domainFilter: 'normaLiSE.com'
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'newProvider')
            // check the domain was normalised
            result.should.have.property('domainFilter', '@normalise.com')
            result.should.have.property('type', 'saml')
            // Starts at 5
            ;(await countProviders()).should.equal(6)
        })
        it('rejects non-admin request', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/ee/sso/providers',
                payload: {
                    name: 'newProvider',
                    domainFilter: 'normaLiSE.com'
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })
    })

    describe('Delete Provider', async function () {
        it('deletes a new provider', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/ee/sso/providers/${app.samlProviders.provider2.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            // Starts at 5
            ;(await countProviders()).should.equal(4)
        })
        it('rejects non-admin request', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/ee/sso/providers/${app.samlProviders.provider2.hashid}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })
    })

    describe('Update Provider', async function () {
        it('updates properties of a provider', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/ee/sso/providers/${app.samlProviders.provider2.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'updatedName',
                    domainFilter: 'UpdatedDomain.com',
                    options: {
                        foo: 'bar'
                    },
                    active: true
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'updatedName')
            // check the domain was normalised
            result.should.have.property('domainFilter', '@updateddomain.com')
            result.options.should.only.have.keys('foo')
            result.options.foo.should.equal('bar')
            result.active.should.be.true()
        })
        it('updates properties of a provider - ldap', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/ee/sso/providers/${app.samlProviders.providerLDAP1.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    options: {
                        server: 'example2.com',
                        username: 'bindDN2',
                        password: '__PLACEHOLDER__'
                    },
                    type: 'saml',
                    active: true
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id', app.samlProviders.providerLDAP1.hashid)
            // Type cannot be changed
            result.should.have.property('type', 'ldap')
            result.options.should.only.have.keys('server', 'username', 'password')
            result.options.server.should.equal('example2.com')
            result.options.username.should.equal('bindDN2')
            result.options.password.should.equal('__PLACEHOLDER__')
            result.active.should.be.true()

            // Verify the actual password wasn't overwritten
            await app.samlProviders.providerLDAP1.reload()
            app.samlProviders.providerLDAP1.options.should.have.property('password', 'pw')

            // Resend with new password
            const response2 = await app.inject({
                method: 'PUT',
                url: `/ee/sso/providers/${app.samlProviders.providerLDAP1.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    options: {
                        server: 'example2.com',
                        username: 'bindDN2',
                        password: 'newpw'
                    }
                }
            })
            response2.statusCode.should.equal(200)
            const result2 = response2.json()
            result2.options.password.should.equal('__PLACEHOLDER__')
            result2.active.should.be.true()

            // Verify the actual password wasn't overwritten
            await app.samlProviders.providerLDAP1.reload()
            app.samlProviders.providerLDAP1.options.should.have.property('password', 'newpw')
        })
    })

    describe('User registration', async function () {
        beforeEach(function () {
            app.settings.set('user:signup', true)
            app.settings.set('team:user:invite:external', true)
        })
        it('sso user can register but no verification email sent', async function () {
            inbox.count().should.equal(0)
            const response = await app.inject({
                method: 'POST',
                url: '/account/register',
                payload: {
                    username: 'u1',
                    password: 'p123123123121',
                    name: 'u1',
                    email: 'u1@example.com'
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            // Recorded they are an sso user
            result.should.have.property('sso_enabled', true)
            // Not verified until they login the first time
            result.should.have.property('email_verified', false)
            inbox.count().should.equal(0)
        })

        it('sso user auto-accepts invites on registration', async function () {
            inbox.count().should.equal(0)
            const inviteResponse = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${app.team.hashid}/invitations`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    user: 'u2@example.com',
                    role: Roles.Viewer
                }
            })
            const inviteResult = inviteResponse.json()
            inviteResult.should.have.property('status', 'okay')
            inbox.count().should.equal(1)

            const invites = await app.db.models.Invitation.findAll()
            invites.should.have.lengthOf(1)
            invites[0].should.have.property('role', Roles.Viewer)

            const response = await app.inject({
                method: 'POST',
                url: '/account/register',
                payload: {
                    username: 'u2',
                    password: 'p123123123121',
                    name: 'u2',
                    email: 'u2@example.com'
                }
            })
            response.statusCode.should.equal(200)
            const invites2 = await app.db.models.Invitation.findAll()
            invites2.should.have.lengthOf(0)

            const user = await app.db.models.User.byUsername('u2')
            const teams = await app.db.models.Team.forUser(user)
            teams.should.have.length(1)
        })

        it('rejects user registration if email contains +', async function () {
            inbox.count().should.equal(0)
            const response = await app.inject({
                method: 'POST',
                url: '/account/register',
                payload: {
                    username: 'u1',
                    password: 'p1',
                    name: 'u1',
                    email: 'u1+not-allowed@example.com'
                }
            })
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_sso_email')
        })
    })
})
