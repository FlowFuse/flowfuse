const should = require('should') // eslint-disable-line no-unused-vars

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/deviceGroups')

const findTool = toolFinder(tools)

describe('MCP Tools: deviceGroups', function () {
    describe('platform_list_application_device_groups', function () {
        const tool = findTool('platform_list_application_device_groups')

        it('should be registered', function () {
            should.exist(tool)
        })

        it('should be read-only and non-destructive', function () {
            tool.annotations.should.have.property('readOnlyHint', true)
            tool.annotations.should.have.property('destructiveHint', false)
        })

        it('should declare the expected input schema keys', function () {
            Object.keys(tool.inputSchema).should.containDeep(['applicationId', 'cursor', 'limit', 'query'])
        })

        it('should GET the application device-groups endpoint', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ applicationId: 'app123' }, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', '/api/v1/applications/app123/device-groups')
        })

        it('should serialise the pagination query params onto the url', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({
                applicationId: 'app123',
                cursor: 'abc',
                limit: 10,
                query: 'foo bar'
            }, { inject })
            calls[0].url.should.equal('/api/v1/applications/app123/device-groups?cursor=abc&limit=10&query=foo+bar')
        })
    })

    describe('platform_get_application_device_group', function () {
        const tool = findTool('platform_get_application_device_group')

        it('should be registered', function () {
            should.exist(tool)
        })

        it('should be read-only and non-destructive', function () {
            tool.annotations.should.have.property('readOnlyHint', true)
            tool.annotations.should.have.property('destructiveHint', false)
        })

        it('should declare the expected input schema keys', function () {
            Object.keys(tool.inputSchema).should.containDeep(['applicationId', 'groupId'])
        })

        it('should GET the single device-group endpoint', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ applicationId: 'app123', groupId: 'group456' }, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', '/api/v1/applications/app123/device-groups/group456')
        })
    })

    describe('platform_list_team_device_groups', function () {
        const tool = findTool('platform_list_team_device_groups')

        it('should be registered', function () {
            should.exist(tool)
        })

        it('should be read-only and non-destructive', function () {
            tool.annotations.should.have.property('readOnlyHint', true)
            tool.annotations.should.have.property('destructiveHint', false)
        })

        it('should declare the expected input schema keys', function () {
            Object.keys(tool.inputSchema).should.containDeep(['teamId', 'cursor', 'limit', 'query'])
        })

        it('should GET the team device-groups endpoint', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team789' }, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', '/api/v1/teams/team789/device-groups')
        })

        it('should serialise the pagination query params onto the url', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team789', limit: 5, query: 'fleet' }, { inject })
            calls[0].url.should.equal('/api/v1/teams/team789/device-groups?limit=5&query=fleet')
        })
    })

    describe('integration smoke', function () {
        const setup = require('../../../setup')

        let app
        let token

        before(async function () {
            app = await setup({ ai: { enabled: true }, expert: { enabled: true } })

            // Device groups are off by default; enable the feature flag so the smoke test hits the real route
            const defaultTeamTypeProperties = app.defaultTeamType.properties
            defaultTeamTypeProperties.features.deviceGroups = true
            app.defaultTeamType.properties = defaultTeamTypeProperties
            await app.defaultTeamType.save()

            token = await createExpertMcpToken(app)
        })

        after(async function () {
            await app.close()
        })

        it('should list an application\'s device groups through the real route', async function () {
            const inject = (options) => app.inject({
                ...options,
                headers: { ...(options.headers || {}), authorization: `Bearer ${token}` }
            })

            const tool = findTool('platform_list_application_device_groups')
            const response = await tool.handler({ applicationId: app.application.hashid }, { inject })

            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('count', 0)
            body.should.have.property('groups')
            body.groups.should.be.an.Array()
            body.groups.should.have.length(0)
        })

        it('should return the same response as the application device-groups route for a populated application', async function () {
            const inject = (options) => app.inject({
                ...options,
                headers: { ...(options.headers || {}), authorization: `Bearer ${token}` }
            })

            const application = await app.factory.createApplication({ name: 'mcp-tool-app-device-groups' }, app.team)
            await app.factory.createApplicationDeviceGroup({ name: 'mcp-tool-group-1', description: 'group one' }, application)
            await app.factory.createApplicationDeviceGroup({ name: 'mcp-tool-group-2', description: 'group two' }, application)

            const tool = findTool('platform_list_application_device_groups')

            const { routeResponse } = await expectToolMatchesRoute(
                inject,
                tool,
                { applicationId: application.hashid },
                { method: 'GET', url: `/api/v1/applications/${application.hashid}/device-groups` }
            )

            const body = routeResponse.json()
            body.should.have.property('count', 2)
            body.groups.should.have.length(2)
        })

        it('should return the same response as the team device-groups route for a populated team', async function () {
            const inject = (options) => app.inject({
                ...options,
                headers: { ...(options.headers || {}), authorization: `Bearer ${token}` }
            })

            const application = await app.factory.createApplication({ name: 'mcp-tool-team-device-groups' }, app.team)
            await app.factory.createApplicationDeviceGroup({ name: 'mcp-tool-team-group-1', description: 'team group one' }, application)

            const tool = findTool('platform_list_team_device_groups')

            const { routeResponse } = await expectToolMatchesRoute(
                inject,
                tool,
                { teamId: app.team.hashid },
                { method: 'GET', url: `/api/v1/teams/${app.team.hashid}/device-groups` }
            )

            const body = routeResponse.json()
            body.should.have.property('count')
            body.count.should.be.greaterThanOrEqual(1)
            body.groups.should.matchAny(g => g.name === 'mcp-tool-team-group-1')
        })
    })
})
