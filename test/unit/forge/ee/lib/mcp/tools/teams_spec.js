const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/teams')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Teams Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_teams', function () {
        const tool = getTool('platform_list_teams')

        it('calls the user teams endpoint and returns the response unmodified', async function () {
            const injectResponse = { statusCode: 200, json: () => [{ id: 'team1' }] }
            inject.resolves(injectResponse)
            const response = await tool.handler({}, { inject })
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/user/teams' })
            response.should.equal(injectResponse)
        })
    })

    describe('platform_get_team', function () {
        const tool = getTool('platform_get_team')

        it('calls the team endpoint and returns the response unmodified', async function () {
            const injectResponse = { statusCode: 200, json: () => ({ id: 'team1' }) }
            inject.resolves(injectResponse)
            const response = await tool.handler({ teamId: 'team1' }, { inject })
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/teams/team1' })
            response.should.equal(injectResponse)
        })
    })
})
