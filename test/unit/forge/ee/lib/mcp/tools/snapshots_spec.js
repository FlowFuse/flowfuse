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

    describe('platform_list_instance_snapshots', function () {
        const tool = getTool('platform_list_instance_snapshots')

        it('lists a hosted instance\'s snapshots via the projects route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ count: 0, snapshots: [] }) }
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${hostedInstanceId}/snapshots?cursor=abc&limit=10` }).resolves(routeResponse)

            const response = await tool.handler({ instanceType: 'hosted', instanceId: hostedInstanceId, cursor: 'abc', limit: 10 }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('lists a remote instance\'s snapshots via the devices route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ count: 0, snapshots: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/devices/device1/snapshots?cursor=abc&limit=10' }).resolves(routeResponse)

            const response = await tool.handler({ instanceType: 'remote', instanceId: 'device1', cursor: 'abc', limit: 10 }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('rejects an unknown instanceType', function () {
            tool.inputSchema.instanceType.safeParse('other').success.should.be.false()
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ instanceType: 'hosted', instanceId: hostedInstanceId, limit: 10 }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_create_instance_snapshot', function () {
        const tool = getTool('platform_create_instance_snapshot')

        it('creates a hosted instance snapshot via the projects route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'snapshot1' }) }
            inject.withArgs({ method: 'POST', url: `/api/v1/projects/${hostedInstanceId}/snapshots`, payload: { name: 'snap', description: 'desc' } }).resolves(routeResponse)

            const response = await tool.handler({ instanceType: 'hosted', instanceId: hostedInstanceId, name: 'snap', description: 'desc' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('creates a remote instance snapshot via the devices route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'snapshot1' }) }
            inject.withArgs({ method: 'POST', url: '/api/v1/devices/device1/snapshots', payload: { name: 'snap', description: 'desc' } }).resolves(routeResponse)

            const response = await tool.handler({ instanceType: 'remote', instanceId: 'device1', name: 'snap', description: 'desc' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('rejects an unknown instanceType', function () {
            tool.inputSchema.instanceType.safeParse('other').success.should.be.false()
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ instanceType: 'hosted', instanceId: hostedInstanceId, name: 'snap' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_snapshot', function () {
        const tool = getTool('platform_get_snapshot')

        it('injects the owner-agnostic snapshot route and returns the response', async function () {
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

        it('injects the full-payload route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'snapshot1', flows: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/snapshots/snapshot1/full' }).resolves(routeResponse)

            await tool.handler({ snapshotId: 'snapshot1' }, { inject })

            inject.calledOnce.should.be.true()
        })

        it('blanks hidden env var values but keeps visible ones', async function () {
            inject.resolves({
                statusCode: 200,
                json: () => ({
                    id: 'snapshot1',
                    settings: {
                        env: {
                            VISIBLE: 'plain-value',
                            SECRET: { value: 'super-secret', hidden: true }
                        }
                    }
                })
            })

            const response = await tool.handler({ snapshotId: 'snapshot1' }, { inject })
            const body = response.json()

            body.settings.env.VISIBLE.should.equal('plain-value')
            body.settings.env.SECRET.should.match({ value: '', hidden: true })
        })

        it('leaves the payload untouched when there is no env', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snapshot1', settings: {} }) })

            const response = await tool.handler({ snapshotId: 'snapshot1' }, { inject })

            response.json().should.match({ id: 'snapshot1', settings: {} })
        })

        it('passes through an error response without touching it', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ snapshotId: 'snapshot1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_hosted_instance_device_target_snapshot', function () {
        const tool = getTool('platform_get_hosted_instance_device_target_snapshot')

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

    describe('platform_update_snapshot', function () {
        const tool = getTool('platform_update_snapshot')

        it('puts name and description onto the snapshot route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'snapshot1' }) }
            inject.withArgs({ method: 'PUT', url: '/api/v1/snapshots/snapshot1', payload: { name: 'v2', description: 'second cut' } }).resolves(routeResponse)

            const response = await tool.handler({ snapshotId: 'snapshot1', name: 'v2', description: 'second cut' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('only sends the fields that were provided', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snapshot1' }) })

            await tool.handler({ snapshotId: 'snapshot1', name: 'v2' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ name: 'v2' })
        })

        it('keeps an empty-string description so it can clear the stored value', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snapshot1' }) })

            await tool.handler({ snapshotId: 'snapshot1', description: '' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ description: '' })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ snapshotId: 'snapshot1', name: 'v2' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_export_snapshot', function () {
        const tool = getTool('platform_export_snapshot')

        it('posts the credential secret to the export route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'snapshot1', flows: {} }) }
            inject.withArgs({ method: 'POST', url: '/api/v1/snapshots/snapshot1/export', payload: { credentialSecret: 's3cret' } }).resolves(routeResponse)

            const response = await tool.handler({ snapshotId: 'snapshot1', credentialSecret: 's3cret' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('forwards the components selection when provided', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snapshot1' }) })

            await tool.handler({ snapshotId: 'snapshot1', credentialSecret: 's3cret', components: { flows: true, credentials: false, envVars: 'keys' } }, { inject })

            inject.firstCall.args[0].payload.should.eql({ credentialSecret: 's3cret', components: { flows: true, credentials: false, envVars: 'keys' } })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'bad_request' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ snapshotId: 'snapshot1', credentialSecret: 's3cret' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_import_snapshot', function () {
        const tool = getTool('platform_import_snapshot')

        const snapshot = {
            name: 'imported',
            flows: { flows: [] },
            settings: { env: { FOO: 'bar' } }
        }

        it('posts the snapshot payload to the import route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'snapshot2' }) }
            inject.withArgs({
                method: 'POST',
                url: '/api/v1/snapshots/import',
                payload: { ownerId: hostedInstanceId, ownerType: 'instance', snapshot, credentialSecret: 's3cret', components: { envVars: false } }
            }).resolves(routeResponse)

            const response = await tool.handler({ ownerId: hostedInstanceId, ownerType: 'instance', snapshot, credentialSecret: 's3cret', components: { envVars: false } }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('omits credentialSecret and components when not provided', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snapshot2' }) })

            await tool.handler({ ownerId: 'device1', ownerType: 'device', snapshot }, { inject })

            inject.firstCall.args[0].payload.should.eql({ ownerId: 'device1', ownerType: 'device', snapshot })
        })

        it('fills in settings.env when the snapshot omits it, since the route errors without it', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snapshot2' }) })

            await tool.handler({ ownerId: 'device1', ownerType: 'device', snapshot: { name: 'imported', flows: { flows: [] }, settings: {} } }, { inject })

            inject.firstCall.args[0].payload.snapshot.settings.should.eql({ env: {} })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'bad_request' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ ownerId: 'device1', ownerType: 'device', snapshot }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_set_instance_device_target', function () {
        const tool = getTool('platform_set_instance_device_target')

        it('posts the target snapshot to the instance device settings route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ status: 'okay' }) }
            inject.withArgs({ method: 'POST', url: `/api/v1/projects/${hostedInstanceId}/devices/settings`, payload: { targetSnapshot: 'snapshot1' } }).resolves(routeResponse)

            const response = await tool.handler({ hostedInstanceId, snapshotId: 'snapshot1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_snapshot' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ hostedInstanceId, snapshotId: 'other' }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
