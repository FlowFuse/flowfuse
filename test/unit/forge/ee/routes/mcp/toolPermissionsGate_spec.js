require('should')

const setup = require('../../setup')

const LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'

const READ_TOOL = 'platform_list_remote_instances' // readOnlyHint: true -> read
const WRITE_TOOL = 'platform_create_remote_instance' // readOnlyHint: false, destructiveHint: false -> write
const DESTRUCTIVE_TOOL = 'platform_update_remote_instance_settings' // destructiveHint: true -> destructive

describe('MCP third-party tool permissions gate', function () {
    let app
    const TestObjects = {}

    before(async function () {
        app = await setup({
            license: LICENSE,
            ai: { enabled: true },
            expert: { enabled: true }
        })
        TestObjects.secondTeam = await app.factory.createTeam({ name: 'Second Team' })
        await TestObjects.secondTeam.addUser(app.user, { through: { role: app.factory.Roles.Roles.Owner } })
        TestObjects.application = await app.factory.createApplication({ name: 'Tool Permissions App' }, app.team)
    })

    after(async function () {
        await app.close()
    })

    function mcpHeaders (token, toolName, source = 'mcp') {
        const headers = { authorization: `Bearer ${token}` }
        if (source) {
            headers['x-ff-source-nonce'] = app.nonceStore.createSourceNonce({ source, toolName })
        }
        return headers
    }

    function listTeamDevices (token, toolName, source) {
        return app.inject({ method: 'GET', url: `/api/v1/teams/${app.team.hashid}/devices`, headers: mcpHeaders(token, toolName, source) })
    }

    function listApplicationDevices (token, toolName, source) {
        return app.inject({ method: 'GET', url: `/api/v1/applications/${TestObjects.application.hashid}/devices`, headers: mcpHeaders(token, toolName, source) })
    }

    function listMyTeams (token, toolName, source) {
        return app.inject({ method: 'GET', url: '/api/v1/user/teams', headers: mcpHeaders(token, toolName, source) })
    }

    async function tokenWith (toolPermissions) {
        const result = await app.db.controllers.AccessToken.createMCPOAuthToken(app.user.id, { teamIds: [], toolPermissions })
        return result.token
    }

    describe('per-team resolution', function () {
        let readWriteToken
        let readOnlyToken

        before(async function () {
            readWriteToken = await tokenWith({ default: { platform: { write: true } } })
            readOnlyToken = await tokenWith({ default: { platform: { read: true } } })
        })

        it('allows a read tool call when the default allows read', async function () {
            const response = await listTeamDevices(readOnlyToken, READ_TOOL)
            response.statusCode.should.equal(200)
        })

        it('denies a write tool call when the default only allows read', async function () {
            const response = await listTeamDevices(readOnlyToken, WRITE_TOOL)
            response.statusCode.should.equal(403)
            response.json().should.have.property('code', 'unauthorized')
        })

        it('allows a write tool call when the default allows write', async function () {
            const response = await listTeamDevices(readWriteToken, WRITE_TOOL)
            response.statusCode.should.equal(200)
        })

        it('denies a destructive tool call when the default does not allow destructive', async function () {
            const response = await listTeamDevices(readWriteToken, DESTRUCTIVE_TOOL)
            response.statusCode.should.equal(403)
        })

        it('resolves the team via an application, not just a team id', async function () {
            const allowed = await listApplicationDevices(readWriteToken, WRITE_TOOL)
            allowed.statusCode.should.equal(200)
            const denied = await listApplicationDevices(readOnlyToken, WRITE_TOOL)
            denied.statusCode.should.equal(403)
        })

        it('denies destructive on one team while a per-team override allows it on another', async function () {
            const token = await tokenWith({
                default: { platform: { write: true } },
                teams: { [TestObjects.secondTeam.hashid]: { platform: { destructive: true } } }
            })

            const onDefaultTeam = await listTeamDevices(token, DESTRUCTIVE_TOOL)
            onDefaultTeam.statusCode.should.equal(403)

            const onOverrideTeam = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.secondTeam.hashid}/devices`,
                headers: mcpHeaders(token, DESTRUCTIVE_TOOL)
            })
            onOverrideTeam.statusCode.should.equal(200)
        })
    })

    describe('routes with no team context', function () {
        it('allows the call when the default allows the category', async function () {
            const token = await tokenWith({ default: { platform: { read: true } } })
            const response = await listMyTeams(token, READ_TOOL)
            response.statusCode.should.equal(200)
        })

        it('allows the call when only a per-team override allows the category', async function () {
            const token = await tokenWith({
                default: {},
                teams: { [app.team.hashid]: { platform: { read: true } } }
            })
            const response = await listMyTeams(token, READ_TOOL)
            response.statusCode.should.equal(200)
        })

        it('denies the call when neither the default nor any override allows the category', async function () {
            const token = await tokenWith({ default: {} })
            const response = await listMyTeams(token, READ_TOOL)
            response.statusCode.should.equal(403)
        })
    })

    describe('other call sources', function () {
        it('does not gate a first-party Expert call even when permissions would deny it', async function () {
            const token = await tokenWith({ default: { platform: { read: true } } })
            const response = await listTeamDevices(token, WRITE_TOOL, 'mcp:expert')
            response.statusCode.should.equal(200)
        })

        it('does not gate a plain API PAT call even when permissions would deny it', async function () {
            const token = await tokenWith({ default: { platform: { read: true } } })
            const response = await listTeamDevices(token, WRITE_TOOL, null)
            response.statusCode.should.equal(200)
        })

        it('does not gate on an unrecognised tool name', async function () {
            const token = await tokenWith({ default: { platform: { read: true } } })
            const response = await listTeamDevices(token, 'not-a-real-tool')
            response.statusCode.should.equal(200)
        })
    })
})
