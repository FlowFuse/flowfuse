const should = require('should') // eslint-disable-line

const setup = require('../../setup')

describe('Git Tokens API', function () {
    let app
    let cookie
    let token
    let tokenUrl

    before(async function () {
        setup.setupStripe()
        app = await setup()
        const teamTypeProperties = app.defaultTeamType.properties
        teamTypeProperties.features.gitIntegration = true
        app.defaultTeamType.properties = teamTypeProperties
        await app.defaultTeamType.save()

        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username: 'alice', password: 'aaPassword', remember: false }
        })
        cookie = response.cookies[0].value

        token = await app.db.models.GitToken.create({
            name: 'original',
            token: 'secret-token',
            type: 'github',
            TeamId: app.team.id
        })
        tokenUrl = `/api/v1/teams/${app.team.hashid}/git/tokens/${token.hashid}`
    })

    after(async function () {
        await app.close()
        setup.resetStripe()
    })

    function put (url, payload) {
        return app.inject({ method: 'PUT', url, payload, cookies: { sid: cookie } })
    }

    describe('PUT /tokens/:tokenId', function () {
        it('renames the token', async function () {
            const response = await put(tokenUrl, { name: 'renamed' })
            response.statusCode.should.equal(200)
            response.json().should.have.property('name', 'renamed')
            await token.reload()
            token.name.should.equal('renamed')
        })

        it('returns 404 for an undecodable token id', async function () {
            const response = await put(`/api/v1/teams/${app.team.hashid}/git/tokens/not-a-hashid!!`, { name: 'a' })
            response.statusCode.should.equal(404)
            response.json().should.have.property('code', 'not_found')
        })

        it('returns 400 when the request body is missing', async function () {
            const response = await put(tokenUrl)
            response.statusCode.should.equal(400)
            response.json().should.have.property('code', 'FST_ERR_VALIDATION')
        })

        it('returns 400 for an empty name', async function () {
            const response = await put(tokenUrl, { name: '' })
            response.statusCode.should.equal(400)
            response.json().should.have.property('code', 'FST_ERR_VALIDATION')
        })

        it('returns 400 when name is missing', async function () {
            const response = await put(tokenUrl, {})
            response.statusCode.should.equal(400)
            response.json().should.have.property('code', 'FST_ERR_VALIDATION')
        })

        it('returns 400 when name is an object', async function () {
            const response = await put(tokenUrl, { name: { a: 1 } })
            response.statusCode.should.equal(400)
            response.json().should.have.property('code', 'FST_ERR_VALIDATION')
        })

        it('stores a numeric name as a string', async function () {
            const response = await put(tokenUrl, { name: 5 })
            response.statusCode.should.equal(200)
            response.json().should.have.property('name', '5')
            await token.reload()
            token.name.should.equal('5')
        })
    })

    describe('DELETE /tokens/:tokenId', function () {
        it('returns 404 for an undecodable token id', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${app.team.hashid}/git/tokens/not-a-hashid!!`,
                cookies: { sid: cookie }
            })
            response.statusCode.should.equal(404)
            response.json().should.have.property('code', 'not_found')
        })
    })
})
