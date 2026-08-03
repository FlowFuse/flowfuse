const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/billing')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Billing Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_get_team_billing', function () {
        const tool = getTool('platform_get_team_billing')

        it('injects the team billing route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ items: [], customer: 'cus_1' }) }
            inject.withArgs({ method: 'GET', url: '/ee/billing/teams/team123' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team123' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team123' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_team_customer_portal', function () {
        const tool = getTool('platform_get_team_customer_portal')

        it('injects the customer-portal route and returns the location header as a url', async function () {
            const routeResponse = { statusCode: 200, headers: { location: 'https://billing.stripe.com/session/abc' } }
            inject.withArgs({ method: 'GET', url: '/ee/billing/teams/team123/customer-portal' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team123' }, { inject })

            inject.calledOnce.should.be.true()
            response.statusCode.should.equal(200)
            response.json().should.eql({ url: 'https://billing.stripe.com/session/abc' })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team123' }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
