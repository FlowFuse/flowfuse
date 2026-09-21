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
})
