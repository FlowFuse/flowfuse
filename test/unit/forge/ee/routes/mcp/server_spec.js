const should = require('should')
const sinon = require('sinon')

const setup = require('../../setup')

describe('MCP Platform Tools Server', function () {
    describe('Feature flag enabled (default)', function () {
        let app
        const TestObjects = {}
        // A canned MCP JSON-RPC result the stubbed gateway resolves with on the happy path
        const cannedMcpResult = { jsonrpc: '2.0', id: 1, result: { tools: [] } }

        before(async function () {
            app = await setup({
                license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w',
                ai: { enabled: true },
                expert: { enabled: true }
            })

            // A regular (non read-only) PAT used for the happy-path door tests
            TestObjects.alicePAT = await app.db.controllers.AccessToken.createPersonalAccessToken(
                app.user,
                '',
                null,
                'alice-pat'
            )
            // A read-only PAT used to exercise the write/delete gate
            TestObjects.aliceReadOnlyPAT = await app.db.controllers.AccessToken.createPersonalAccessToken(
                app.user,
                '',
                null,
                'alice-readonly-pat',
                { readOnly: true }
            )
        })

        after(async function () {
            await app.close()
        })

        // There is no MCP gateway in the test environment, so stub the MQTT proxy seam
        // (app.comms.mcpProxyRequest) that the door forwards to. It is not part of the
        // decorated comms API in the test app, so assign it directly and remove afterwards.
        let proxyStub
        beforeEach(function () {
            if (!app.comms) {
                app.comms = {}
            }
            proxyStub = sinon.stub().resolves(cannedMcpResult)
            app.comms.mcpProxyRequest = proxyStub
        })

        afterEach(function () {
            delete app.comms.mcpProxyRequest
            sinon.restore()
        })

        describe('Feature flag', function () {
            it('should register the expertPlatformAutomation feature flag', async function () {
                app.config.features.enabled('expertPlatformAutomation').should.equal(true)
            })
        })

        describe('MCP door', function () {
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

            it('should return 204 for DELETE', async function () {
                const response = await app.inject({
                    method: 'DELETE',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`
                    }
                })
                response.statusCode.should.equal(204)
            })

            it('should return 202 for a notification (no id) without proxying', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'content-type': 'application/json'
                    },
                    payload: { jsonrpc: '2.0', method: 'notifications/initialized' }
                })
                response.statusCode.should.equal(202)
                proxyStub.called.should.be.false()
            })

            it('should return 400 for a malformed (non-object) body', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'content-type': 'application/json'
                    },
                    payload: '"not-an-object"'
                })
                response.statusCode.should.equal(400)
                proxyStub.called.should.be.false()
            })

            it('should proxy a valid request and return the gateway result with an mcp-session-id header', async function () {
                const mcpBody = { jsonrpc: '2.0', method: 'tools/list', id: 1 }
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'content-type': 'application/json'
                    },
                    payload: mcpBody
                })
                response.statusCode.should.equal(200)
                response.json().should.deepEqual(cannedMcpResult)
                // the response echoes an mcp-session-id back to the caller
                response.headers.should.have.property('mcp-session-id').which.is.a.String()

                // the door forwarded to the gateway proxy exactly once with the expected shape
                proxyStub.calledOnce.should.be.true()
                const [route, payload] = proxyStub.getCall(0).args

                // route carries user + session routing only - no NR entity target
                route.should.have.property('userId', app.user.hashid)
                route.should.have.property('mcpSessionId').which.is.a.String()
                route.mcpSessionId.should.equal(response.headers['mcp-session-id'])
                route.should.not.have.property('entityType')
                route.should.not.have.property('entityId')

                // payload carries the MCP body, the caller scope and all three tool groups
                payload.should.have.property('mcp').which.deepEqual(mcpBody)
                payload.should.have.property('toolGroups').which.deepEqual(['platform', 'platform_ui', 'flow_building'])
                payload.should.have.property('scope').which.is.an.Object()
                payload.scope.should.have.property('readOnly', false)
                payload.scope.should.have.property('teams').which.is.an.Array()
            })

            it('should reuse a caller-supplied mcp-session-id', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'content-type': 'application/json',
                        'mcp-session-id': 'session-abc'
                    },
                    payload: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
                })
                response.statusCode.should.equal(200)
                response.headers['mcp-session-id'].should.equal('session-abc')
                proxyStub.getCall(0).args[0].should.have.property('mcpSessionId', 'session-abc')
            })

            it('should return 403 when a read-only PAT calls invoke_write_tool', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.aliceReadOnlyPAT.token}`,
                        'content-type': 'application/json'
                    },
                    payload: {
                        jsonrpc: '2.0',
                        method: 'tools/call',
                        params: { name: 'invoke_write_tool' },
                        id: 2
                    }
                })
                response.statusCode.should.equal(403)
                response.json().should.have.property('code', 'unauthorized')
                proxyStub.called.should.be.false()
            })

            it('should return 504 when the gateway proxy rejects', async function () {
                proxyStub.rejects(new Error('Timed out waiting for MCP gateway response'))
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'content-type': 'application/json'
                    },
                    payload: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
                })
                response.statusCode.should.equal(504)
                response.json().should.have.property('code', 'gateway_timeout')
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

        before(async function () {
            app = await setup({
                license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w',
                ai: { enabled: false }
            })
        })

        after(async function () {
            await app.close()
        })

        it('should not register the expertPlatformAutomation feature flag when AI is disabled', async function () {
            should(app.config.features.enabled('expertPlatformAutomation')).not.equal(true)
        })
    })
})
