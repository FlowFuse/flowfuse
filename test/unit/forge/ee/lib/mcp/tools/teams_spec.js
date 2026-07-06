const should = require('should') // eslint-disable-line no-unused-vars

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/teams')
const findTool = toolFinder(tools)

describe('MCP teams tools', function () {
    it('exposes exactly the expected tool names', function () {
        tools.map(t => t.name).should.eql([
            'platform_list_teams',
            'platform_get_team',
            'platform_get_team_by_slug',
            'platform_list_team_projects',
            'platform_list_team_application_statuses',
            'platform_list_team_dashboard_instances',
            'platform_get_team_instance_counts',
            'platform_list_team_provisioning_tokens',
            'platform_list_team_types',
            'platform_get_team_type',
            'platform_check_team_slug_availability'
        ])
    })

    it('every tool is annotated as read-only and non-destructive', function () {
        tools.forEach(tool => {
            tool.annotations.should.have.property('readOnlyHint', true)
            tool.annotations.should.have.property('destructiveHint', false)
        })
    })

    describe('platform_list_teams', function () {
        const tool = findTool('platform_list_teams')

        it('has no input params', function () {
            Object.keys(tool.inputSchema).should.eql([])
        })

        it('calls GET /api/v1/user/teams', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({}, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/user/teams')
        })
    })

    describe('platform_get_team', function () {
        const tool = findTool('platform_get_team')

        it('has the teamId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET /api/v1/teams/:teamId', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1')
        })
    })

    describe('platform_get_team_by_slug', function () {
        const tool = findTool('platform_get_team_by_slug')

        it('has the teamSlug input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamSlug'])
        })

        it('calls GET /api/v1/teams/slug/:teamSlug', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamSlug: 'my-team' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/slug/my-team')
        })
    })

    describe('platform_list_team_projects', function () {
        const tool = findTool('platform_list_team_projects')

        it('has the expected input params', function () {
            Object.keys(tool.inputSchema).should.eql([
                'teamId', 'query', 'sort', 'dir', 'includeMeta', 'orderByMostRecentFlows', 'limit', 'page'
            ])
        })

        it('calls GET with only the supported, defined params serialised', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', sort: 'name', dir: 'desc', limit: 10 }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/projects?sort=name&dir=desc&limit=10')
        })

        it('url-encodes a query value with special characters', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', query: 'a b&c=d' }, { inject })
            calls[0].url.should.equal('/api/v1/teams/team1/projects?query=a+b%26c%3Dd')
        })
    })

    describe('platform_list_team_application_statuses', function () {
        const tool = findTool('platform_list_team_application_statuses')

        it('has the expected input params', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId', 'associationsLimit'])
        })

        it('calls GET /api/v1/teams/:teamId/applications/status with associationsLimit', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', associationsLimit: 5 }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/applications/status?associationsLimit=5')
        })

        it('omits the query string when associationsLimit is not set', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls[0].url.should.equal('/api/v1/teams/team1/applications/status')
        })
    })

    describe('platform_list_team_dashboard_instances', function () {
        const tool = findTool('platform_list_team_dashboard_instances')

        it('has the teamId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET /api/v1/teams/:teamId/dashboard-instances', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/dashboard-instances')
        })
    })

    describe('platform_get_team_instance_counts', function () {
        const tool = findTool('platform_get_team_instance_counts')

        it('has the expected input params', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId', 'instanceType', 'state', 'applicationId'])
        })

        it('serialises a state array as repeated params', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', instanceType: 'hosted', state: ['running', 'stopped'] }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/instance-counts?instanceType=hosted&state=running&state=stopped')
        })

        it('includes applicationId when set and omits state when not provided', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', instanceType: 'remote', applicationId: 'app1' }, { inject })
            calls[0].url.should.equal('/api/v1/teams/team1/instance-counts?instanceType=remote&applicationId=app1')
        })
    })

    describe('platform_list_team_provisioning_tokens', function () {
        const tool = findTool('platform_list_team_provisioning_tokens')

        it('has the teamId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET /api/v1/teams/:teamId/devices/provisioning', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/devices/provisioning')
        })
    })

    describe('platform_list_team_types', function () {
        const tool = findTool('platform_list_team_types')

        it('has pagination plus search and filter params', function () {
            Object.keys(tool.inputSchema).should.eql(['cursor', 'limit', 'query', 'filter'])
        })

        it('calls GET /api/v1/team-types', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ cursor: 'abc' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/team-types?cursor=abc')
        })

        it('serialises search and filter params', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ query: 'starter', filter: 'active' }, { inject })
            calls[0].url.should.equal('/api/v1/team-types?query=starter&filter=active')
        })
    })

    describe('platform_get_team_type', function () {
        const tool = findTool('platform_get_team_type')

        it('has the teamTypeId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamTypeId'])
        })

        it('calls GET /api/v1/team-types/:teamTypeId', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamTypeId: 'tt1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/team-types/tt1')
        })
    })

    describe('platform_check_team_slug_availability', function () {
        const tool = findTool('platform_check_team_slug_availability')

        it('has the slug input', function () {
            Object.keys(tool.inputSchema).should.eql(['slug'])
        })

        it('calls POST /api/v1/teams/check-slug with the slug payload', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ slug: 'my-team' }, { inject })
            calls[0].method.should.equal('POST')
            calls[0].url.should.equal('/api/v1/teams/check-slug')
            calls[0].payload.should.eql({ slug: 'my-team' })
        })
    })
})

describe('MCP teams tools smoke test', function () {
    const setup = require('../../../setup')

    let app
    let token

    before(async function () {
        app = await setup({ ai: { enabled: true }, expert: { enabled: true } })
        // check-slug requires 'team:create', gated behind this setting for non-admin callers like the expert-mcp token below
        await app.settings.set('team:create', true)
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

    it('lists the seeded team projects/instances', async function () {
        const tool = findTool('platform_list_team_projects')
        const response = await tool.handler({ teamId: app.team.hashid }, { inject })
        response.statusCode.should.equal(200)
        const body = response.json()
        body.should.have.property('count', 1)
        body.should.have.property('projects')
        body.projects.should.be.an.Array()
        body.projects.should.have.length(1)
        body.projects[0].should.have.property('name', app.instance.name)
    })

    describe('tool responses match their backing routes', function () {
        it('platform_list_teams matches GET /api/v1/user/teams', async function () {
            const tool = findTool('platform_list_teams')
            await expectToolMatchesRoute(inject, tool, {}, {
                method: 'GET',
                url: '/api/v1/user/teams'
            })
        })

        it('platform_get_team matches GET /api/v1/teams/:teamId', async function () {
            const tool = findTool('platform_get_team')
            await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}`
            })
        })

        it('platform_get_team_by_slug matches GET /api/v1/teams/slug/:teamSlug', async function () {
            const tool = findTool('platform_get_team_by_slug')
            await expectToolMatchesRoute(inject, tool, { teamSlug: app.team.slug }, {
                method: 'GET',
                url: `/api/v1/teams/slug/${app.team.slug}`
            })
        })

        it('platform_list_team_projects matches GET /api/v1/teams/:teamId/projects', async function () {
            const tool = findTool('platform_list_team_projects')
            await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/projects`
            })
        })

        it('platform_list_team_application_statuses matches GET /api/v1/teams/:teamId/applications/status', async function () {
            const tool = findTool('platform_list_team_application_statuses')
            await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/applications/status`
            })
        })

        it('platform_list_team_dashboard_instances matches GET /api/v1/teams/:teamId/dashboard-instances', async function () {
            // Seed in the PAT user's own team, since the route's per-application RBAC check needs real membership
            const dashboardApplication = await app.factory.createApplication({ name: 'dashboard-application' }, app.team)
            await app.factory.createInstance(
                { name: 'dashboard-instance' },
                dashboardApplication,
                app.stack,
                app.template,
                app.projectType,
                {
                    start: false,
                    settings: {
                        palette: { modules: [{ name: '@flowfuse/node-red-dashboard', version: '~1.15.0', local: true }] }
                    }
                }
            )

            const tool = findTool('platform_list_team_dashboard_instances')
            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/dashboard-instances`
            })
            routeResponse.statusCode.should.equal(200)
            routeResponse.json().projects.should.have.length(1)
        })

        it('platform_get_team_instance_counts matches GET /api/v1/teams/:teamId/instance-counts', async function () {
            const tool = findTool('platform_get_team_instance_counts')
            await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid, instanceType: 'hosted' }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/instance-counts?instanceType=hosted`
            })
        })

        it('platform_list_team_provisioning_tokens matches GET /api/v1/teams/:teamId/devices/provisioning', async function () {
            await app.db.controllers.AccessToken.createTokenForTeamDeviceProvisioning('equivalence-test-token', app.team)

            const tool = findTool('platform_list_team_provisioning_tokens')
            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/devices/provisioning`
            })
            routeResponse.statusCode.should.equal(200)
            routeResponse.json().tokens.should.not.be.empty()
        })

        it('platform_list_team_types matches GET /api/v1/team-types', async function () {
            const tool = findTool('platform_list_team_types')
            await expectToolMatchesRoute(inject, tool, {}, {
                method: 'GET',
                url: '/api/v1/team-types'
            })
        })

        it('platform_get_team_type matches GET /api/v1/team-types/:teamTypeId', async function () {
            const tool = findTool('platform_get_team_type')
            await expectToolMatchesRoute(inject, tool, { teamTypeId: app.defaultTeamType.hashid }, {
                method: 'GET',
                url: `/api/v1/team-types/${app.defaultTeamType.hashid}`
            })
        })

        it('platform_check_team_slug_availability matches POST /api/v1/teams/check-slug for an available slug', async function () {
            const tool = findTool('platform_check_team_slug_availability')
            await expectToolMatchesRoute(inject, tool, { slug: 'a-brand-new-team-slug' }, {
                method: 'POST',
                url: '/api/v1/teams/check-slug',
                payload: { slug: 'a-brand-new-team-slug' }
            })
        })

        it('platform_check_team_slug_availability matches POST /api/v1/teams/check-slug for a taken slug', async function () {
            const tool = findTool('platform_check_team_slug_availability')
            const { viaTool } = await expectToolMatchesRoute(inject, tool, { slug: app.team.slug }, {
                method: 'POST',
                url: '/api/v1/teams/check-slug',
                payload: { slug: app.team.slug }
            })
            viaTool.statusCode.should.equal(409)
        })
    })
})
