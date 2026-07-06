const should = require('should') // eslint-disable-line no-unused-vars

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')
const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/search')
const findTool = toolFinder(tools)

describe('MCP Search Tools', function () {
    const cases = [
        { name: 'platform_search_team_resources', path: '/api/v1/search' },
        { name: 'platform_search_instances', path: '/api/v1/search/instances' }
    ]

    cases.forEach(({ name, path }) => {
        describe(name, function () {
            const tool = findTool(name)

            it('should be registered', function () {
                should.exist(tool)
            })

            it('should be read-only and non-destructive', function () {
                tool.annotations.should.have.property('readOnlyHint', true)
                tool.annotations.should.have.property('destructiveHint', false)
            })

            it('should declare teamId and query in its input schema', function () {
                tool.inputSchema.should.have.only.keys('teamId', 'query')
            })

            it('should issue a GET request against the expected route with team and query', async function () {
                const { calls, inject } = recordingInject({ statusCode: 200, json: () => ({ count: 0, results: [] }) })
                await tool.handler({ teamId: 'team1', query: 'foo' }, { inject })

                calls.should.have.length(1)
                calls[0].method.should.equal('GET')
                calls[0].url.should.equal(`${path}?team=team1&query=foo`)
            })

            it('should URL-encode special characters in the query', async function () {
                const { calls, inject } = recordingInject({ statusCode: 200, json: () => ({ count: 0, results: [] }) })
                await tool.handler({ teamId: 'team1', query: 'a b&c' }, { inject })

                calls[0].url.should.equal(`${path}?team=team1&query=a+b%26c`)
            })
        })
    })

    describe('Integration smoke test', function () {
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

        const inject = (options) => app.inject({
            ...options,
            headers: {
                ...(options.headers || {}),
                authorization: `Bearer ${token}`
            }
        })

        it('should search team resources and find the seeded application/instance', async function () {
            const tool = findTool('platform_search_team_resources')
            const response = await tool.handler({ teamId: app.team.hashid, query: 'project' }, { inject })

            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('count')
            body.should.have.property('results')
            body.results.should.be.an.Array()
            body.count.should.equal(body.results.length)
            body.results.length.should.be.above(0)
        })

        it('platform_search_team_resources matches the /api/v1/search route it is documented to call', async function () {
            const tool = findTool('platform_search_team_resources')
            const teamHashId = app.team.hashid
            const { routeResponse } = await expectToolMatchesRoute(
                inject,
                tool,
                { teamId: teamHashId, query: 'application-1' },
                { method: 'GET', url: `/api/v1/search?team=${teamHashId}&query=application-1` }
            )

            // Ensure the fixture has non-trivial data, so a {count:0}==={count:0} regression isn't mistaken for a pass.
            routeResponse.statusCode.should.equal(200)
            const body = routeResponse.json()
            body.count.should.be.above(0)
            body.results.some(r => r.object === 'application').should.be.true()
        })

        it('platform_search_instances matches the /api/v1/search/instances route it is documented to call', async function () {
            const tool = findTool('platform_search_instances')
            const teamHashId = app.team.hashid
            const { routeResponse } = await expectToolMatchesRoute(
                inject,
                tool,
                { teamId: teamHashId, query: 'project' },
                { method: 'GET', url: `/api/v1/search/instances?team=${teamHashId}&query=project` }
            )

            routeResponse.statusCode.should.equal(200)
            const body = routeResponse.json()
            body.count.should.be.above(0)
            body.results.some(r => r.instanceType === 'hosted').should.be.true()
        })
    })
})
