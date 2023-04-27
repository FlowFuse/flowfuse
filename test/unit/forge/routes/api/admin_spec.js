const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Admin API', async function () {
    let app
    const TestObjects = {}

    async function setupApp (license) {
        const setupConfig = { features: { devices: true } }
        if (license) {
            setupConfig.license = license
        }
        app = await setup(setupConfig)

        // Non-admin user
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', password: 'ccPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        TestObjects.Project1 = app.project
        TestObjects.tokens = {}
    }

    before(async function () {
        return setupApp()
    })
    after(async function () {
        await app.close()
    })

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

    describe('stats', async function () {
        it('anonymous cannot access stats', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/admin/stats'
            })
            response.statusCode.should.equal(401)
        })
        it('non-admin cannot access stats', async function () {
            await login('chris', 'ccPassword')
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/admin/stats',
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(401)
        })
        it('admin can access stats - json format', async function () {
            await login('alice', 'aaPassword')
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/admin/stats',
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            // Not going to exhaustively check the stats.. just verify there's
            // at least one thing we expect to be there
            result.should.have.property('teamCount', 2)
        })

        it('admin can access stats - opemmetrics format', async function () {
            await login('alice', 'aaPassword')
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/admin/stats',
                headers: {
                    accept: 'application/openmetrics-text'
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.body
            // Not going to exhaustively check the stats.. just verify there's
            // at least one thing we expect to be there
            result.should.match(/flowforge_team_count 2\n/)

            // Check we have a newline at the end
            result.should.match(/\n$/)
        })

        describe('access token management', () => {
            async function getStatsAccessTokens () {
                return app.db.models.AccessToken.findAll({ where: { scope: 'platform:stats' } })
            }
            async function checkStatsAccess (token) {
                return await app.inject({
                    method: 'GET',
                    url: '/api/v1/admin/stats',
                    headers: {
                        authorization: `Bearer ${token}`
                    }
                })
            }
            it('generates a new stats token, replacing any existing one', async function () {
                await login('alice', 'aaPassword')
                // Validate the starting point
                ;(await getStatsAccessTokens()).should.have.length(0)
                app.settings.get('platform:stats:token').should.be.false()

                // 1. Create an initial token
                let response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/admin/stats-token',
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const initialToken = response.json()
                initialToken.should.have.property('token')
                app.settings.get('platform:stats:token').should.be.true()

                // Check the token works
                ;(await checkStatsAccess(initialToken.token)).statusCode.should.equal(200)

                const generatedTokens = await getStatsAccessTokens()
                generatedTokens.should.have.length(1)

                // Create a new token - check it replaces the initial token
                response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/admin/stats-token',
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const newToken = response.json()
                newToken.should.have.property('token')
                app.settings.get('platform:stats:token').should.be.true()
                initialToken.token.should.not.equal(newToken.token)

                // Check initial token no longer works
                ;(await checkStatsAccess(initialToken.token)).statusCode.should.equal(401)

                // Check new token works
                ;(await checkStatsAccess(newToken.token)).statusCode.should.equal(200)

                const newGeneratedTokens = await getStatsAccessTokens()
                newGeneratedTokens.should.have.length(1)

                generatedTokens[0].token.should.not.equal(newGeneratedTokens[0].token)

                // Delete the token
                response = await app.inject({
                    method: 'DELETE',
                    url: '/api/v1/admin/stats-token',
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                // Check its all cleared
                ;(await getStatsAccessTokens()).should.have.length(0)
                app.settings.get('platform:stats:token').should.be.false()

                // Check new token no longer works
                ;(await checkStatsAccess(newToken.token)).statusCode.should.equal(401)
            })
        })
    })
})
