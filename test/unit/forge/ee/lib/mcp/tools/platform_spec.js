const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/platform')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Platform Catalog Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_hosted_instance_types', function () {
        const tool = getTool('platform_list_hosted_instance_types')

        it('decorates each type with availability, creatable flags and its stacks', async function () {
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1' }).resolves({
                statusCode: 200,
                json: () => ({
                    properties: { instances: { type1: { active: true } } },
                    type: { properties: {} },
                    instanceCountByType: {}
                })
            })
            inject.withArgs({ method: 'GET', url: '/api/v1/project-types' }).resolves({
                statusCode: 200,
                json: () => ({ types: [{ id: 'type1', name: 'small' }] })
            })
            inject.withArgs({ method: 'GET', url: '/api/v1/stacks?projectType=type1' }).resolves({
                statusCode: 200,
                json: () => ({ stacks: [{ id: 'stack1', name: 'v3' }] })
            })

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            response.should.eql({
                types: [
                    {
                        id: 'type1',
                        name: 'small',
                        available: true,
                        creatable: true,
                        stacks: [{ id: 'stack1', name: 'v3' }]
                    }
                ]
            })
        })

        it('includes non-creatable types when creatableOnly is false', async function () {
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1' }).resolves({
                statusCode: 200,
                json: () => ({ properties: {}, type: { properties: {} }, instanceCountByType: {} })
            })
            inject.withArgs({ method: 'GET', url: '/api/v1/project-types' }).resolves({
                statusCode: 200,
                json: () => ({ types: [{ id: 'type1', name: 'small' }] })
            })
            inject.withArgs({ method: 'GET', url: '/api/v1/stacks?projectType=type1' }).resolves({
                statusCode: 200,
                json: () => ({ stacks: [] })
            })

            const response = await tool.handler({ teamId: 'team1', creatableOnly: false }, { inject })

            response.types.should.have.length(1)
            response.types[0].available.should.be.false()
            response.types[0].creatable.should.be.false()
        })

        it('excludes non-creatable types by default', async function () {
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1' }).resolves({
                statusCode: 200,
                json: () => ({ properties: {}, type: { properties: {} }, instanceCountByType: {} })
            })
            inject.withArgs({ method: 'GET', url: '/api/v1/project-types' }).resolves({
                statusCode: 200,
                json: () => ({ types: [{ id: 'type1', name: 'small' }] })
            })

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            response.types.should.have.length(0)
        })

        it('narrows to a single type when projectType is set', async function () {
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1' }).resolves({
                statusCode: 200,
                json: () => ({
                    properties: { instances: { type1: { active: true }, type2: { active: true } } },
                    type: { properties: {} },
                    instanceCountByType: {}
                })
            })
            inject.withArgs({ method: 'GET', url: '/api/v1/project-types' }).resolves({
                statusCode: 200,
                json: () => ({ types: [{ id: 'type1', name: 'small' }, { id: 'type2', name: 'large' }] })
            })
            inject.withArgs({ method: 'GET', url: '/api/v1/stacks?projectType=type1' }).resolves({
                statusCode: 200,
                json: () => ({ stacks: [] })
            })

            const response = await tool.handler({ teamId: 'team1', projectType: 'type1' }, { inject })

            response.types.should.have.length(1)
            response.types[0].id.should.equal('type1')
        })

        it('passes the team fetch error response through untouched', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1' }).resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            response.should.equal(errorResponse)
        })

        it('passes the project-types fetch error response through untouched', async function () {
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1' }).resolves({
                statusCode: 200,
                json: () => ({ properties: {}, type: { properties: {} }, instanceCountByType: {} })
            })
            inject.withArgs({ method: 'GET', url: '/api/v1/project-types' }).resolves({
                statusCode: 500,
                json: () => ({ code: 'unexpected_error' })
            })

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            response.statusCode.should.equal(500)
            response.json().should.eql({ code: 'unexpected_error' })
        })
    })

    describe('platform_list_team_types', function () {
        const tool = getTool('platform_list_team_types')

        it('serialises pagination, search and filter onto the team-types route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ teamTypes: [] }) }
            inject.withArgs({
                method: 'GET',
                url: '/api/v1/team-types?cursor=c1&limit=20&query=ent&filter=active'
            }).resolves(routeResponse)

            const response = await tool.handler({
                cursor: 'c1',
                limit: 20,
                query: 'ent',
                filter: 'active'
            }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 500, json: () => ({ code: 'unexpected_error' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ limit: 10 }, { inject })

            response.should.equal(errorResponse)
        })
    })

    // Simple GET readers: each injects one URL and returns the response verbatim.
    const passthroughGetTools = [
        { name: 'platform_list_templates', args: {}, url: '/api/v1/templates' },
        { name: 'platform_list_blueprints', args: {}, url: '/api/v1/flow-blueprints' },
        { name: 'platform_get_template', args: { templateId: 'tmpl1' }, url: '/api/v1/templates/tmpl1' },
        { name: 'platform_get_team_type', args: { teamTypeId: 'tt1' }, url: '/api/v1/team-types/tt1' }
    ]

    passthroughGetTools.forEach(({ name, args, url }) => {
        describe(name, function () {
            const tool = getTool(name)

            it(`injects GET ${url} and returns the response`, async function () {
                const routeResponse = { statusCode: 200, json: () => ({ ok: true }) }
                inject.withArgs({ method: 'GET', url }).resolves(routeResponse)

                const response = await tool.handler(args, { inject })

                inject.calledOnce.should.be.true()
                response.should.equal(routeResponse)
            })

            it('passes through an error response', async function () {
                const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
                inject.resolves(errorResponse)

                const response = await tool.handler(args, { inject })

                response.should.equal(errorResponse)
            })
        })
    })

    describe('platform_get_blueprint', function () {
        const tool = getTool('platform_get_blueprint')

        it('omits the flow content by default', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'bp1', name: 'Blueprint', flows: { flows: [{ id: 'n1' }] } }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/flow-blueprints/bp1' }).resolves(routeResponse)

            const response = await tool.handler({ flowBlueprintId: 'bp1' }, { inject })

            response.id.should.equal('bp1')
            response.flows.should.be.a.String()
        })

        it('includes the full flow content when includeFlow is true', async function () {
            const flows = { flows: [{ id: 'n1' }] }
            const routeResponse = { statusCode: 200, json: () => ({ id: 'bp1', name: 'Blueprint', flows }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/flow-blueprints/bp1' }).resolves(routeResponse)

            const response = await tool.handler({ flowBlueprintId: 'bp1', includeFlow: true }, { inject })

            response.flows.should.deepEqual(flows)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ flowBlueprintId: 'bp1' }, { inject })

            response.should.equal(errorResponse)
        })
    })

    describe('browser session tools - team scope filtering', function () {
        const sessionInTeam = { sessionId: 'tab-in-team', context: { teamId: 'team-a' } }
        const sessionInOtherTeam = { sessionId: 'tab-other-team', context: { teamId: 'team-b' } }
        const sessionNumericTeam = { sessionId: 'tab-numeric-team', context: { teamId: '42' } }

        function fakeApp (sessions) {
            return {
                config: { base_url: 'https://example.com' },
                db: {
                    models: {
                        Team: { encodeHashid: sinon.stub().withArgs(42).returns('team-a') }
                    },
                    controllers: {
                        BrowserSession: {
                            getSessionsByUser: sinon.stub().resolves(sessions),
                            setActiveBrowserSession: sinon.stub().resolves()
                        }
                    }
                }
            }
        }

        describe('platform_list_browser_sessions', function () {
            const tool = getTool('platform_list_browser_sessions')

            it('returns every tab when no scope is given (first-party Expert call)', async function () {
                const app = fakeApp([sessionInTeam, sessionInOtherTeam])
                const response = await tool.handler({}, { app, user: { hashid: 'u1' } })
                response.sessions.map(s => s.sessionId).should.containDeep(['tab-in-team', 'tab-other-team'])
            })

            it('returns every tab when the token has no team restriction (all-teams token)', async function () {
                const app = fakeApp([sessionInTeam, sessionInOtherTeam])
                const response = await tool.handler({}, { app, user: { hashid: 'u1' }, scope: { teams: [] } })
                response.sessions.should.have.length(2)
            })

            it('hides tabs outside the token team list', async function () {
                const app = fakeApp([sessionInTeam, sessionInOtherTeam])
                const response = await tool.handler({}, { app, user: { hashid: 'u1' }, scope: { teams: ['team-a'] } })
                response.sessions.should.have.length(1)
                response.sessions[0].sessionId.should.equal('tab-in-team')
            })

            it('converts a numeric tab teamId before comparing against the scope', async function () {
                const app = fakeApp([sessionNumericTeam])
                const response = await tool.handler({}, { app, user: { hashid: 'u1' }, scope: { teams: ['team-a'] } })
                response.sessions.should.have.length(1)
            })
        })

        describe('platform_set_active_browser_session', function () {
            const tool = getTool('platform_set_active_browser_session')

            it('pins an in-scope tab', async function () {
                const app = fakeApp([sessionInTeam])
                const response = await tool.handler(
                    { session_id: 'tab-in-team' },
                    { app, user: { hashid: 'u1' }, mcpSessionId: 'mcp-1', scope: { teams: ['team-a'] } }
                )
                response.success.should.be.true()
                app.db.controllers.BrowserSession.setActiveBrowserSession.calledOnceWith('u1', 'mcp-1', 'tab-in-team').should.be.true()
            })

            it('refuses to pin a tab outside the token team list', async function () {
                const app = fakeApp([sessionInOtherTeam])
                const response = await tool.handler(
                    { session_id: 'tab-other-team' },
                    { app, user: { hashid: 'u1' }, mcpSessionId: 'mcp-1', scope: { teams: ['team-a'] } }
                )
                response.success.should.be.false()
                app.db.controllers.BrowserSession.setActiveBrowserSession.called.should.be.false()
            })

            it('pins an out-of-team tab when no scope is given (first-party Expert call)', async function () {
                const app = fakeApp([sessionInOtherTeam])
                const response = await tool.handler(
                    { session_id: 'tab-other-team' },
                    { app, user: { hashid: 'u1' }, mcpSessionId: 'mcp-1' }
                )
                response.success.should.be.true()
            })
        })
    })
})
