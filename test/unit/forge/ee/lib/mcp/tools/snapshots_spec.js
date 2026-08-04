const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/snapshots')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

const hostedInstanceId = '11111111-1111-1111-1111-111111111111'

describe('MCP Snapshots Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_hosted_instance_snapshots', function () {
        const tool = getTool('platform_list_hosted_instance_snapshots')

        it('injects the right route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ count: 0, snapshots: [] }) }
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${hostedInstanceId}/snapshots?cursor=abc&limit=10` }).resolves(routeResponse)

            const response = await tool.handler({ hostedInstanceId, cursor: 'abc', limit: 10 }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ hostedInstanceId, limit: 10 }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_create_hosted_instance_snapshot', function () {
        const tool = getTool('platform_create_hosted_instance_snapshot')

        it('injects the right route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'snapshot1' }) }
            inject.withArgs({ method: 'POST', url: `/api/v1/projects/${hostedInstanceId}/snapshots`, payload: { name: 'snap', description: 'desc' } }).resolves(routeResponse)

            const response = await tool.handler({ hostedInstanceId, name: 'snap', description: 'desc' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ hostedInstanceId, name: 'snap' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_list_remote_instance_snapshots', function () {
        const tool = getTool('platform_list_remote_instance_snapshots')

        it('injects the right route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ count: 0, snapshots: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/devices/device1/snapshots?cursor=abc&limit=10' }).resolves(routeResponse)

            const response = await tool.handler({ remoteInstanceId: 'device1', cursor: 'abc', limit: 10 }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ remoteInstanceId: 'device1', limit: 10 }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_create_remote_instance_snapshot', function () {
        const tool = getTool('platform_create_remote_instance_snapshot')

        it('injects the right route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'snapshot1' }) }
            inject.withArgs({ method: 'POST', url: '/api/v1/devices/device1/snapshots', payload: { name: 'snap', description: 'desc' } }).resolves(routeResponse)

            const response = await tool.handler({ remoteInstanceId: 'device1', name: 'snap', description: 'desc' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ remoteInstanceId: 'device1', name: 'snap' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_hosted_instance_snapshot', function () {
        const tool = getTool('platform_get_hosted_instance_snapshot')

        it('injects the right route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'snapshot1' }) }
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${hostedInstanceId}/snapshots/snapshot1` }).resolves(routeResponse)

            const response = await tool.handler({ hostedInstanceId, snapshotId: 'snapshot1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ hostedInstanceId, snapshotId: 'snapshot1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_remote_instance_snapshot', function () {
        const tool = getTool('platform_get_remote_instance_snapshot')

        it('injects the right route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'snapshot1' }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/devices/device1/snapshots/snapshot1' }).resolves(routeResponse)

            const response = await tool.handler({ remoteInstanceId: 'device1', snapshotId: 'snapshot1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ remoteInstanceId: 'device1', snapshotId: 'snapshot1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_snapshot', function () {
        const tool = getTool('platform_get_snapshot')

        it('injects the right route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'snapshot1' }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/snapshots/snapshot1' }).resolves(routeResponse)

            const response = await tool.handler({ snapshotId: 'snapshot1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ snapshotId: 'snapshot1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_snapshot_full', function () {
        const tool = getTool('platform_get_snapshot_full')

        it('injects the right route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'snapshot1', flows: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/snapshots/snapshot1/full' }).resolves(routeResponse)

            const response = await tool.handler({ snapshotId: 'snapshot1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ snapshotId: 'snapshot1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_instance_device_settings', function () {
        const tool = getTool('platform_get_instance_device_settings')

        it('injects the right route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ targetSnapshot: null }) }
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${hostedInstanceId}/devices/settings` }).resolves(routeResponse)

            const response = await tool.handler({ hostedInstanceId }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ hostedInstanceId }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
