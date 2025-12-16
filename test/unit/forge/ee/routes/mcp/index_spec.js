const should = require('should') // eslint-disable-line
const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('MCP Server Registration', function () {
    let app
    const TestObjects = { tokens: {} }

    before(async function () {
        const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'
        app = await setup({ license })

        await login('alice', 'aaPassword')

        const userBob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        await app.team.addUser(userBob, { through: { role: Roles.Owner } })
        // Run all the tests with bob - non-admin Team Owner
        await login('bob', 'bbPassword')
    })

    after(async function () {
        await app.close()
    })

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    it('should create new MCP entry', async function () {
        const { token } = await app.instance.refreshAuthTokens()
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/teams/${app.team.hashid}/mcp/instance/${app.instance.hashid}/abcde`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: {
                name: 'foo',
                protocol: 'http',
                endpointRoute: '/mcp',
                mcpName: 'flowfuse-mcp',
                mcpTitle: 'FlowFuse MCP',
                mcpVersion: '1.2.3',
                description: 'Test MCP registration entry'
            }
        })
        response.statusCode.should.equal(200)

        const mcpServer = await app.db.models.MCPRegistration.byTypeAndIDs('instance', app.instance.hashid, 'abcde')
        should.exist(mcpServer)
        mcpServer.name.should.equal('foo')
        mcpServer.protocol.should.equal('http')
        mcpServer.endpointRoute.should.equal('/mcp')
        mcpServer.mcpName.should.equal('flowfuse-mcp')
        mcpServer.mcpTitle.should.equal('FlowFuse MCP')
        mcpServer.mcpVersion.should.equal('1.2.3')
        mcpServer.description.should.equal('Test MCP registration entry')
    })
    it('should create MCP entry with defaults for optional MCP metadata', async function () {
        const { token } = await app.instance.refreshAuthTokens()
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/teams/${app.team.hashid}/mcp/instance/${app.instance.hashid}/vwxyz`,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: {
                name: 'bar',
                protocol: 'http',
                endpointRoute: '/mcp2'
            }
        })
        response.statusCode.should.equal(200)

        const mcpServer = await app.db.models.MCPRegistration.byTypeAndIDs('instance', app.instance.hashid, 'vwxyz')
        should.exist(mcpServer)
        mcpServer.name.should.equal('bar')
        mcpServer.protocol.should.equal('http')
        mcpServer.endpointRoute.should.equal('/mcp2')
        // Defaults from model
        mcpServer.mcpName.should.equal('')
        mcpServer.mcpTitle.should.equal('')
        mcpServer.mcpVersion.should.equal('1.0.0')
        mcpServer.description.should.equal('')
    })
    it('should list MCP entries', async function () {
        const { token } = await app.instance.refreshAuthTokens()
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/teams/${app.team.hashid}/mcp`,
            headers: {
                Authorization: `Bearer ${token}`
            },
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(200)
        const result = response.json()
        result.should.be.an.Object()
        result.should.have.property('count', 2)
        result.should.have.property('servers')
        result.servers.should.be.an.Array()
        result.servers.should.have.length(2)
        const names = result.servers.map(s => s.name)
        names.should.containEql('foo')
        names.should.containEql('bar')
        const routes = result.servers.map(s => s.endpointRoute)
        routes.should.containEql('/mcp')
        routes.should.containEql('/mcp2')
        const protocols = result.servers.map(s => s.protocol)
        protocols.should.containEql('http')
    })
    it('should delete MCP entry', async function () {
        const { token } = await app.instance.refreshAuthTokens()
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/teams/${app.team.hashid}/mcp/instance/${app.instance.hashid}/abcde`,
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        response.statusCode.should.equal(200)
        const mcpServer = await app.db.models.MCPRegistration.byTypeAndIDs('instance', app.instance.hashid, 'abcde')
        should.not.exist(mcpServer)
    })
})
