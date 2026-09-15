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

    describe('platform_set_notification_read_state', function () {
        const tool = getTool('platform_set_notification_read_state')

        it('puts the read state to the single-notification route when notificationId is given', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ status: 'okay' }) }
            inject.withArgs({ method: 'PUT', url: '/api/v1/user/notifications/notification1', payload: { read: true } }).resolves(routeResponse)

            const response = await tool.handler({ notificationId: 'notification1', read: true }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('puts the ids and read state to the bulk route when ids are given', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ notifications: [] }) }
            inject.withArgs({ method: 'PUT', url: '/api/v1/user/notifications', payload: { ids: ['n1', 'n2'], read: false } }).resolves(routeResponse)

            const response = await tool.handler({ ids: ['n1', 'n2'], read: false }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('rejects when neither notificationId nor ids is given', async function () {
            const response = await tool.handler({ read: true }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().should.match({ code: 'invalid_request' })
        })

        it('rejects when both notificationId and ids are given', async function () {
            const response = await tool.handler({ notificationId: 'n1', ids: ['n2'], read: true }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().should.match({ code: 'invalid_request' })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ notificationId: 'notification1', read: true }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_respond_to_team_invitation', function () {
        const tool = getTool('platform_respond_to_team_invitation')

        it('accepts via PATCH on the invitation route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ status: 'okay' }) }
            inject.withArgs({ method: 'PATCH', url: '/api/v1/user/invitations/invite1' }).resolves(routeResponse)

            const response = await tool.handler({ invitationId: 'invite1', action: 'accept' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('rejects via DELETE on the invitation route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ status: 'okay' }) }
            inject.withArgs({ method: 'DELETE', url: '/api/v1/user/invitations/invite1' }).resolves(routeResponse)

            const response = await tool.handler({ invitationId: 'invite1', action: 'reject' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ invitationId: 'invite1', action: 'accept' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_update_profile', function () {
        const tool = getTool('platform_update_profile')

        it('puts only the provided fields onto the user route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'user1' }) }
            inject.withArgs({ method: 'PUT', url: '/api/v1/user', payload: { name: 'New Name' } }).resolves(routeResponse)

            const response = await tool.handler({ name: 'New Name' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('forwards defaultTeam', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'user1' }) })

            await tool.handler({ defaultTeam: 'team1' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ defaultTeam: 'team1' })
        })

        it('never exposes username, email or tcs_accepted', function () {
            Object.keys(tool.inputSchema).should.eql(['name', 'defaultTeam'])
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_team' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ defaultTeam: 'not-my-team' }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
