require('should')

const setup = require('../../setup')

const LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'

// Same gate as teamAiGate_spec.js, but for the team's own MCP toggle (Team Settings ->
// Danger -> MCP Access / features.mcpThirdParty) rather than the AI toggle. Both checks
// live side by side in needsPermission (forge/routes/auth/permissions.js).
describe('MCP third-party per-team MCP access gate', function () {
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
        TestObjects.pat = await app.db.controllers.AccessToken.createPersonalAccessToken(app.user, '', null, 'mcp-gate-pat')
    })

    after(async function () {
        await app.close()
    })

    async function setTeamMcpThirdParty (enabled) {
        const properties = { ...(app.team.properties || {}) }
        properties.features = { ...(properties.features || {}), mcpThirdParty: enabled }
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

    it('blocks a third-party MCP call to a team with MCP access disabled', async function () {
        await setTeamMcpThirdParty(false)
        const response = await listTeamDevices('mcp')
        response.statusCode.should.equal(403)
        response.json().should.have.property('code', 'unauthorized')
        response.json().should.have.property('error', 'MCP access is disabled for this team')
        response.json().should.have.property('hint', 'A team owner can re-enable MCP access from Team Settings > Danger Zone.')
    })

    it('allows a third-party MCP call to a team with MCP access enabled', async function () {
        await setTeamMcpThirdParty(true)
        const response = await listTeamDevices('mcp')
        response.statusCode.should.equal(200)
    })

    it('does not gate a normal API PAT call to a team with MCP access disabled', async function () {
        await setTeamMcpThirdParty(false)
        const response = await listTeamDevices()
        response.statusCode.should.equal(200)
    })

    it('does not gate a first-party Expert call to a team with MCP access disabled', async function () {
        await setTeamMcpThirdParty(false)
        const response = await listTeamDevices('mcp:expert')
        response.statusCode.should.equal(200)
    })
})
