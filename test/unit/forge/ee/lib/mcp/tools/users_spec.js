const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/users')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Users Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_get_active_user', function () {
        const tool = getTool('platform_get_active_user')

        function userResponse (body = { id: 'user1', username: 'alice' }) {
            return { statusCode: 200, json: () => body }
        }

        it('calls the user endpoint and returns the profile with token metadata', async function () {
            inject.resolves(userResponse())
            const response = await tool.handler({}, { inject, scope: { readOnly: true, teams: ['team1', 'team2'] } })
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/user' })
            response.should.eql({
                id: 'user1',
                username: 'alice',
                token: { readOnly: true, allTeams: false, teams: ['team1', 'team2'] }
            })
        })

        it('reports full access when the token is not restricted to any team', async function () {
            inject.resolves(userResponse())
            const response = await tool.handler({}, { inject, scope: { readOnly: false, teams: [] } })
            response.token.should.eql({ readOnly: false, allTeams: true, teams: [] })
        })

        it('reports full access when no scope is provided', async function () {
            inject.resolves(userResponse())
            const response = await tool.handler({}, { inject })
            response.token.should.eql({ readOnly: false, allTeams: true, teams: [] })
        })

        it('returns the response unmodified when the request fails', async function () {
            const injectResponse = { statusCode: 401, json: () => ({ code: 'unauthorized' }) }
            inject.resolves(injectResponse)
            const response = await tool.handler({}, { inject, scope: { readOnly: true, teams: [] } })
            response.should.equal(injectResponse)
        })
    })
})
