const { Op } = require('sequelize')
const should = require('should') // eslint-disable-line
const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

const MAX_BROKER_USERS_PER_TEAM = 5

describe('3rd Party Broker API', function () {
    let app
    const TestObjects = { tokens: {} }
    const defaultBrokerCredentials = {
        name: 'broker-name',
        host: 'localhost',
        port: 1883,
        protocol: 'mqtt:',
        protocolVersion: 4,
        ssl: false,
        verifySSL: false,
        clientId: 'broker-client',
        credentials: {
            username: 'foo', password: 'bar'
        }
    }

    before(async function () {
        // Dev-only Enterprise license that allows 6 MQTT Clients
        const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'
        app = await setup({ license })
        await login('alice', 'aaPassword')

        const userBob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        app.userBob = userBob
        await app.team.addUser(userBob, { through: { role: Roles.Owner } })
        // Run all the tests with bob - non-admin Team Owner
        await login('bob', 'bbPassword')

        const userChris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        await app.team.addUser(userChris, { through: { role: Roles.Member } })
        await login('chris', 'ccPassword')

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
            defaultTeamTypeProperties.teamBroker.clients.limit = MAX_BROKER_USERS_PER_TEAM
        } else {
            defaultTeamTypeProperties.teamBroker = {
                clients: {
                    limit: MAX_BROKER_USERS_PER_TEAM
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

    async function create3rdPartyBroker (options = defaultBrokerCredentials, sid = TestObjects.tokens.bob) {
        const opts = { ...defaultBrokerCredentials, ...options }
        opts.credentials = { ...defaultBrokerCredentials.credentials, ...options?.credentials }
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/teams/${app.team.hashid}/brokers`,
            cookies: { sid },
            body: opts
        })
        const statusCode = response.statusCode
        if (statusCode > 299) {
            return { response, statusCode, broker: null, credentialId: null, agentToken: null }
        }
        const broker = response.json()
        const credentialId = broker.id
        const creds = await app.db.models.BrokerCredentials.byId(credentialId)
        const authTokensRes = await creds.refreshAuthTokens()
        const agentToken = authTokensRes.token

        return { response, statusCode, broker, credentialId, agentToken }
    }

    describe('3rd Party Broker Credentials', function () {
        afterEach(async function () {
            await app.db.models.BrokerCredentials.destroy({
                where: {
                    name: { [Op.ne]: 'ff-team-broker' }
                }
            })
        })

        it('Create Credentials as Owner', async function () {
            const { statusCode, broker } = await create3rdPartyBroker()
            statusCode.should.equal(201)
            // by hard coding the check values below, we can ensure defaults are set
            //  and returned correctly (ensuring the integrity of the following tests)
            broker.should.have.property('name', 'broker-name')
            broker.should.have.property('host', 'localhost')
            broker.should.have.property('port', 1883)
            broker.should.have.property('protocol', 'mqtt:')
            broker.should.have.property('protocolVersion', 4)
            broker.should.have.property('ssl', false)
            broker.should.have.property('verifySSL', false)
            broker.should.have.property('clientId', 'broker-client')
        })
        it('List Credentials as Owner', async function () {
            // create 2 brokers and ensure they are both listed
            const b1 = await create3rdPartyBroker({ name: 'broker1' })
            const b2 = await create3rdPartyBroker({ name: 'broker2' })
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/brokers`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.brokers.should.have.a.lengthOf(2)
            const b1found = result.brokers.find(b => b.id === b1.credentialId)
            should.exist(b1found)
            b1found.should.have.property('name', 'broker1')
            const b2found = result.brokers.find(b => b.id === b2.credentialId)
            should.exist(b2found)
            b2found.should.have.property('name', 'broker2')
        })
        it('Get Credentials as Agent', async function () {
            const b1 = await create3rdPartyBroker({ name: 'my-broker', host: 'broker-host' })
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${b1.credentialId}/credentials`,
                headers: {
                    Authorization: `Bearer ${b1.agentToken}`
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('name', 'my-broker')
            result.should.have.property('host', 'broker-host')
            result.should.have.property('credentials')
            result.credentials.should.have.property('username')
            result.credentials.should.have.property('password')
        })
        it('Edit Credentials as Owner', async function () {
            const b1 = await create3rdPartyBroker()
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${b1.credentialId}`,
                cookies: { sid: TestObjects.tokens.bob },
                body: {
                    name: 'broker-rename',
                    host: '127.0.0.1',
                    port: 8883,
                    protocol: 'wss:',
                    protocolVersion: 5,
                    ssl: true,
                    verifySSL: true,
                    clientId: 'broker-client-rename'
                }
            })

            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('name', 'broker-rename')
            result.should.have.property('host', '127.0.0.1')
            result.should.have.property('port', 8883)
            result.should.have.property('protocol', 'wss:')
            result.should.have.property('protocolVersion', 5)
            result.should.have.property('ssl', true)
            result.should.have.property('verifySSL', true)
            result.should.have.property('clientId', 'broker-client-rename')
        })

        it('Fail to Create Credentials as Member', async function () {
            const { statusCode } = await create3rdPartyBroker(defaultBrokerCredentials, TestObjects.tokens.chris)
            statusCode.should.equal(403)
        })
        it('Fail to List Credentials as Member', async function () {
            await create3rdPartyBroker(defaultBrokerCredentials, TestObjects.tokens.bob)
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/brokers`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
        })
        it('Fail to Edit Crententials as Member', async function () {
            const b1 = await create3rdPartyBroker(defaultBrokerCredentials, TestObjects.tokens.bob)
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${b1.credentialId}`,
                cookies: { sid: TestObjects.tokens.chris },
                body: {
                    host: '127.0.0.1',
                    port: 8883,
                    ssl: true
                }
            })
            response.statusCode.should.equal(403)
        })
        it('Fail to Delete Specific Credentials as Member', async function () {
            const b1 = await create3rdPartyBroker(defaultBrokerCredentials, TestObjects.tokens.bob)
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${b1.credentialId}`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
        })
        it('Delete Specific Credentials as Owner', async function () {
            const b1 = await create3rdPartyBroker(defaultBrokerCredentials, TestObjects.tokens.bob)
            let response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${b1.credentialId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/brokers`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.brokers.should.have.a.lengthOf(0)
        })
    })

    describe('Topic Storage API', function () {
        let brokerCredentialId = ''
        let agentToken = ''
        before(async function () {
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${app.team.hashid}/brokers`,
                cookies: { sid: TestObjects.tokens.bob },
                body: {
                    name: 'ff-team-broker',
                    host: 'localhost',
                    port: 1883,
                    protocol: 'mqtt:',
                    protocolVersion: 4,
                    ssl: false,
                    verifySSL: false,
                    clientId: 'broker1-client',
                    credentials: {
                        username: 'foo', password: 'bar'
                    }
                }
            })
            response.statusCode.should.equal(201)
            const result = response.json()
            brokerCredentialId = result.id
            const creds = await app.db.models.BrokerCredentials.byId(brokerCredentialId)
            const res = await creds.refreshAuthTokens()
            agentToken = res.token
        })
        it('Store Topic for a broker as a agent', async function () {
            let response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${brokerCredentialId}/topics`,
                headers: {
                    Authorization: `Bearer ${agentToken}`
                },
                body: [
                    {
                        topic: 'foo/bar/baz/qux',
                        time: 1738236145678,
                        type: { type: 'string' }
                    }
                ]
            })
            response.statusCode.should.equal(201)

            response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${brokerCredentialId}/topics`,
                headers: {
                    Authorization: `Bearer ${agentToken}`
                },
                body: [
                    {
                        topic: 'foo/bar/baz',
                        time: 1738236145678
                    }
                ]
            })
            response.statusCode.should.equal(201)

            response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${brokerCredentialId}/topics`,
                headers: {
                    Authorization: `Bearer ${agentToken}`
                },
                body: [
                    {
                        topic: 'bar/baz/qux',
                        time: 1738236145678,
                        type: { type: 'number' }
                    }
                ]
            })
            response.statusCode.should.equal(201)

            response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${brokerCredentialId}/topics`,
                headers: {
                    Authorization: `Bearer ${agentToken}`
                },
                body: [
                    {
                        topic: 'bar/baz/qux',
                        time: 1738236145978,
                        type: { type: 'number' }
                    }
                ]
            })
            response.statusCode.should.equal(201)
        })
        it('Store Topic for a broker as a team owner', async function () {
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${brokerCredentialId}/topics`,
                cookies: { sid: TestObjects.tokens.bob },
                body: [
                    {
                        topic: 'bar/baz/qux',
                        metadata: { description: 'a topic' }
                    }
                ]
            })
            response.statusCode.should.equal(201)
        })
        it('Verify topics all correct', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${brokerCredentialId}/topics`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.topics.should.have.a.lengthOf(3)
            const topics = result.topics
            topics.sort((A, B) => A.topic.localeCompare(B.topic))

            topics[0].should.have.property('topic', 'bar/baz/qux')
            topics[0].should.have.property('metadata', { description: 'a topic' })

            topics[1].should.have.property('topic', 'foo/bar/baz')
            topics[1].should.have.property('metadata', {})

            topics[2].should.have.property('topic', 'foo/bar/baz/qux')
            topics[2].should.have.property('metadata', {})
        })
        it('Get Topics for 3rd Pary broker as a Team Owner', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${brokerCredentialId}/topics`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.topics.should.have.a.lengthOf(3)
        })
        it('Add Metadata to a Topic', async function () {
            let response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${brokerCredentialId}/topics`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            let result = response.json()
            result.topics.should.have.a.lengthOf(3)
            result.topics[0].should.have.property('id')
            result.topics[0].should.have.property('topic')
            const topicId = result.topics[0].id

            response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${brokerCredentialId}/topics/${topicId}`,
                cookies: { sid: TestObjects.tokens.bob },
                body: {
                    metadata: {
                        comment: 'HelloWorld',
                        lastSeen: 100
                    }
                }
            })
            response.statusCode.should.equal(201)
            result = response.json()
            result.should.have.property('metadata')
            result.metadata.should.have.property('comment', 'HelloWorld')
            result.metadata.should.have.property('lastSeen', 100)
        })
        it('Delete Topic', async function () {
            let response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${brokerCredentialId}/topics`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            let result = response.json()
            result.topics.should.have.a.lengthOf(3)
            result.topics[0].should.have.property('id')
            result.topics[0].should.have.property('topic')
            const topicId = result.topics[0].id

            response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${brokerCredentialId}/topics/${topicId}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(201)

            response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/brokers/${brokerCredentialId}/topics`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            result = response.json()
            result.count.should.equal(2)
        })
        describe('Team Broker', function () {
            before(async function () {
                app.team2 = await app.factory.createTeam({ name: 'BTeam' })
                await app.team2.addUser(app.userBob, { through: { role: Roles.Owner } })
            })
            it('Store Topic for a team-broker as a team owner', async function () {
                // Add to ATeam
                let response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team.hashid}/brokers/team-broker/topics`,
                    cookies: { sid: TestObjects.tokens.bob },
                    body: [
                        {
                            topic: 'bar/baz/qux',
                            metadata: { description: 'a topic' }
                        }
                    ]
                })
                response.statusCode.should.equal(201)

                // Add to BTeam
                response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team2.hashid}/brokers/team-broker/topics`,
                    cookies: { sid: TestObjects.tokens.bob },
                    body: [
                        {
                            topic: 'bar/baz/qux',
                            metadata: { description: 'another topic' }
                        }
                    ]
                })
                response.statusCode.should.equal(201)
            })
            it('Get Topics for team-broker as a Team Owner', async function () {
                // Check no cross-pollution between ATeam and BTeam
                let response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${app.team.hashid}/brokers/team-broker/topics`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(200)
                let result = response.json()
                result.topics.should.have.a.lengthOf(1)
                result.topics[0].should.have.property('topic', 'bar/baz/qux')
                result.topics[0].should.have.property('metadata', { description: 'a topic' })

                response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${app.team2.hashid}/brokers/team-broker/topics`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(200)
                result = response.json()
                result.topics.should.have.a.lengthOf(1)
                result.topics[0].should.have.property('topic', 'bar/baz/qux')
                result.topics[0].should.have.property('metadata', { description: 'another topic' })
            })

            it('Delete Topic', async function () {
                let response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${app.team.hashid}/brokers/team-broker/topics`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(200)
                let result = response.json()
                result.topics.should.have.a.lengthOf(1)
                const topicId = result.topics[0].id

                // Verify delete against wrong team fails
                response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/teams/${app.team2.hashid}/brokers/team-broker/topics/${topicId}`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(404)

                // Verify we can delete against the right team
                response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/teams/${app.team.hashid}/brokers/team-broker/topics/${topicId}`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(201)

                response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${app.team.hashid}/brokers/team-broker/topics`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(200)
                result = response.json()
                result.count.should.equal(0)
            })
        })
    })
})
