const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/shared-instances-devices')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Shared Instance/Device Tools', function () {
    let inject
    const instanceId = '11111111-1111-1111-1111-111111111111'

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_instance_http_tokens', function () {
        const tool = getTool('platform_list_instance_http_tokens')

        it('lists hosted instance HTTP tokens via the projects route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ tokens: [] }) }
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/httpTokens` }).resolves(routeResponse)

            const response = await tool.handler({ instanceId, instanceType: 'hosted' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('lists remote instance HTTP tokens via the devices route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ tokens: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/devices/device1/httpTokens' }).resolves(routeResponse)

            const response = await tool.handler({ instanceId: 'device1', instanceType: 'remote' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })
    })

    describe('platform_get_instance_history', function () {
        const tool = getTool('platform_get_instance_history')

        it('serialises cursor and limit onto the hosted instance history route', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ timeline: [] }) })

            await tool.handler({ instanceId, instanceType: 'hosted', cursor: 'c1', limit: 5 }, { inject })

            inject.firstCall.args[0].url.should.equal(`/api/v1/projects/${instanceId}/history?cursor=c1&limit=5`)
        })

        it('reads remote instance history via the devices route', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ timeline: [] }) })

            await tool.handler({ instanceId: 'device1', instanceType: 'remote', limit: 5 }, { inject })

            inject.firstCall.args[0].url.should.equal('/api/v1/devices/device1/history?limit=5')
        })
    })

    describe('platform_get_instance_audit_log', function () {
        const tool = getTool('platform_get_instance_audit_log')

        it('serialises filters, scope and includeChildren onto the hosted instance audit-log route', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ log: [] }) })

            await tool.handler({
                instanceId,
                instanceType: 'hosted',
                cursor: 'abc',
                limit: 20,
                query: 'deploy',
                event: ['project.created', 'flows.deployed'],
                username: 'alice',
                scope: 'device',
                includeChildren: true
            }, { inject })

            inject.firstCall.args[0].url.should.equal(
                `/api/v1/projects/${instanceId}/audit-log` +
                '?cursor=abc&limit=20&query=deploy&event=project.created&event=flows.deployed&username=alice&scope=device&includeChildren=true'
            )
        })

        it('reads a remote instance audit log via the devices route', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ log: [] }) })

            await tool.handler({ instanceId: 'device1', instanceType: 'remote', limit: 5 }, { inject })

            inject.firstCall.args[0].url.should.equal('/api/v1/devices/device1/audit-log?limit=5')
        })

        it('rejects scope and includeChildren for a remote instance', async function () {
            const response = await tool.handler({ instanceId: 'device1', instanceType: 'remote', scope: 'device' }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
        })
    })

    describe('platform_instance_action', function () {
        const tool = getTool('platform_instance_action')

        const hostedActions = ['start', 'stop', 'restart', 'suspend', 'restartStack']
        hostedActions.forEach(action => {
            it(`posts ${action} to the hosted instance actions route`, async function () {
                const routeResponse = { statusCode: 200, json: () => ({ status: 'okay' }) }
                inject.withArgs({ method: 'POST', url: `/api/v1/projects/${instanceId}/actions/${action}` }).resolves(routeResponse)

                const response = await tool.handler({ instanceId, instanceType: 'hosted', action }, { inject })

                inject.calledOnce.should.be.true()
                response.should.equal(routeResponse)
            })
        })

        it('posts restart to the device actions route for a remote instance', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ status: 'okay' }) }
            inject.withArgs({ method: 'POST', url: '/api/v1/devices/device1/actions/restart' }).resolves(routeResponse)

            const response = await tool.handler({ instanceId: 'device1', instanceType: 'remote', action: 'restart' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('rejects a non-restart action for a remote instance without calling the API', async function () {
            const response = await tool.handler({ instanceId: 'device1', instanceType: 'remote', action: 'stop' }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'project_suspended' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ instanceId, instanceType: 'hosted', action: 'stop' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_create_instance_http_token', function () {
        const tool = getTool('platform_create_instance_http_token')

        it('posts the token payload to the hosted instance route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'token1', token: 'ffhttp_abc' }) }
            inject.withArgs({ method: 'POST', url: `/api/v1/projects/${instanceId}/httpTokens`, payload: { name: 'my token', expiresAt: '2027-01-01T00:00:00.000Z' } }).resolves(routeResponse)

            const response = await tool.handler({ instanceId, instanceType: 'hosted', name: 'my token', expiresAt: '2027-01-01T00:00:00.000Z' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('posts to the device route for a remote instance and omits expiresAt when not set', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'token1' }) })

            await tool.handler({ instanceId: 'device1', instanceType: 'remote', name: 'my token' }, { inject })

            inject.firstCall.args[0].url.should.equal('/api/v1/devices/device1/httpTokens')
            inject.firstCall.args[0].payload.should.eql({ name: 'my token' })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ instanceId, instanceType: 'hosted', name: 'my token' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_update_instance_http_token', function () {
        const tool = getTool('platform_update_instance_http_token')

        it('puts the new expiry onto the hosted instance token route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'token1' }) }
            inject.withArgs({ method: 'PUT', url: `/api/v1/projects/${instanceId}/httpTokens/token1`, payload: { expiresAt: '2027-01-01T00:00:00.000Z' } }).resolves(routeResponse)

            const response = await tool.handler({ instanceId, instanceType: 'hosted', tokenId: 'token1', expiresAt: '2027-01-01T00:00:00.000Z' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('sends an empty payload to the device route to clear the expiry', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'token1' }) })

            await tool.handler({ instanceId: 'device1', instanceType: 'remote', tokenId: 'token1' }, { inject })

            inject.firstCall.args[0].url.should.equal('/api/v1/devices/device1/httpTokens/token1')
            inject.firstCall.args[0].payload.should.eql({})
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ instanceId, instanceType: 'hosted', tokenId: 'token1' }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
