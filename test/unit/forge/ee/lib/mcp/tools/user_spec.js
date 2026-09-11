const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/user')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP User/Notifications Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_notifications', function () {
        const tool = getTool('platform_list_notifications')

        it('injects the notifications route with no query string when no args are given', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ notifications: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/user/notifications' }).resolves(routeResponse)

            const response = await tool.handler({}, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('serialises cursor and limit onto the query string', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ notifications: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/user/notifications?cursor=abc123&limit=10' }).resolves(routeResponse)

            const response = await tool.handler({ cursor: 'abc123', limit: 10 }, { inject })

            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].url.should.equal('/api/v1/user/notifications?cursor=abc123&limit=10')
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({}, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_list_own_invitations', function () {
        const tool = getTool('platform_list_own_invitations')

        it('injects the invitations route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ invitations: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/user/invitations' }).resolves(routeResponse)

            const response = await tool.handler({}, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({}, { inject })
            response.should.equal(errorResponse)
        })
    })
})
