const should = require('should') // eslint-disable-line

const setup = require('../../setup')

const MAX_BROKER_USERS = 5

describe('Team Broker API', function () {
    let app
    const TestObjects = { tokens: {} }

    before(async function () {
        app = await setup()
        await login('alice', 'aaPassword')

        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
        const defaultTeamTypeProperties = defaultTeamType.properties

        if (defaultTeamTypeProperties.features) {
            defaultTeamTypeProperties.features.teamBroker = true
        } else {
            defaultTeamTypeProperties.features = {
                teamBroker: true
            }
        }
        if (defaultTeamTypeProperties.teamBroker) {
            defaultTeamTypeProperties.teamBroker.clients.limit = MAX_BROKER_USERS
        } else {
            defaultTeamTypeProperties.teamBroker = {
                clients: {
                    limit: MAX_BROKER_USERS
                }
            }
        }
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()
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

    describe('Work with MQTT Broker Users', function () {
        it('Create MQTT Broker User', async function () {
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${app.team.hashid}/broker/user`,
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: 'alice',
                    password: 'aaPassword',
                    acls: [
                        {
                            pattern: 'foo/#',
                            action: 'both'
                        }
                    ]
                }
            })
            response.statusCode.should.equal(201)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('username', 'alice')
            result.should.have.property('acls')
            result.acls.should.have.a.lengthOf(1)
            result.acls[0].should.have.property('action', 'both')
        })

        it('Get all MQTT broker users for a team', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/broker/users`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.clients.should.have.a.lengthOf(1)
            result.clients[0].should.have.property('username', 'alice')
        })

        it('Get specific MQTT broker user for a team', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/broker/user/alice`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('username', 'alice')
        })

        it('Get specific MQTT broker user for a team who doesn\'t exist', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/broker/user/bob`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(404)
        })

        it('Limit number of MQTT broker users allowed', async function () {
            let response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/broker/users`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            let result = response.json()
            result.clients.should.have.a.lengthOf(1)
            const start = result.clients.length
            for (let i = start; i < MAX_BROKER_USERS; i++) {
                const create = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team.hashid}/broker/user`,
                    cookies: { sid: TestObjects.tokens.alice },
                    body: {
                        username: `alice-${i}`,
                        password: 'aaPassword',
                        acls: [
                            {
                                pattern: 'foo/#',
                                action: 'both'
                            }
                        ]
                    }
                })
                create.statusCode.should.equal(201)
            }
            response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/broker/users`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            result = response.json()
            result.clients.should.have.a.lengthOf(MAX_BROKER_USERS)

            response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${app.team.hashid}/broker/user`,
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: 'alice-5',
                    password: 'aaPassword',
                    acls: [
                        {
                            pattern: 'foo/#',
                            action: 'both'
                        }
                    ]
                }
            })
            response.statusCode.should.equal(400)
            result = response.json()
            result.should.have.property('code', 'broker_client_limit_reached')
        })

        it('Delete MQTT Broker User', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${app.team.hashid}/broker/user/alice`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('status', 'okay')
        })

        it('Delete MQTT Broker User who doesn\'t exist', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${app.team.hashid}/broker/user/bob`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(404)
        })
    })
})
