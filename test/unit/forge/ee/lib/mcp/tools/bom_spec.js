const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/bom')
const findTool = toolFinder(tools)

describe('MCP BOM Tools', function () {
    function stubInject (response = { statusCode: 200, json: () => ({}) }) {
        return sinon.stub().resolves(response)
    }

    const toolDefinitions = [
        {
            name: 'platform_get_team_bom',
            param: 'teamId',
            base: id => `/api/v1/teams/${id}/bom`,
            queryKeys: null
        },
        {
            name: 'platform_get_application_bom',
            param: 'applicationId',
            base: id => `/api/v1/applications/${id}/bom`,
            queryKeys: null
        }
    ]

    toolDefinitions.forEach(def => {
        describe(def.name, function () {
            it('is registered as a read-only, non-destructive tool', function () {
                const tool = findTool(def.name)
                tool.annotations.should.have.property('readOnlyHint', true)
                tool.annotations.should.have.property('destructiveHint', false)
            })

            it('exposes the expected inputSchema keys', function () {
                const tool = findTool(def.name)
                const expectedKeys = [def.param, ...(def.queryKeys || [])]
                Object.keys(tool.inputSchema).sort().should.deepEqual(expectedKeys.sort())
            })

            it('calls inject with the correct method and bare URL when no query params are given', async function () {
                const tool = findTool(def.name)
                const inject = stubInject()
                const args = { [def.param]: 'abc123' }

                await tool.handler(args, { inject })

                inject.calledOnce.should.be.true()
                const call = inject.firstCall.args[0]
                call.method.should.equal('GET')
                call.url.should.equal(def.base('abc123'))
            })
        })
    })

    describe('pass-through response handling', function () {
        it('returns the raw inject response unchanged, without intercepting 404s', async function () {
            const tool = findTool('platform_get_team_bom')
            const notFoundResponse = { statusCode: 404, json: () => ({ code: 'not_found', error: 'Not Found' }) }
            const inject = stubInject(notFoundResponse)

            const result = await tool.handler({ teamId: 'team1' }, { inject })

            result.should.equal(notFoundResponse)
        })
    })
})

describe('MCP BOM Tools - integration smoke', function () {
    const setup = require('../../../setup')

    let app
    let token

    before(async function () {
        app = await setup({
            ai: { enabled: true },
            expert: { enabled: true }
        })
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

    describe('tool-vs-route equivalence', function () {
        let team
        let application

        before(async function () {
            team = app.team
            application = app.application

            // Enable the plan-gated bom feature so equivalence tests hit the real 200, not the "disabled" guard.
            const defaultTeamTypeProperties = app.defaultTeamType.properties
            defaultTeamTypeProperties.features.bom = true
            app.defaultTeamType.properties = defaultTeamTypeProperties
            await app.defaultTeamType.save()
        })

        it('platform_get_team_bom matches GET /api/v1/teams/:teamId/bom', async function () {
            const tool = findTool('platform_get_team_bom')
            await expectToolMatchesRoute(inject, tool, { teamId: team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${team.hashid}/bom`
            })
        })

        it('platform_get_application_bom matches GET /api/v1/applications/:applicationId/bom', async function () {
            const tool = findTool('platform_get_application_bom')
            await expectToolMatchesRoute(inject, tool, { applicationId: application.hashid }, {
                method: 'GET',
                url: `/api/v1/applications/${application.hashid}/bom`
            })
        })
    })
})
