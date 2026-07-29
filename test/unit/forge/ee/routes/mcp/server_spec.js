const should = require('should')

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

        describe('Feature flag', function () {
            it('should register the expertPlatformAutomation feature flag', async function () {
                app.config.features.enabled('expertPlatformAutomation').should.equal(true)
            })
        })

        describe('HTTP endpoints are disabled', function () {
            it('should return 405 for POST', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/mcp',
                    headers: {
                        authorization: `Bearer ${TestObjects.alicePAT.token}`
                    },
                    payload: { jsonrpc: '2.0', method: 'initialize', id: 1 }
                })
                response.statusCode.should.equal(405)
            })

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
