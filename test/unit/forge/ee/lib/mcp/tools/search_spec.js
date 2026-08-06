const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/search')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Search Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    const cases = [
        { name: 'platform_search_team_resources', path: '/api/v1/search' },
        { name: 'platform_search_instances', path: '/api/v1/search/instances' }
    ]

    cases.forEach(({ name, path }) => {
        describe(name, function () {
            const tool = getTool(name)

            it('injects the search route with team and query and returns the response', async function () {
                const routeResponse = { statusCode: 200, json: () => ({ count: 0, results: [] }) }
                inject.withArgs({ method: 'GET', url: `${path}?team=team1&query=foo` }).resolves(routeResponse)

                const response = await tool.handler({ teamId: 'team1', query: 'foo' }, { inject })

                inject.calledOnce.should.be.true()
                response.should.equal(routeResponse)
            })

            it('URL-encodes special characters in the query', async function () {
                inject.resolves({ statusCode: 200, json: () => ({ count: 0, results: [] }) })

                await tool.handler({ teamId: 'team1', query: 'a b&c' }, { inject })

                inject.firstCall.args[0].url.should.equal(`${path}?team=team1&query=a+b%26c`)
            })

            it('passes through an error response', async function () {
                const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
                inject.resolves(errorResponse)

                const response = await tool.handler({ teamId: 'team1', query: 'foo' }, { inject })

                response.should.equal(errorResponse)
            })
        })
    })
})
