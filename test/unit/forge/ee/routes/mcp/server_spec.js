const should = require('should')
const sinon = require('sinon')

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

            TestObjects.aliceReadOnlyPAT = await app.db.controllers.AccessToken.createPersonalAccessToken(
                app.user,
                '',
                null,
                'alice-pat-read-only',
                { readOnly: true }
            )
        })

        after(async function () {
            await app.close()
        })

        describe('Feature flag', function () {
            it('should register the expertPlatformAutomation feature flag', async function () {
                app.config.features.enabled('expertPlatformAutomation').should.equal(true)
            })
        })

        describe('POST proxies to the MCP gateway', function () {
            let proxyRequest

            beforeEach(function () {
                proxyRequest = sinon.stub(app.comms.mcpGateway, 'proxyRequest')
                    .resolves({ jsonrpc: '2.0', id: 1, result: { tools: [] } })
            })

            afterEach(function () {
                proxyRequest.restore()
            })

            it('should return 401 without a token', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    payload: { jsonrpc: '2.0', method: 'initialize', id: 1 }
                })
                response.statusCode.should.equal(401)
                proxyRequest.called.should.be.false()
            })

            it('should forward the request and return the gateway response', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`
                    },
                    payload: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
                })
                response.statusCode.should.equal(200)
                response.json().should.have.property('result')
                response.headers.should.have.property('mcp-session-id')

                proxyRequest.calledOnce.should.be.true()
                const [route, payload] = proxyRequest.firstCall.args
                route.should.have.property('userId', app.user.hashid)
                route.should.have.property('mcpSessionId').and.be.a.String()
                payload.mcp.should.have.property('method', 'tools/list')
                payload.should.have.property('scope')
                payload.scope.should.have.property('readOnly', false)
                payload.toolGroups.should.deepEqual(['platform', 'platform_ui', 'flow_building'])
            })

            it('should reuse a supplied mcp-session-id', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'mcp-session-id': 'session-abc'
                    },
                    payload: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
                })
                response.statusCode.should.equal(200)
                response.headers['mcp-session-id'].should.equal('session-abc')
                proxyRequest.firstCall.args[0].mcpSessionId.should.equal('session-abc')
            })

            it('should pass the pinned browser session as a user property', async function () {
                await app.db.controllers.BrowserSession.recordPresence(app.user.hashid, 'tab-1', {
                    visibility: 'visible',
                    focused: true,
                    context: { topicParts: { entityType: 'instance', entityId: 'instance-1' } }
                })
                await app.db.controllers.BrowserSession.setActiveBrowserSession(app.user.hashid, 'session-abc', 'tab-1')

                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'mcp-session-id': 'session-abc'
                    },
                    payload: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
                })
                response.statusCode.should.equal(200)
                const userProperties = proxyRequest.firstCall.args[3]
                userProperties.should.deepEqual({
                    activeBrowserSessionId: 'tab-1',
                    entityType: 'instance',
                    entityId: 'instance-1'
                })

                await app.db.controllers.BrowserSession.removeSession(app.user.hashid, 'tab-1')
            })

            it('should acknowledge a notification without calling the gateway', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`
                    },
                    payload: { jsonrpc: '2.0', method: 'notifications/initialized' }
                })
                response.statusCode.should.equal(202)
                proxyRequest.called.should.be.false()
            })

            it('should return 400 for a malformed body', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'content-type': 'application/json'
                    },
                    payload: '"not-an-object"'
                })
                response.statusCode.should.equal(400)
                proxyRequest.called.should.be.false()
            })

            it('should return 504 when the gateway does not respond', async function () {
                proxyRequest.rejects(new Error('Request timed out'))
                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`
                    },
                    payload: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
                })
                response.statusCode.should.equal(504)
                response.json().should.have.property('code', 'gateway_timeout')
            })

            describe('read-only tokens', function () {
                it('should reject invoke_write_tool with 403', async function () {
                    const response = await app.inject({
                        method: 'POST',
                        url: '/mcp',
                        headers: {
                            authorization: `Bearer ${TestObjects.aliceReadOnlyPAT.token}`
                        },
                        payload: {
                            jsonrpc: '2.0',
                            method: 'tools/call',
                            id: 1,
                            params: { name: 'invoke_write_tool' }
                        }
                    })
                    response.statusCode.should.equal(403)
                    proxyRequest.called.should.be.false()
                })

                it('should reject invoke_delete_tool with 403', async function () {
                    const response = await app.inject({
                        method: 'POST',
                        url: '/mcp',
                        headers: {
                            authorization: `Bearer ${TestObjects.aliceReadOnlyPAT.token}`
                        },
                        payload: {
                            jsonrpc: '2.0',
                            method: 'tools/call',
                            id: 1,
                            params: { name: 'invoke_delete_tool' }
                        }
                    })
                    response.statusCode.should.equal(403)
                    proxyRequest.called.should.be.false()
                })

                it('should allow invoke_read_tool', async function () {
                    const response = await app.inject({
                        method: 'POST',
                        url: '/mcp',
                        headers: {
                            authorization: `Bearer ${TestObjects.aliceReadOnlyPAT.token}`
                        },
                        payload: {
                            jsonrpc: '2.0',
                            method: 'tools/call',
                            id: 1,
                            params: { name: 'invoke_read_tool' }
                        }
                    })
                    response.statusCode.should.equal(200)
                    proxyRequest.firstCall.args[1].scope.readOnly.should.be.true()
                })
            })
        })

        describe('GET and DELETE', function () {
            it('should return 405 for GET (no server-initiated stream)', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: '/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`
                    }
                })
                response.statusCode.should.equal(405)
            })

            it('should return 204 for DELETE (nothing held server-side)', async function () {
                const response = await app.inject({
                    method: 'DELETE',
                    url: '/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`
                    }
                })
                response.statusCode.should.equal(204)
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
