require('should')

const setup = require('../../setup')

describe('MCP .well-known', function () {
    let app

    before(async function () {
        app = await setup({ mcp: { domainVerificationToken: 'ff-verify-token' } })
    })

    after(async function () {
        await app.close()
    })

    it('serves the configured domain-verification token as plain text', async function () {
        const response = await app.inject({ method: 'GET', url: '/.well-known/openai-apps-challenge' })
        response.statusCode.should.equal(200)
        response.headers['content-type'].should.startWith('text/plain')
        response.body.should.equal('ff-verify-token')
    })

    it('returns 404 for unknown paths instead of the app shell', async function () {
        const response = await app.inject({ method: 'GET', url: '/.well-known/not-a-real-path' })
        response.statusCode.should.equal(404)
    })
})
