const should = require('should') // eslint-disable-line no-unused-vars

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/members')
const findTool = toolFinder(tools)

describe('MCP members tools', function () {
    it('exposes exactly the expected tool names', function () {
        tools.map(t => t.name).should.eql([
            'platform_get_team_membership',
            'platform_list_team_members',
            'platform_list_team_invitations'
        ])
    })

    it('every tool is annotated as read-only and non-destructive', function () {
        tools.forEach(tool => {
            tool.annotations.should.have.property('readOnlyHint', true)
            tool.annotations.should.have.property('destructiveHint', false)
        })
    })

    describe('platform_get_team_membership', function () {
        const tool = findTool('platform_get_team_membership')

        it('has the teamId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET /api/v1/teams/:teamId/user', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/user')
        })
    })

    describe('platform_list_team_members', function () {
        const tool = findTool('platform_list_team_members')

        it('has the teamId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET /api/v1/teams/:teamId/members', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/members')
        })
    })

    describe('platform_list_team_invitations', function () {
        const tool = findTool('platform_list_team_invitations')

        it('has the teamId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET /api/v1/teams/:teamId/invitations', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/invitations')
        })
    })
})

describe('MCP members tools smoke test', function () {
    const setup = require('../../../setup')

    let app
    let token

    before(async function () {
        app = await setup({ ai: { enabled: true }, expert: { enabled: true } })
        token = await createExpertMcpToken(app)
    })

    after(async function () {
        await app.close()
    })

    function inject (options) {
        return app.inject({
            ...options,
            headers: {
                ...(options.headers || {}),
                authorization: `Bearer ${token}`
            }
        })
    }

    describe('tool responses match their backing routes', function () {
        it('platform_get_team_membership matches GET /api/v1/teams/:teamId/user', async function () {
            const tool = findTool('platform_get_team_membership')
            await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/user`
            })
        })

        it('platform_list_team_members matches GET /api/v1/teams/:teamId/members', async function () {
            const tool = findTool('platform_list_team_members')
            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/members`
            })
            routeResponse.statusCode.should.equal(200)
            routeResponse.json().members.should.not.be.empty()
        })

        it('platform_list_team_invitations matches GET /api/v1/teams/:teamId/invitations', async function () {
            const bob = await app.factory.createUser({
                admin: false,
                username: 'bob-invitee',
                name: 'Bob Invitee',
                email: 'bob-invitee@example.com',
                password: 'bbPassword'
            })
            await app.factory.createInvitation(app.team, app.user, bob)

            const tool = findTool('platform_list_team_invitations')
            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/invitations`
            })
            routeResponse.statusCode.should.equal(200)
            routeResponse.json().invitations.should.not.be.empty()
        })
    })
})
