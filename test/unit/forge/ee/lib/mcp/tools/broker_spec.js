const should = require('should') // eslint-disable-line no-unused-vars

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/broker')
const findTool = toolFinder(tools)

describe('MCP Platform Tools - Broker', function () {
    describe('Tool definitions', function () {
        it('should only expose read-only, non-destructive broker tools', function () {
            tools.should.have.length(6)
            tools.forEach(tool => {
                tool.annotations.should.have.property('readOnlyHint', true)
                tool.annotations.should.have.property('destructiveHint', false)
            })
        })

        it('should not expose any tool whose URL targets a credential endpoint', async function () {
            for (const tool of tools) {
                const { calls, inject } = recordingInject()
                const args = { teamId: 'team1', username: 'user1', brokerId: 'broker1' }
                await tool.handler(args, { inject })
                calls.should.have.length(1)
                calls[0].url.should.not.match(/\/credentials/)
            }
        })
    })

    describe('platform_list_broker_clients', function () {
        it('should be found by name', function () {
            findTool('platform_list_broker_clients')
        })

        it('should have the expected inputSchema keys', function () {
            const tool = findTool('platform_list_broker_clients')
            Object.keys(tool.inputSchema).should.deepEqual(['teamId', 'cursor', 'limit', 'query'])
        })

        it('should call the broker clients list endpoint', async function () {
            const tool = findTool('platform_list_broker_clients')
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', '/api/v1/teams/team1/broker/clients')
        })

        it('should serialise pagination and search params', async function () {
            const tool = findTool('platform_list_broker_clients')
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', limit: 20, query: 'sensor' }, { inject })
            calls[0].should.have.property('url', '/api/v1/teams/team1/broker/clients?limit=20&query=sensor')
        })
    })

    describe('platform_get_broker_client', function () {
        it('should be found by name', function () {
            findTool('platform_get_broker_client')
        })

        it('should have the expected inputSchema keys', function () {
            const tool = findTool('platform_get_broker_client')
            Object.keys(tool.inputSchema).should.deepEqual(['teamId', 'username'])
        })

        it('should call the broker client endpoint for the given username', async function () {
            const tool = findTool('platform_get_broker_client')
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', username: 'client1' }, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', '/api/v1/teams/team1/broker/client/client1')
        })
    })

    describe('platform_list_brokers', function () {
        it('should be found by name', function () {
            findTool('platform_list_brokers')
        })

        it('should have the expected inputSchema keys', function () {
            const tool = findTool('platform_list_brokers')
            Object.keys(tool.inputSchema).should.deepEqual(['teamId', 'cursor', 'limit'])
        })

        it('should call the brokers list endpoint', async function () {
            const tool = findTool('platform_list_brokers')
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', '/api/v1/teams/team1/brokers')
        })

        it('should serialise pagination params', async function () {
            const tool = findTool('platform_list_brokers')
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', cursor: 'abc', limit: 5 }, { inject })
            calls[0].should.have.property('url', '/api/v1/teams/team1/brokers?cursor=abc&limit=5')
        })
    })

    describe('platform_get_broker', function () {
        it('should be found by name', function () {
            findTool('platform_get_broker')
        })

        it('should have the expected inputSchema keys', function () {
            const tool = findTool('platform_get_broker')
            Object.keys(tool.inputSchema).should.deepEqual(['teamId', 'brokerId'])
        })

        it('should call the broker detail endpoint for the given broker', async function () {
            const tool = findTool('platform_get_broker')
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', brokerId: 'team-broker' }, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', '/api/v1/teams/team1/brokers/team-broker')
        })
    })

    describe('platform_list_broker_topics', function () {
        it('should be found by name', function () {
            findTool('platform_list_broker_topics')
        })

        it('should have the expected inputSchema keys', function () {
            const tool = findTool('platform_list_broker_topics')
            Object.keys(tool.inputSchema).should.deepEqual(['teamId', 'brokerId'])
        })

        it('should call the broker topics endpoint for the given broker', async function () {
            const tool = findTool('platform_list_broker_topics')
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', brokerId: 'team-broker' }, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', '/api/v1/teams/team1/brokers/team-broker/topics')
        })
    })

    describe('platform_get_broker_schema', function () {
        it('should be found by name', function () {
            findTool('platform_get_broker_schema')
        })

        it('should have the expected inputSchema keys', function () {
            const tool = findTool('platform_get_broker_schema')
            Object.keys(tool.inputSchema).should.deepEqual(['teamId', 'brokerId'])
        })

        it('should call the broker schema endpoint for the given broker', async function () {
            const tool = findTool('platform_get_broker_schema')
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', brokerId: 'team-broker' }, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', '/api/v1/teams/team1/broker/team-broker/schema')
        })
    })

    describe('Integration smoke test', function () {
        const setup = require('../../../setup')

        let app
        let token
        let aliceCookie

        before(async function () {
            app = await setup({
                ai: { enabled: true },
                expert: { enabled: true },
                broker: {
                    url: 'mqtt://forge:1883',
                    teamBroker: {
                        enabled: true
                    }
                }
            })

            // Enable teamBroker feature so the gate opens for this team type
            const defaultTeamTypeProperties = app.defaultTeamType.properties
            defaultTeamTypeProperties.features = {
                ...defaultTeamTypeProperties.features,
                teamBroker: true
            }
            app.defaultTeamType.properties = defaultTeamTypeProperties
            await app.defaultTeamType.save()

            token = await createExpertMcpToken(app)

            const loginResponse = await app.inject({
                method: 'POST',
                url: '/account/login',
                payload: { username: 'alice', password: 'aaPassword', remember: false }
            })
            aliceCookie = loginResponse.cookies[0].value
        })

        after(async function () {
            await app.close()
        })

        function inject (options) {
            return app.inject({
                ...options,
                headers: {
                    ...(options.headers || {}),
                    authorization: `Bearer ${token}`
                }
            })
        }

        it('should list broker clients for the team once teamBroker is enabled', async function () {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${app.team.hashid}/broker/clients` })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('clients').which.is.an.Array()
            body.should.have.property('count', 0)
        })

        describe('against seeded broker data', function () {
            let brokerHashid

            before(async function () {
                const clientResponse = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client`,
                    cookies: { sid: aliceCookie },
                    body: {
                        username: 'mcp-test-client',
                        password: 'mcpTestPassword',
                        acls: [{ pattern: 'foo/#', action: 'both' }]
                    }
                })
                clientResponse.statusCode.should.equal(201)

                // 3rd-party broker: verifies tools work for hashid-identified brokers too, not just 'team-broker'
                const brokerResponse = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team.hashid}/brokers`,
                    cookies: { sid: aliceCookie },
                    body: {
                        name: 'mcp-test-broker',
                        host: 'localhost',
                        port: 1883,
                        protocol: 'mqtt:',
                        protocolVersion: 4,
                        ssl: false,
                        verifySSL: false,
                        clientId: 'mcp-test-broker-client',
                        credentials: { username: 'foo', password: 'bar' }
                    }
                })
                brokerResponse.statusCode.should.equal(201)
                brokerHashid = brokerResponse.json().id

                // needed for the topics/schema tool tests below
                const topicResponse = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team.hashid}/brokers/team-broker/topics`,
                    cookies: { sid: aliceCookie },
                    body: [{ topic: 'mcp/test/topic', metadata: { description: 'seeded for mcp tool tests' } }]
                })
                topicResponse.statusCode.should.equal(201)
            })

            it('platform_list_broker_clients matches GET /broker/clients', async function () {
                const tool = findTool('platform_list_broker_clients')
                const { routeResponse } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { teamId: app.team.hashid },
                    { method: 'GET', url: `/api/v1/teams/${app.team.hashid}/broker/clients` }
                )
                routeResponse.statusCode.should.equal(200)
                const body = routeResponse.json()
                body.clients.some(c => c.username === 'mcp-test-client').should.be.true()
            })

            it('platform_get_broker_client matches GET /broker/client/:username', async function () {
                const tool = findTool('platform_get_broker_client')
                const { routeResponse } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { teamId: app.team.hashid, username: 'mcp-test-client' },
                    { method: 'GET', url: `/api/v1/teams/${app.team.hashid}/broker/client/mcp-test-client` }
                )
                routeResponse.statusCode.should.equal(200)
                const body = routeResponse.json()
                body.should.have.property('username', 'mcp-test-client')
                JSON.stringify(body).should.not.match(/mcpTestPassword/)
            })

            it('platform_list_brokers matches GET /brokers', async function () {
                const tool = findTool('platform_list_brokers')
                const { routeResponse } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { teamId: app.team.hashid },
                    { method: 'GET', url: `/api/v1/teams/${app.team.hashid}/brokers` }
                )
                routeResponse.statusCode.should.equal(200)
                const body = routeResponse.json()
                body.brokers.some(b => b.id === brokerHashid).should.be.true()
                JSON.stringify(body).should.not.match(/credentials/)
            })

            it('platform_get_broker matches GET /brokers/:brokerId for a 3rd-party broker', async function () {
                const tool = findTool('platform_get_broker')
                const { routeResponse } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { teamId: app.team.hashid, brokerId: brokerHashid },
                    { method: 'GET', url: `/api/v1/teams/${app.team.hashid}/brokers/${brokerHashid}` }
                )
                routeResponse.statusCode.should.equal(200)
                const body = routeResponse.json()
                body.should.have.property('id', brokerHashid)
                JSON.stringify(body).should.not.match(/credentials/)
            })

            it('platform_list_broker_topics matches GET /brokers/team-broker/topics', async function () {
                const tool = findTool('platform_list_broker_topics')
                const { routeResponse } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { teamId: app.team.hashid, brokerId: 'team-broker' },
                    { method: 'GET', url: `/api/v1/teams/${app.team.hashid}/brokers/team-broker/topics` }
                )
                routeResponse.statusCode.should.equal(200)
                const body = routeResponse.json()
                body.topics.some(t => t.topic === 'mcp/test/topic').should.be.true()
            })

            it('platform_get_broker_schema matches GET /broker/team-broker/schema', async function () {
                const tool = findTool('platform_get_broker_schema')
                const { routeResponse } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { teamId: app.team.hashid, brokerId: 'team-broker' },
                    { method: 'GET', url: `/api/v1/teams/${app.team.hashid}/broker/team-broker/schema` }
                )
                routeResponse.statusCode.should.equal(200)
                const body = routeResponse.json()
                body.should.have.property('channels')
                body.channels.should.have.property('mcp/test/topic')
                JSON.stringify(body).should.not.match(/credentials/)
            })
        })
    })
})
