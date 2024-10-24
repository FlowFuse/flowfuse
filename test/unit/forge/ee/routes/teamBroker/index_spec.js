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
                url: `/api/v1/teams/${app.team.hashid}/broker/client`,
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
                url: `/api/v1/teams/${app.team.hashid}/broker/clients`,
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
                url: `/api/v1/teams/${app.team.hashid}/broker/client/alice`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('username', 'alice')
        })

        it('Modify an existing MQTT broker user for a team', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${app.team.hashid}/broker/client/alice`,
                body: {
                    acls: [
                        { pattern: 'foo/#', action: 'both' },
                        { pattern: 'bar/test', action: 'publish' }
                    ]
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(201)
            const result = response.json()
            result.should.have.property('username', 'alice')
            result.should.have.property('acls')
            result.acls.should.have.lengthOf(2)
            result.acls[1].should.have.property('pattern', 'bar/test')
        })

        it('Get specific MQTT broker user for a team who doesn\'t exist', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/broker/client/bob`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(404)
        })

        it('Limit number of MQTT broker users allowed', async function () {
            let response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/broker/clients`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            let result = response.json()
            result.clients.should.have.a.lengthOf(1)
            const start = result.clients.length
            for (let i = start; i < MAX_BROKER_USERS; i++) {
                const create = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client`,
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
                url: `/api/v1/teams/${app.team.hashid}/broker/clients`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            result = response.json()
            result.clients.should.have.a.lengthOf(MAX_BROKER_USERS)

            response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${app.team.hashid}/broker/client`,
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

        it('Fail to Create existing MQTT Broker User', async function () {
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${app.team.hashid}/broker/client`,
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
            response.statusCode.should.equal(409)
            const result = response.json()
            result.should.have.property('error')
            result.should.have.property('code', 'client_already_exists')
        })

        it('Delete MQTT Broker User', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${app.team.hashid}/broker/client/alice`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('status', 'okay')
        })

        it('Delete MQTT Broker User who doesn\'t exist', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${app.team.hashid}/broker/client/bob`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(404)
        })
    })
    describe('Test EMQX MQTT Broker user auth', function () {
        before(async function () {
            await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${app.team.hashid}/broker/client`,
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
        })
        after(async function () {
            await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${app.team.hashid}/broker/client/alice`,
                cookies: { sid: TestObjects.tokens.alice }
            })
        })
        it('Test Authentication pass', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/v2/auth',
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: `alice@${app.team.hashid}`,
                    password: 'aaPassword',
                    clientId: `alice@${app.team.hashid}`
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('result', 'allow')
            result.should.have.property('is_superuser', false)
            result.should.have.property('client_attrs')
            result.client_attrs.should.have.property('team')
        })
        it('Test Authentication fail', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/v2/auth',
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: `alice@${app.team.hashid}`,
                    password: 'bbPassword',
                    clientId: `alice@${app.team.hashid}`
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('result', 'deny')
        })
        it('Test Authentication pass after password change', async function () {
            let response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${app.team.hashid}/broker/client/alice`,
                body: {
                    password: 'ccPassword'
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(201)
            response = await app.inject({
                method: 'POST',
                url: '/api/comms/v2/auth',
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: `alice@${app.team.hashid}`,
                    password: 'ccPassword',
                    clientId: `alice@${app.team.hashid}`
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('result', 'allow')
            result.should.have.property('is_superuser', false)
            result.should.have.property('client_attrs')
            result.client_attrs.should.have.property('team')
        })
        it('Test Authentication fail none existent user', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/v2/auth',
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: `alice@${app.team.hashid}-foo`,
                    password: 'bbPassword',
                    clientId: `alice@${app.team.hashid}`
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('result', 'deny')
        })
        it('Test Authentication fail no password', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/v2/auth',
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: `alice@${app.team.hashid}`,
                    password: '',
                    clientId: `alice@${app.team.hashid}`
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('result', 'deny')
        })
        it('Test subscribe allowed', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/v2/acls',
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: `alice@${app.team.hashid}`,
                    topic: 'foo/bar',
                    action: 'subscribe'
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('result', 'allow')
        })
        it('Test subscribe not allowed', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/v2/acls',
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: `alice@${app.team.hashid}`,
                    topic: 'bar/foo',
                    action: 'subscribe'
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('result', 'deny')
        })
        it('Test publish allowed', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/v2/acls',
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: `alice@${app.team.hashid}`,
                    topic: 'foo/foo',
                    action: 'publish'
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('result', 'allow')
        })
        it('Test publish not allowed', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/v2/acls',
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: `alice@${app.team.hashid}`,
                    topic: 'bar/foo',
                    action: 'publish'
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('result', 'deny')
        })
        /*
         * Need tests for the project nodes and devices both
         * Auth and ACL
         */
        it('Test Authentication forge_platform pass', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/v2/auth',
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: 'forge_platform',
                    password: await app.settings.get('commsToken'),
                    clientId: 'alice'
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('result', 'allow')
            result.should.have.property('is_superuser', false)
            result.should.have.property('client_attrs')
            result.client_attrs.should.have.property('team', '')
        })
        it('Test Authentication forge_platform fail', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/v2/auth',
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: 'forge_platform',
                    password: 'fooo',
                    clientId: 'forge_platform'
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('result', 'deny')
        })
        it('Test Authorization forge_platform subscribe', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/v2/acls',
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: 'forge_platform',
                    topic: 'ff/v1/+/l/+/status',
                    action: 'subscribe'
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('result', 'allow')
        })
        it('Test Authorization forge_platform publish deny', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/v2/acls',
                cookies: { sid: TestObjects.tokens.alice },
                body: {
                    username: 'forge_platform',
                    topic: 'ff/v1/+/l/+/status',
                    action: 'publish'
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('result', 'deny')
        })
    })
})
