const should = require('should')

const expireTokensTask = require('../../../../../forge/housekeeper/tasks/expireTokens')

const setup = require('../setup')

describe('Expire Tokens Task', function () {
    /** @type {import('../setup').TestApplication} */
    let app

    before(async function () {
        app = await setup()
    })

    after(async function () {
        await app.close()
    })

    afterEach(async function () {
        await app.db.models.AccessToken.destroy({ where: {} })
    })

    async function createToken ({ expiresAt, refreshToken, refreshTokenExpiresAt }) {
        return app.db.models.AccessToken.create({
            name: 'test token',
            token: 'ffpat_' + Math.random().toString(36).slice(2),
            refreshToken,
            scope: '',
            expiresAt,
            refreshTokenExpiresAt,
            ownerId: '' + app.user.id,
            ownerType: 'user'
        })
    }

    it('keeps a token whose access token expired but whose refresh token is still valid', async function () {
        const token = await createToken({
            expiresAt: Date.now() - 1000 * 60 * 60, // expired an hour ago
            refreshToken: 'ffpat_refresh-valid',
            refreshTokenExpiresAt: Date.now() + 1000 * 60 * 60 * 24 // valid for another day
        })

        await expireTokensTask.run(app)

        const found = await app.db.models.AccessToken.findOne({ where: { id: token.id } })
        should.exist(found, 'token with a valid refresh token should survive the sweep')
    })

    it('removes a token whose access and refresh tokens have both expired', async function () {
        const token = await createToken({
            expiresAt: Date.now() - 1000 * 60 * 60,
            refreshToken: 'ffpat_refresh-expired',
            refreshTokenExpiresAt: Date.now() - 1000 * 60
        })

        await expireTokensTask.run(app)

        const found = await app.db.models.AccessToken.findOne({ where: { id: token.id } })
        should.not.exist(found)
    })

    it('removes an expired token that has no refresh token', async function () {
        const token = await createToken({
            expiresAt: Date.now() - 1000 * 60 * 60
        })

        await expireTokensTask.run(app)

        const found = await app.db.models.AccessToken.findOne({ where: { id: token.id } })
        should.not.exist(found)
    })

    it('keeps a token whose access token has not expired', async function () {
        const token = await createToken({
            expiresAt: Date.now() + 1000 * 60 * 60
        })

        await expireTokensTask.run(app)

        const found = await app.db.models.AccessToken.findOne({ where: { id: token.id } })
        should.exist(found)
    })
})
