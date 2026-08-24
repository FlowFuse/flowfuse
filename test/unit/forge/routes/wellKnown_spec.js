const should = require('should') // eslint-disable-line no-unused-vars

const setup = require('./setup')

describe('.well-known OAuth discovery', function () {
    let app
    const baseUrl = 'http://localhost:3000'

    before(async function () {
        app = await setup({ base_url: baseUrl })
    })

    after(async function () {
        await app.close()
    })

    describe('GET /.well-known/oauth-authorization-server (RFC 8414)', function () {
        let body

        before(async function () {
            const response = await app.inject({ method: 'GET', url: '/.well-known/oauth-authorization-server' })
            response.statusCode.should.equal(200)
            body = response.json()
        })

        it('advertises the issuer and endpoints derived from base_url', function () {
            body.should.have.property('issuer', baseUrl)
            body.should.have.property('authorization_endpoint', `${baseUrl}/account/authorize`)
            body.should.have.property('token_endpoint', `${baseUrl}/account/token`)
            body.should.have.property('registration_endpoint', `${baseUrl}/account/client`)
        })

        it('advertises the authorization code and refresh token grants', function () {
            body.response_types_supported.should.containEql('code')
            body.grant_types_supported.should.containDeep(['authorization_code', 'refresh_token'])
        })

        it('advertises PKCE S256 and public clients (no secret)', function () {
            body.code_challenge_methods_supported.should.eql(['S256'])
            body.token_endpoint_auth_methods_supported.should.eql(['none'])
        })
    })

    describe('GET /.well-known/oauth-protected-resource (RFC 9728)', function () {
        let body

        before(async function () {
            const response = await app.inject({ method: 'GET', url: '/.well-known/oauth-protected-resource' })
            response.statusCode.should.equal(200)
            body = response.json()
        })

        it('advertises the MCP resource and its authorization server', function () {
            body.should.have.property('resource', `${baseUrl}/mcp`)
            body.authorization_servers.should.eql([baseUrl])
        })
    })

    it('serves both documents anonymously, without a session', async function () {
        const authServer = await app.inject({ method: 'GET', url: '/.well-known/oauth-authorization-server' })
        const resource = await app.inject({ method: 'GET', url: '/.well-known/oauth-protected-resource' })
        authServer.statusCode.should.equal(200)
        resource.statusCode.should.equal(200)
    })
})
