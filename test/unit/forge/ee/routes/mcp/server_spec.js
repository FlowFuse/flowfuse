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

        describe('GET /.well-known/oauth-protected-resource (RFC 9728)', function () {
            it('serves the path-inserted resource metadata anonymously', async function () {
                const response = await app.inject({ method: 'GET', url: '/.well-known/oauth-protected-resource/mcp' })
                response.statusCode.should.equal(200)
                response.json().should.deepEqual({
                    resource: `${app.config.base_url}/mcp`,
                    authorization_servers: [app.config.base_url]
                })
            })

            it('serves the bare alias anonymously', async function () {
                const response = await app.inject({ method: 'GET', url: '/.well-known/oauth-protected-resource' })
                response.statusCode.should.equal(200)
                response.json().should.deepEqual({
                    resource: `${app.config.base_url}/mcp`,
                    authorization_servers: [app.config.base_url]
                })
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

            it('should challenge with the protected resource metadata URL', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    payload: { jsonrpc: '2.0', method: 'initialize', id: 1 }
                })
                response.statusCode.should.equal(401)
                response.headers.should.have.property(
                    'www-authenticate',
                    `Bearer resource_metadata="${app.config.base_url}/.well-known/oauth-protected-resource/mcp"`
                )
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

            // OpenAI's clients do not return the Mcp-Session-Id we hand them, so every
            // request would otherwise look like a new session. They do send a per-conversation
            // id in _meta, which is the scope a pinned tab actually wants.
            it('should fall back to the openai/session meta when no header is supplied', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`
                    },
                    payload: {
                        jsonrpc: '2.0',
                        method: 'tools/call',
                        id: 1,
                        params: { name: 'a-tool', _meta: { 'openai/session': 'conv-xyz' } }
                    }
                })
                response.statusCode.should.equal(200)
                response.headers['mcp-session-id'].should.equal('conv-xyz')
                proxyRequest.firstCall.args[0].mcpSessionId.should.equal('conv-xyz')
            })

            it('should keep the same session id across calls in one openai conversation', async function () {
                const call = async () => app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: { authorization: `Bearer ${TestObjects.alicePAT.token}` },
                    payload: {
                        jsonrpc: '2.0',
                        method: 'tools/call',
                        id: 1,
                        params: { name: 'a-tool', _meta: { 'openai/session': 'conv-stable' } }
                    }
                })
                await call()
                await call()
                const first = proxyRequest.firstCall.args[0].mcpSessionId
                const second = proxyRequest.secondCall.args[0].mcpSessionId
                first.should.equal('conv-stable')
                second.should.equal(first)
            })

            it('should make an openai/session carrying a separator safe for the topic', async function () {
                const openaiSession = 'v1/3bjqKQlGRjpIMC9JfN8ZOLOI6XvwTstDuqZYmPAjNvBd9ZNRmU3NmyD4iT8CSJsVbFrSDHk0sSgz'
                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: { authorization: `Bearer ${TestObjects.alicePAT.token}` },
                    payload: {
                        jsonrpc: '2.0',
                        method: 'tools/call',
                        id: 1,
                        params: { name: 'a-tool', _meta: { 'openai/session': openaiSession } }
                    }
                })
                response.statusCode.should.equal(200)
                const routed = proxyRequest.firstCall.args[0].mcpSessionId
                routed.should.not.containEql('/')
                routed.should.match(/^[A-Za-z0-9_-]{8,128}$/)
                response.headers['mcp-session-id'].should.equal(routed)
            })

            it('should route the same openai/session to the same topic id every time', async function () {
                const call = async () => app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: { authorization: `Bearer ${TestObjects.alicePAT.token}` },
                    payload: {
                        jsonrpc: '2.0',
                        method: 'tools/call',
                        id: 1,
                        params: { name: 'a-tool', _meta: { 'openai/session': 'v1/stable-token' } }
                    }
                })
                await call()
                await call()
                proxyRequest.secondCall.args[0].mcpSessionId
                    .should.equal(proxyRequest.firstCall.args[0].mcpSessionId)
            })

            it('should prefer an explicit mcp-session-id over the openai/session meta', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'mcp-session-id': 'session-abc'
                    },
                    payload: {
                        jsonrpc: '2.0',
                        method: 'tools/call',
                        id: 1,
                        params: { name: 'a-tool', _meta: { 'openai/session': 'conv-xyz' } }
                    }
                })
                response.statusCode.should.equal(200)
                proxyRequest.firstCall.args[0].mcpSessionId.should.equal('session-abc')
            })

            it('should still mint a session id when neither is supplied', async function () {
                const call = async () => app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: { authorization: `Bearer ${TestObjects.alicePAT.token}` },
                    payload: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
                })
                await call()
                await call()
                const first = proxyRequest.firstCall.args[0].mcpSessionId
                const second = proxyRequest.secondCall.args[0].mcpSessionId
                first.should.be.a.String().and.not.be.empty()
                second.should.not.equal(first)
            })

            it('should pass the pinned browser session and its team as user properties', async function () {
                await app.db.controllers.BrowserSession.recordPresence(app.user.hashid, 'tab-1', {
                    visibility: 'visible',
                    focused: true,
                    context: { teamId: app.team.hashid, topicParts: { entityType: 'instance', entityId: 'instance-1' } }
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
                userProperties.should.have.property('activeBrowserSessionId', 'tab-1')
                userProperties.should.have.property('entityType', 'instance')
                userProperties.should.have.property('entityId', 'instance-1')
                userProperties.should.have.property('teamId', app.team.hashid)
                userProperties.should.have.property('patId').and.be.a.String().and.not.be.empty()
                const expectedTelemetry = (app.license.active() || (app.config.telemetry?.enabled !== false && app.settings.get('telemetry:enabled') !== false)) ? 'true' : 'false'
                userProperties.should.have.property('telemetryEnabled', expectedTelemetry)

                await app.db.controllers.BrowserSession.removeSession(app.user.hashid, 'tab-1')
            })

            it('should refuse a call when the pinned tab belongs to a team with AI disabled', async function () {
                const properties = { ...(app.team.properties || {}) }
                properties.features = { ...(properties.features || {}), ai: false }
                app.team.properties = properties
                await app.team.save()

                await app.db.controllers.BrowserSession.recordPresence(app.user.hashid, 'tab-3', {
                    visibility: 'visible',
                    focused: true,
                    context: { teamId: app.team.hashid, topicParts: { entityType: 'instance', entityId: 'instance-1' } }
                })
                await app.db.controllers.BrowserSession.setActiveBrowserSession(app.user.hashid, 'session-ghi', 'tab-3')

                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'mcp-session-id': 'session-ghi'
                    },
                    payload: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
                })
                response.statusCode.should.equal(403)
                response.json().should.have.property('code', 'unauthorized')
                response.json().should.have.property('hint', 'A team owner can re-enable AI Features from Team Settings > Danger Zone.')
                proxyRequest.called.should.be.false()

                await app.db.controllers.BrowserSession.removeSession(app.user.hashid, 'tab-3')
                properties.features.ai = true
                app.team.properties = properties
                await app.team.save()
            })

            it('should refuse a call when the pinned tab belongs to a team with MCP access disabled', async function () {
                const properties = { ...(app.team.properties || {}) }
                properties.features = { ...(properties.features || {}), mcpThirdParty: false }
                app.team.properties = properties
                await app.team.save()

                await app.db.controllers.BrowserSession.recordPresence(app.user.hashid, 'tab-2', {
                    visibility: 'visible',
                    focused: true,
                    context: { teamId: app.team.hashid, topicParts: { entityType: 'instance', entityId: 'instance-1' } }
                })
                await app.db.controllers.BrowserSession.setActiveBrowserSession(app.user.hashid, 'session-def', 'tab-2')

                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`,
                        'mcp-session-id': 'session-def'
                    },
                    payload: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
                })
                response.statusCode.should.equal(403)
                response.json().should.have.property('code', 'unauthorized')
                response.json().should.have.property('hint', 'A team owner can re-enable MCP access from Team Settings > Danger Zone.')
                proxyRequest.called.should.be.false()

                await app.db.controllers.BrowserSession.removeSession(app.user.hashid, 'tab-2')
                properties.features.mcpThirdParty = true
                app.team.properties = properties
                await app.team.save()
            })

            it('should fall back to a single-team PAT scope for the team when no tab is pinned', async function () {
                const singleTeamPAT = await app.db.controllers.AccessToken.createPersonalAccessToken(
                    app.user, '', null, 'alice-single-team', { teamIds: [app.team.hashid] }
                )

                const response = await app.inject({
                    method: 'POST',
                    url: '/mcp',
                    headers: {
                        authorization: `Bearer ${singleTeamPAT.token}`
                    },
                    payload: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
                })
                response.statusCode.should.equal(200)
                const userProperties = proxyRequest.firstCall.args[3]
                userProperties.should.have.property('teamId', app.team.hashid)
                userProperties.should.not.have.property('activeBrowserSessionId')
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

    describe('Cloud deployment', function () {
        let app
        let alicePAT
        let proxyRequest

        before(async function () {
            app = await setup({
                license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w',
                ai: { enabled: true },
                expert: { enabled: true },
                telemetry: { anonymize: false }
            })
            alicePAT = await app.db.controllers.AccessToken.createPersonalAccessToken(
                app.user,
                '',
                null,
                'alice-pat-cloud'
            )
        })

        after(async function () {
            await app.close()
        })

        beforeEach(function () {
            proxyRequest = sinon.stub(app.comms.mcpGateway, 'proxyRequest')
                .resolves({ jsonrpc: '2.0', id: 1, result: { tools: [] } })
        })

        afterEach(function () {
            proxyRequest.restore()
        })

        it('should mark deployment cloud when telemetry.anonymize is false', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/mcp',
                headers: {
                    authorization: `Bearer ${alicePAT.token}`
                },
                payload: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
            })
            response.statusCode.should.equal(200)
            proxyRequest.firstCall.args[3].should.have.property('deployment', 'cloud')
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
