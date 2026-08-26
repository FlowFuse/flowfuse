const should = require('should')
const sinon = require('sinon')

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')

const { Roles } = FF_UTIL.require('forge/lib/roles')

const ENTERPRISE_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'

// Set (and invalidate the cache for) a team's per-team AI feature override.
async function setTeamAi (app, team, enabled) {
    const properties = team.properties || {}
    properties.features = { ...(properties.features || {}), ai: enabled }
    team.properties = properties
    await team.save()
    await app.db.controllers.Team.clearTeamAiCache(team.hashid)
}

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
        let disabledPAT

        before(async function () {
            app = await setup({
                license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w',
                ai: { enabled: false }
            })
            disabledPAT = await app.db.controllers.AccessToken.createPersonalAccessToken(app.user, '', null, 'ai-disabled-pat')
        })

        after(async function () {
            await app.close()
        })

        it('should not register the expertPlatformAutomation feature flag when AI is disabled', async function () {
            should(app.config.features.enabled('expertPlatformAutomation')).not.equal(true)
        })

        it('returns 404 from the MCP door when the platform AI feature is off', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/mcp',
                headers: { authorization: `Bearer ${disabledPAT.token}` },
                payload: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
            })
            response.statusCode.should.equal(404)
        })
    })

    describe('Per-team AI gating', function () {
        let app
        let proxyRequest
        const T = {}

        before(async function () {
            app = await setup({
                license: ENTERPRISE_LICENSE,
                ai: { enabled: true },
                expert: { enabled: true }
            })
            // app.user (alice) is already an owner of app.team; give her two more teams
            // so the all-teams token has a mix to gate.
            T.ateam = app.team
            T.bteam = await app.factory.createTeam({ name: 'BTeam' })
            await T.bteam.addUser(app.user, { through: { role: Roles.Owner } })
            T.cteam = await app.factory.createTeam({ name: 'CTeam' })
            await T.cteam.addUser(app.user, { through: { role: Roles.Owner } })

            T.globalPAT = await app.db.controllers.AccessToken.createPersonalAccessToken(app.user, '', null, 'ai-global')
            T.bTeamPAT = await app.db.controllers.AccessToken.createPersonalAccessToken(app.user, '', null, 'ai-bteam', { teamIds: [T.bteam.hashid] })
            T.abTeamPAT = await app.db.controllers.AccessToken.createPersonalAccessToken(app.user, '', null, 'ai-abteam', { teamIds: [T.ateam.hashid, T.bteam.hashid] })

            // Edge-case fixtures on their own users, so alice's all-teams baseline stays "every team on".
            T.noTeamsUser = await app.factory.createUser({ username: 'bob', name: 'Bob', email: 'bob@example.com', password: 'bbPassword' })
            T.noTeamsPAT = await app.db.controllers.AccessToken.createPersonalAccessToken(T.noTeamsUser, '', null, 'ai-no-teams')

            T.carol = await app.factory.createUser({ username: 'carol', name: 'Carol', email: 'carol@example.com', password: 'ccPassword' })
            const aiOffType = await app.factory.createTeamType({ name: 'ai-off-type', properties: { features: { ai: false } } })
            const aiOnType = await app.factory.createTeamType({ name: 'ai-on-type', properties: { features: { ai: true } } })
            T.inheritOffTeam = await app.factory.createTeam({ name: 'InheritOff' }, aiOffType)
            await T.inheritOffTeam.addUser(T.carol, { through: { role: Roles.Owner } })
            T.inheritOnTeam = await app.factory.createTeam({ name: 'InheritOn' }, aiOnType)
            await T.inheritOnTeam.addUser(T.carol, { through: { role: Roles.Owner } })
            T.inheritOffPAT = await app.db.controllers.AccessToken.createPersonalAccessToken(T.carol, '', null, 'ai-inherit-off', { teamIds: [T.inheritOffTeam.hashid] })
            T.inheritOnPAT = await app.db.controllers.AccessToken.createPersonalAccessToken(T.carol, '', null, 'ai-inherit-on', { teamIds: [T.inheritOnTeam.hashid] })

            T.flipType = await app.factory.createTeamType({ name: 'ai-flip-type', properties: { features: { ai: true } } })
            T.flipTeam = await app.factory.createTeam({ name: 'FlipTeam' }, T.flipType)
            await T.flipTeam.addUser(T.carol, { through: { role: Roles.Owner } })
            T.flipPAT = await app.db.controllers.AccessToken.createPersonalAccessToken(T.carol, '', null, 'ai-flip', { teamIds: [T.flipTeam.hashid] })
        })

        after(async function () {
            await app.close()
        })

        beforeEach(async function () {
            proxyRequest = sinon.stub(app.comms.mcpGateway, 'proxyRequest')
                .resolves({ jsonrpc: '2.0', id: 1, result: { tools: [] } })
            // Reset every team to AI-enabled before each case.
            await setTeamAi(app, T.ateam, true)
            await setTeamAi(app, T.bteam, true)
            await setTeamAi(app, T.cteam, true)
        })

        afterEach(function () {
            proxyRequest.restore()
        })

        async function callWith (pat) {
            proxyRequest.resetHistory()
            return app.inject({
                method: 'POST',
                url: '/mcp',
                headers: { authorization: `Bearer ${pat.token}` },
                payload: { jsonrpc: '2.0', method: 'tools/list', id: 1 }
            })
        }

        function forwardedTeams () {
            return proxyRequest.firstCall.args[1].scope.teams
        }

        it('leaves an all-teams token unrestricted when every team has AI enabled', async function () {
            const response = await callWith(T.globalPAT)
            response.statusCode.should.equal(200)
            forwardedTeams().should.deepEqual([])
        })

        it('narrows an all-teams token to the AI-enabled subset when some teams are disabled', async function () {
            await setTeamAi(app, T.cteam, false)
            const response = await callWith(T.globalPAT)
            response.statusCode.should.equal(200)
            const teams = forwardedTeams()
            teams.should.have.length(2)
            teams.should.containEql(T.ateam.hashid)
            teams.should.containEql(T.bteam.hashid)
            teams.should.not.containEql(T.cteam.hashid)
        })

        it('denies an all-teams token via a sentinel when every team has AI disabled', async function () {
            await setTeamAi(app, T.ateam, false)
            await setTeamAi(app, T.bteam, false)
            await setTeamAi(app, T.cteam, false)
            const response = await callWith(T.globalPAT)
            response.statusCode.should.equal(200)
            const teams = forwardedTeams()
            // Non-empty (never collapses to all-teams) and matches no real team.
            teams.should.have.length(1)
            teams[0].should.not.equal(T.ateam.hashid)
            teams[0].should.not.equal(T.bteam.hashid)
            teams[0].should.not.equal(T.cteam.hashid)
        })

        it('does not attribute the sentinel as a team on a denied all-teams token', async function () {
            await setTeamAi(app, T.ateam, false)
            await setTeamAi(app, T.bteam, false)
            await setTeamAi(app, T.cteam, false)
            const response = await callWith(T.globalPAT)
            response.statusCode.should.equal(200)
            proxyRequest.firstCall.args[3].should.not.have.property('teamId')
        })

        it('keeps a team-scoped token when its team has AI enabled', async function () {
            const response = await callWith(T.bTeamPAT)
            response.statusCode.should.equal(200)
            forwardedTeams().should.deepEqual([T.bteam.hashid])
        })

        it('denies a team-scoped token via a sentinel when its only team has AI disabled', async function () {
            await setTeamAi(app, T.bteam, false)
            const response = await callWith(T.bTeamPAT)
            response.statusCode.should.equal(200)
            const teams = forwardedTeams()
            teams.should.have.length(1)
            teams[0].should.not.equal(T.bteam.hashid)
        })

        it('filters a multi-team scoped token down to its AI-enabled teams', async function () {
            await setTeamAi(app, T.bteam, false)
            const response = await callWith(T.abTeamPAT)
            response.statusCode.should.equal(200)
            forwardedTeams().should.deepEqual([T.ateam.hashid])
        })

        it('caches the team AI value until it is invalidated', async function () {
            const first = await app.db.controllers.Team.isTeamAiEnabled(T.cteam.hashid)
            first.should.be.true()
            // Flip the value in the database without clearing the cache.
            const properties = T.cteam.properties
            properties.features = { ...(properties.features || {}), ai: false }
            T.cteam.properties = properties
            await T.cteam.save()
            const cached = await app.db.controllers.Team.isTeamAiEnabled(T.cteam.hashid)
            cached.should.be.true()
            await app.db.controllers.Team.clearTeamAiCache(T.cteam.hashid)
            const fresh = await app.db.controllers.Team.isTeamAiEnabled(T.cteam.hashid)
            fresh.should.be.false()
        })

        it('reflects an AI toggle made through the team API on the next call', async function () {
            const loginResponse = await app.inject({
                method: 'POST',
                url: '/account/login',
                payload: { username: 'alice', password: 'aaPassword', remember: false }
            })
            const sid = loginResponse.cookies[0].value
            const putResponse = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${T.cteam.hashid}`,
                cookies: { sid },
                payload: { features: { ai: false } }
            })
            putResponse.statusCode.should.equal(200)

            const response = await callWith(T.globalPAT)
            response.statusCode.should.equal(200)
            const teams = forwardedTeams()
            teams.should.not.containEql(T.cteam.hashid)
            teams.should.containEql(T.ateam.hashid)
            teams.should.containEql(T.bteam.hashid)
        })

        it('denies an all-teams token for a user who belongs to no teams', async function () {
            const response = await callWith(T.noTeamsPAT)
            response.statusCode.should.equal(200)
            const teams = forwardedTeams()
            teams.should.have.length(1)
            teams[0].should.not.equal(T.ateam.hashid)
        })

        it('keeps every team of a multi-team scoped token when all have AI enabled', async function () {
            const response = await callWith(T.abTeamPAT)
            response.statusCode.should.equal(200)
            const teams = forwardedTeams()
            teams.should.have.length(2)
            teams.should.containEql(T.ateam.hashid)
            teams.should.containEql(T.bteam.hashid)
        })

        it('denies a multi-team scoped token when all its teams have AI disabled', async function () {
            await setTeamAi(app, T.ateam, false)
            await setTeamAi(app, T.bteam, false)
            const response = await callWith(T.abTeamPAT)
            response.statusCode.should.equal(200)
            const teams = forwardedTeams()
            teams.should.have.length(1)
            teams[0].should.not.equal(T.ateam.hashid)
            teams[0].should.not.equal(T.bteam.hashid)
        })

        it('gates on the team-type value when a team has no per-team override', async function () {
            const off = await callWith(T.inheritOffPAT)
            off.statusCode.should.equal(200)
            const offTeams = forwardedTeams()
            offTeams.should.have.length(1)
            offTeams.should.not.containEql(T.inheritOffTeam.hashid)

            const on = await callWith(T.inheritOnPAT)
            on.statusCode.should.equal(200)
            forwardedTeams().should.deepEqual([T.inheritOnTeam.hashid])
        })

        it('reflects a new team membership on the next call', async function () {
            await setTeamAi(app, T.cteam, false)
            const before = await callWith(T.globalPAT)
            before.statusCode.should.equal(200)
            forwardedTeams().should.not.containEql(T.cteam.hashid)

            const dteam = await app.factory.createTeam({ name: 'DTeam' })
            // Through the controller, so the user-teams cache is invalidated (the path real membership changes take).
            await app.db.controllers.Team.addUser(dteam, app.user, Roles.Owner)
            try {
                const after = await callWith(T.globalPAT)
                after.statusCode.should.equal(200)
                forwardedTeams().should.containEql(dteam.hashid)
            } finally {
                await dteam.destroy()
                await app.db.controllers.Team.clearUserTeamsCache(app.user.id)
            }
        })

        it('flushes cached team values on a team-type feature change', async function () {
            const warm = await callWith(T.flipPAT)
            warm.statusCode.should.equal(200)
            forwardedTeams().should.deepEqual([T.flipTeam.hashid])

            const login = await app.inject({ method: 'POST', url: '/account/login', payload: { username: 'alice', password: 'aaPassword', remember: false } })
            const sid = login.cookies[0].value
            const put = await app.inject({
                method: 'PUT',
                url: `/api/v1/team-types/${T.flipType.hashid}`,
                cookies: { sid },
                payload: { properties: { instances: {}, devices: {}, users: {}, features: { ai: false } } }
            })
            put.statusCode.should.equal(200)

            const after = await callWith(T.flipPAT)
            after.statusCode.should.equal(200)
            const teams = forwardedTeams()
            teams.should.have.length(1)
            teams[0].should.not.equal(T.flipTeam.hashid)
        })
    })
})
