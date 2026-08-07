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

        it('returns an error object when the team fetch fails', async function () {
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1' }).resolves({
                statusCode: 404,
                json: () => ({ code: 'not_found' })
            })

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            response.should.eql({ content: { code: 'not_found' }, code: 404, isError: true })
        })

        it('returns an error object when the project-types fetch fails', async function () {
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1' }).resolves({
                statusCode: 200,
                json: () => ({ properties: {}, type: { properties: {} }, instanceCountByType: {} })
            })
            inject.withArgs({ method: 'GET', url: '/api/v1/project-types' }).resolves({
                statusCode: 500,
                json: () => ({ code: 'unexpected_error' })
            })

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            response.should.eql({ content: { code: 'unexpected_error' }, code: 500, isError: true })
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
        { name: 'platform_get_blueprint', args: { flowBlueprintId: 'bp1' }, url: '/api/v1/flow-blueprints/bp1' },
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
})
