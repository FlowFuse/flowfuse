const should = require('should') // eslint-disable-line no-unused-vars

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/billing')
const findTool = toolFinder(tools)

describe('MCP Billing Tools', function () {
    describe('platform_get_team_billing', function () {
        const tool = findTool('platform_get_team_billing')

        it('has read-only, non-destructive annotations', function () {
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

        it('exposes the expected input schema keys', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('requests the team billing endpoint', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team123' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/ee/billing/teams/team123')
        })
    })

    describe('platform_get_team_customer_portal', function () {
        const tool = findTool('platform_get_team_customer_portal')

        it('has read-only, non-destructive annotations', function () {
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

        it('exposes the expected input schema keys', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('requests the team customer-portal endpoint', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team123' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/ee/billing/teams/team123/customer-portal')
        })

        it('surfaces the portal URL from the response location header', async function () {
            const inject = async () => ({ statusCode: 200, headers: { location: 'https://billing.stripe.com/session/abc' } })
            const response = await tool.handler({ teamId: 'team123' }, { inject })
            response.statusCode.should.equal(200)
            response.json().should.eql({ url: 'https://billing.stripe.com/session/abc' })
        })

        it('returns the error response unchanged when the route fails', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ error: 'not found' }) }
            const inject = async () => errorResponse
            const response = await tool.handler({ teamId: 'team123' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('Integration smoke', function () {
        const setup = require('../../../setup')

        let app
        let stripe
        let token

        before(async function () {
            stripe = setup.setupStripe({
                billingPortal: {
                    sessions: {
                        create: async () => ({ url: 'https://billing.stripe.com/p/session/test_123' })
                    }
                }
            })
            app = await setup({
                ai: { enabled: true },
                expert: { enabled: true }
            })
            token = await createExpertMcpToken(app)
        })

        after(async function () {
            await app.close()
            setup.resetStripe()
        })

        it('platform_get_team_billing returns the team subscription details', async function () {
            const inject = (o) => app.inject({ ...o, headers: { ...(o.headers || {}), authorization: `Bearer ${token}` } })
            const tool = findTool('platform_get_team_billing')

            const response = await tool.handler({ teamId: app.team.hashid }, { inject })

            // app.team has an active subscription via the Stripe mock
            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('items').which.is.an.Array()
            body.should.have.property('customer')
            should.equal(stripe.subscriptions.retrieve.called, true)
        })

        it('platform_get_team_billing matches the team billing route response exactly', async function () {
            const inject = (o) => app.inject({ ...o, headers: { ...(o.headers || {}), authorization: `Bearer ${token}` } })
            const tool = findTool('platform_get_team_billing')

            await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/ee/billing/teams/${app.team.hashid}`
            })
        })

        it('platform_get_team_customer_portal matches the customer-portal route redirect location', async function () {
            const inject = (o) => app.inject({ ...o, headers: { ...(o.headers || {}), authorization: `Bearer ${token}` } })
            const tool = findTool('platform_get_team_customer_portal')

            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/ee/billing/teams/${app.team.hashid}/customer-portal`,
                transform: (r) => (r.statusCode >= 400
                    ? { statusCode: r.statusCode, body: r.json() }
                    : { statusCode: 200, body: { url: r.headers.location } })
            })

            // Stripe mock's billing portal session is wired to a fixed URL
            routeResponse.headers.location.should.equal('https://billing.stripe.com/p/session/test_123')
        })
    })
})
