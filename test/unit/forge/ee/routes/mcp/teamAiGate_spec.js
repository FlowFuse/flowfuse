require('should')

const setup = require('../../setup')

const LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'

// The third-party MCP door forwards the caller's raw PAT and Forge enforces the
// PAT's own team scopes; the AI gate rides alongside that enforcement in
// needsPermission. These tests drive real team-scoped routes with a Bearer PAT
// and the source nonce the tool-exec layer stamps, so the source context reads
// as a third-party MCP call and the gate on the resolved team is exercised.
describe('MCP third-party per-team AI gate', function () {
    let app
    const TestObjects = {}

    before(async function () {
        app = await setup({
            license: LICENSE,
            ai: { enabled: true },
            expert: { enabled: true }
        })
        // An all-teams PAT: no team scopes, so Forge grants every team the user
        // belongs to. This is the case the door could not itself narrow.
        TestObjects.pat = await app.db.controllers.AccessToken.createPersonalAccessToken(app.user, '', null, 'ai-gate-pat')
        // An application in the same team, to exercise a route that resolves the
        // team via the application rather than setting request.team directly.
        TestObjects.application = await app.factory.createApplication({ name: 'AI Gate App' }, app.team)
    })

    after(async function () {
        await app.close()
    })

    async function setTeamAi (enabled) {
        const properties = { ...(app.team.properties || {}) }
        properties.features = { ...(properties.features || {}), ai: enabled }
        app.team.properties = properties
        await app.team.save()
    }

    // Fresh nonce per call: nonces are single-use. Omit source to send a plain
    // PAT request, which the auth layer classifies as source 'api'.
    function mcpHeaders (source) {
        const headers = { authorization: `Bearer ${TestObjects.pat.token}` }
        if (source) {
            headers['x-ff-source-nonce'] = app.nonceStore.createSourceNonce({ source, toolName: 'test-tool' })
        }
        return headers
    }

    function listTeamDevices (source) {
        return app.inject({ method: 'GET', url: `/api/v1/teams/${app.team.hashid}/devices`, headers: mcpHeaders(source) })
    }

    function listApplicationDevices (source) {
        return app.inject({ method: 'GET', url: `/api/v1/applications/${TestObjects.application.hashid}/devices`, headers: mcpHeaders(source) })
    }

    it('blocks a third-party MCP call to a team with AI disabled', async function () {
        await setTeamAi(false)
        const response = await listTeamDevices('mcp')
        response.statusCode.should.equal(403)
        response.json().should.have.property('code', 'unauthorized')
        response.json().should.have.property('error', 'AI features are disabled for this team')
    })

    it('allows a third-party MCP call to a team with AI enabled', async function () {
        await setTeamAi(true)
        const response = await listTeamDevices('mcp')
        response.statusCode.should.equal(200)
    })

    it('does not gate a normal API PAT call to a team with AI disabled', async function () {
        await setTeamAi(false)
        const response = await listTeamDevices()
        response.statusCode.should.equal(200)
    })

    it('does not gate a first-party Expert call to a team with AI disabled', async function () {
        await setTeamAi(false)
        const response = await listTeamDevices('mcp:expert')
        response.statusCode.should.equal(200)
    })

    it('blocks a third-party MCP call whose team is resolved via an application, not a team id', async function () {
        await setTeamAi(false)
        const response = await listApplicationDevices('mcp')
        response.statusCode.should.equal(403)
    })

    it('allows the same application-scoped call once AI is enabled', async function () {
        await setTeamAi(true)
        const response = await listApplicationDevices('mcp')
        response.statusCode.should.equal(200)
    })
})
