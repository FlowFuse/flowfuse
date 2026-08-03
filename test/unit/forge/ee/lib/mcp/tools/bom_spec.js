const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/bom')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Bill of Materials Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_get_team_bom', function () {
        const tool = getTool('platform_get_team_bom')

        it('injects the team bom route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ([]) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/bom' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_application_bom', function () {
        const tool = getTool('platform_get_application_bom')

        it('injects the application bom route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({}) }
            inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/bom' }).resolves(routeResponse)

            const response = await tool.handler({ applicationId: 'app1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ applicationId: 'app1' }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
