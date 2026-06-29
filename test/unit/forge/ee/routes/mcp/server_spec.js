const should = require('should') // eslint-disable-line no-unused-vars

const setup = require('../../setup')

describe('MCP Platform Tools Server', function () {
    describe('Feature flag enabled (default)', function () {
        let app
        const TestObjects = {}

        before(async function () {
            app = await setup({
                license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w',
                ai: { enabled: true },
                expert: { enabled: true }
            })

            TestObjects.alicePAT = await app.db.controllers.AccessToken.createPersonalAccessToken(
                app.user,
                '',
                null,
                'alice-pat'
            )
        })

        after(async function () {
            await app.close()
        })

        /**
         * Parses an SSE response from the MCP transport.
         * Extracts JSON-RPC messages from `data:` lines.
         */
        function parseSSEResponse (response) {
            const body = response.body
            if (response.headers['content-type']?.includes('application/json')) {
                return { statusCode: response.statusCode, result: JSON.parse(body) }
            }
            const messages = []
            const lines = body.split('\n')
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        messages.push(JSON.parse(line.slice(6)))
                    } catch (e) {
                        // skip non-JSON data lines
                    }
                }
            }
            if (messages.length === 1) {
                return { statusCode: response.statusCode, result: messages[0] }
            }
            return { statusCode: response.statusCode, messages }
        }

        describe('Feature flag', function () {
            it('should register the expertPlatformAutomation feature flag', async function () {
                app.config.features.enabled('expertPlatformAutomation').should.equal(true)
            })
        })

        describe('Authentication', function () {
            it('should return 401 without auth', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    payload: { jsonrpc: '2.0', method: 'initialize', id: 1 }
                })
                response.statusCode.should.equal(401)
            })

            it('should return 401 with invalid token', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: 'Bearer invalid-token'
                    },
                    payload: { jsonrpc: '2.0', method: 'initialize', id: 1 }
                })
                response.statusCode.should.equal(401)
            })
        })

        describe('Transport', function () {
            it('should return 405 for GET', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`
                    }
                })
                response.statusCode.should.equal(405)
            })

            it('should return 405 for DELETE', async function () {
                const response = await app.inject({
                    method: 'DELETE',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`
                    }
                })
                response.statusCode.should.equal(405)
            })
        })

        describe('Initialize', function () {
            it('should respond with server info and capabilities', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'content-type': 'application/json',
                        accept: 'application/json, text/event-stream'
                    },
                    payload: {
                        jsonrpc: '2.0',
                        method: 'initialize',
                        id: 1,
                        params: {
                            protocolVersion: '2025-03-26',
                            capabilities: {},
                            clientInfo: { name: 'test-client', version: '1.0.0' }
                        }
                    }
                })
                response.statusCode.should.equal(200)
                const { result } = parseSSEResponse(response)
                result.should.have.property('result')
                result.result.should.have.property('serverInfo')
                result.result.serverInfo.name.should.equal('FlowFuse Platform')
                result.result.serverInfo.version.should.equal('1.0.0')
                result.result.should.have.property('capabilities')
                result.result.capabilities.should.have.property('tools')
            })
        })

        describe('Tool listing', function () {
            it('should list registered tools with annotations', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'content-type': 'application/json',
                        accept: 'application/json, text/event-stream'
                    },
                    payload: [
                        { jsonrpc: '2.0', method: 'notifications/initialized' },
                        { jsonrpc: '2.0', method: 'tools/list', id: 2 }
                    ]
                })
                response.statusCode.should.equal(200)
                const parsed = parseSSEResponse(response)
                const messages = parsed.messages || [parsed.result]
                const toolsResponse = messages.find(m => m.id === 2)
                toolsResponse.should.have.property('result')
                toolsResponse.result.should.have.property('tools')
                toolsResponse.result.tools.should.be.an.Array()
                toolsResponse.result.tools.length.should.equal(23)

                const listTeams = toolsResponse.result.tools.find(t => t.name === 'platform_list_teams')
                listTeams.should.be.an.Object()
                listTeams.should.have.property('description')
                listTeams.annotations.readOnlyHint.should.equal(true)
                listTeams.annotations.destructiveHint.should.equal(false)

                const getTeam = toolsResponse.result.tools.find(t => t.name === 'platform_get_team')
                getTeam.should.be.an.Object()
                getTeam.should.have.property('inputSchema')
            })
        })

        describe('Tool execution', function () {
            it('list-teams should return teams for the authenticated user', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'content-type': 'application/json',
                        accept: 'application/json, text/event-stream'
                    },
                    payload: [
                        { jsonrpc: '2.0', method: 'notifications/initialized' },
                        { jsonrpc: '2.0', method: 'tools/call', id: 2, params: { name: 'platform_list_teams', arguments: {} } }
                    ]
                })
                const parsed = parseSSEResponse(response)
                const messages = parsed.messages || [parsed.result]
                const toolResult = messages.find(m => m.id === 2)
                toolResult.should.have.property('result')
                toolResult.result.should.have.property('content')
                toolResult.result.content[0].type.should.equal('text')

                const data = JSON.parse(toolResult.result.content[0].text)
                data.should.have.property('teams')
                data.teams.should.be.an.Array()
                data.teams.length.should.be.greaterThan(0)
                data.teams[0].should.have.property('name', 'ATeam')
            })

            it('get-team should return team details by ID', async function () {
                const teamId = app.team.hashid
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'content-type': 'application/json',
                        accept: 'application/json, text/event-stream'
                    },
                    payload: [
                        { jsonrpc: '2.0', method: 'notifications/initialized' },
                        { jsonrpc: '2.0', method: 'tools/call', id: 2, params: { name: 'platform_get_team', arguments: { teamId } } }
                    ]
                })
                const parsed = parseSSEResponse(response)
                const messages = parsed.messages || [parsed.result]
                const toolResult = messages.find(m => m.id === 2)
                toolResult.should.have.property('result')

                const data = JSON.parse(toolResult.result.content[0].text)
                data.should.have.property('name', 'ATeam')
            })

            it('get-team should return error for non-existent team', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'content-type': 'application/json',
                        accept: 'application/json, text/event-stream'
                    },
                    payload: [
                        { jsonrpc: '2.0', method: 'notifications/initialized' },
                        { jsonrpc: '2.0', method: 'tools/call', id: 2, params: { name: 'platform_get_team', arguments: { teamId: 'nonexistent' } } }
                    ]
                })
                const parsed = parseSSEResponse(response)
                const messages = parsed.messages || [parsed.result]
                const toolResult = messages.find(m => m.id === 2)
                toolResult.should.have.property('result')
                toolResult.result.isError.should.equal(true)
            })
        })

        describe('Stateless behavior', function () {
            it('should not leak state between sequential requests', async function () {
                // First request: initialize
                const res1 = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'content-type': 'application/json',
                        accept: 'application/json, text/event-stream'
                    },
                    payload: {
                        jsonrpc: '2.0',
                        method: 'initialize',
                        id: 1,
                        params: {
                            protocolVersion: '2025-03-26',
                            capabilities: {},
                            clientInfo: { name: 'test-client', version: '1.0.0' }
                        }
                    }
                })
                res1.statusCode.should.equal(200)

                // Second request: independent initialize (no session carry-over)
                const res2 = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'content-type': 'application/json',
                        accept: 'application/json, text/event-stream'
                    },
                    payload: {
                        jsonrpc: '2.0',
                        method: 'initialize',
                        id: 1,
                        params: {
                            protocolVersion: '2025-03-26',
                            capabilities: {},
                            clientInfo: { name: 'test-client-2', version: '2.0.0' }
                        }
                    }
                })
                res2.statusCode.should.equal(200)

                // Both should have succeeded independently
                const parsed1 = parseSSEResponse(res1)
                const parsed2 = parseSSEResponse(res2)
                parsed1.result.result.serverInfo.name.should.equal('FlowFuse Platform')
                parsed2.result.result.serverInfo.name.should.equal('FlowFuse Platform')

                // No Mcp-Session-Id header (stateless)
                should(res1.headers['mcp-session-id']).be.undefined()
                should(res2.headers['mcp-session-id']).be.undefined()
            })
        })

        describe('Existing registration routes', function () {
            it('should not break existing registration routes', async function () {
                const { token } = await app.instance.refreshAuthTokens()
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team.hashid}/mcp/instance/${app.instance.id}/test-node`,
                    headers: {
                        authorization: `Bearer ${token}`,
                        'content-type': 'application/json'
                    },
                    payload: {
                        name: 'test-server',
                        protocol: 'http',
                        endpointRoute: '/mcp',
                        title: 'Test MCP',
                        version: '1.0.0',
                        description: 'test'
                    }
                })
                response.statusCode.should.equal(200)

                await login(app)
                const listResponse = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${app.team.hashid}/mcp`,
                    cookies: { sid: TestObjects.aliceSid }
                })
                listResponse.statusCode.should.equal(200)
                const body = listResponse.json()
                body.should.have.property('servers')
                body.servers.should.be.an.Array()
            })

            async function login (app) {
                if (TestObjects.aliceSid) {
                    return
                }
                const response = await app.inject({
                    method: 'POST',
                    url: '/account/login',
                    payload: { username: 'alice', password: 'aaPassword', remember: false }
                })
                TestObjects.aliceSid = response.cookies[0].value
            }
        })
    })

    describe('Feature flag disabled', function () {
        let app
        const TestObjects = {}

        before(async function () {
            app = await setup({
                license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w',
                ai: { enabled: false }
            })

            TestObjects.alicePAT = await app.db.controllers.AccessToken.createPersonalAccessToken(
                app.user,
                '',
                null,
                'alice-pat'
            )
        })

        after(async function () {
            await app.close()
        })

        it('should not register the expertPlatformAutomation feature flag when AI is disabled', async function () {
            should(app.config.features.enabled('expertPlatformAutomation')).not.equal(true)
        })

        it('should return 404 for POST /api/v1/mcp when feature is disabled', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/mcp',
                headers: {
                    authorization: `Bearer ${TestObjects.alicePAT.token}`
                },
                payload: { jsonrpc: '2.0', method: 'initialize', id: 1 }
            })
            response.statusCode.should.equal(404)
        })
    })
})
