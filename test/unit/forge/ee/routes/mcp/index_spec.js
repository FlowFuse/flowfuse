const should = require('should') // eslint-disable-line
const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')

describe.only('MCP Server Registration', function () {
    let app
    const TestObjects = { tokens: {} }

    before(async function () {
        const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'
        app = await setup({ license })
    })

    after(async function () {
        await app.close()
    })

    it('should create new MCP entry', async function () {
        const { token } = await app.instance.refreshAuthTokens()
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/teams/${app.team.hashid}/mcp/instance/${app.instance.hashid}`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: {
                name: 'foo',
                protocol: 'http',
                endpointRoute: '/mcp'
            }
        })
        response.statusCode.should.equal(200)

        const mcpServer = await app.db.models.MCPRegistration.byTypeAndID('instance', app.instance.hashid)
        should.exist(mcpServer)
        mcpServer.name.should.equal('foo')
        mcpServer.protocol.should.equal('http')
        mcpServer.endpointRoute.should.equal('/mcp')
    })
    it('should delete MCP entry', async function () {
        const { token } = await app.instance.refreshAuthTokens()
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/teams/${app.team.hashid}/mcp/instance/${app.instance.hashid}`,
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        response.statusCode.should.equal(200)
        const mcpServer = await app.db.models.MCPRegistration.byTypeAndID('instance', app.instance.hashid)
        should.not.exist(mcpServer)
    })
})