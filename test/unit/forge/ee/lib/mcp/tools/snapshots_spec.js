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

        it('rejects a blank name without calling the route, which would 500 on it', async function () {
            const response = await tool.handler({ snapshotId: 'snapshot1', name: '   ' }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
        })

        it('rejects an update with nothing to change, which the route answers 200 to', async function () {
            const response = await tool.handler({ snapshotId: 'snapshot1' }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
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

        it('rejects a blank credentialSecret without calling the route, which treats it as absent', async function () {
            tool.inputSchema.credentialSecret.safeParse('').success.should.be.false()

            const response = await tool.handler({ snapshotId: 'snapshot1', credentialSecret: '' }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
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
                payload: { ownerId: hostedInstanceId, ownerType: 'instance', snapshot, credentialSecret: 's3cret', components: { envVars: 'all' } }
            }).resolves(routeResponse)

            const response = await tool.handler({ ownerId: hostedInstanceId, ownerType: 'instance', snapshot, credentialSecret: 's3cret', components: { envVars: 'all' } }, { inject })

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

        it('strips env vars up front when components excludes them, so no secret is needed', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snapshot2' }) })
            const encryptedEnv = { name: 'imported', flows: { flows: [] }, settings: { env: { SECRET: { hidden: true, $: 'abc123' } } } }

            await tool.handler({ ownerId: 'device1', ownerType: 'device', snapshot: encryptedEnv, components: { envVars: false } }, { inject })

            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].payload.snapshot.settings.env.should.eql({})
        })

        it('reduces env vars to their names when only keys are wanted, so no secret is needed', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snapshot2' }) })
            const encryptedEnv = { name: 'imported', flows: { flows: [] }, settings: { env: { SECRET: { hidden: true, $: 'abc123' }, PLAIN: { value: 'keep' } } } }

            await tool.handler({ ownerId: 'device1', ownerType: 'device', snapshot: encryptedEnv, components: { envVars: 'keys' } }, { inject })

            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].payload.snapshot.settings.env.should.eql({ SECRET: '', PLAIN: '' })
        })

        it('rejects a missing credentialSecret when the snapshot has encrypted hidden env values, since the route 500s', async function () {
            const encryptedEnv = { name: 'imported', flows: { flows: [] }, settings: { env: { SECRET: { hidden: true, $: 'abc123' } } } }

            const response = await tool.handler({ ownerId: 'device1', ownerType: 'device', snapshot: encryptedEnv }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
        })

        it('rejects a missing credentialSecret when the snapshot has encrypted flow credentials that are not excluded', async function () {
            const encryptedCreds = { name: 'imported', flows: { flows: [], credentials: { $: 'abc123' } }, settings: { env: {} } }

            const response = await tool.handler({ ownerId: 'device1', ownerType: 'device', snapshot: encryptedCreds }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
        })

        it('lets an encrypted snapshot through when the credentialSecret is provided', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snapshot2' }) })
            const encrypted = { name: 'imported', flows: { flows: [], credentials: { $: 'abc123' } }, settings: { env: { SECRET: { hidden: true, $: 'abc123' } } } }

            await tool.handler({ ownerId: 'device1', ownerType: 'device', snapshot: encrypted, credentialSecret: 's3cret' }, { inject })

            inject.calledOnce.should.be.true()
        })

        it('lets encrypted credentials through without a secret when credentials are excluded', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snapshot2' }) })
            const encryptedCreds = { name: 'imported', flows: { flows: [], credentials: { $: 'abc123' } }, settings: { env: {} } }

            await tool.handler({ ownerId: 'device1', ownerType: 'device', snapshot: encryptedCreds, components: { credentials: false } }, { inject })

            inject.calledOnce.should.be.true()
        })

        it('accepts an export verbatim and forwards only the fields the route reads', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snapshot2' }) })
            const exported = {
                id: 'snapshot1',
                name: 'imported',
                description: 'from an export',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
                ownerType: 'instance',
                user: { id: 'user1' },
                exportedBy: { id: 'user1' },
                flows: { flows: [], credentials: { $: 'abc123' } },
                settings: { env: {} }
            }

            tool.inputSchema.snapshot.safeParse(exported).success.should.be.true()

            await tool.handler({ ownerId: 'device1', ownerType: 'device', snapshot: exported, credentialSecret: 's3cret' }, { inject })

            inject.firstCall.args[0].payload.snapshot.should.eql({
                name: 'imported',
                description: 'from an export',
                flows: { flows: [], credentials: { $: 'abc123' } },
                settings: { env: {} }
            })
        })

        it('lets encrypted credentials through without a secret when the flows are excluded', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'snapshot2' }) })
            const encryptedCreds = { name: 'imported', flows: { flows: [], credentials: { $: 'abc123' } }, settings: { env: {} } }

            await tool.handler({ ownerId: 'device1', ownerType: 'device', snapshot: encryptedCreds, components: { flows: false } }, { inject })

            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].payload.snapshot.flows.credentials.should.eql({})
        })

        it('rejects unencrypted flow credentials, which the route would store in the clear', async function () {
            const plainCreds = { name: 'imported', flows: { flows: [], credentials: { node1: { password: 'hunter2' } } }, settings: { env: {} } }

            const response = await tool.handler({ ownerId: 'device1', ownerType: 'device', snapshot: plainCreds }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
        })

        it('rejects an env value that is neither a string nor an object, since the route 500s on it', async function () {
            const badEnv = { name: 'imported', flows: { flows: [] }, settings: { env: { BROKEN: null } } }

            tool.inputSchema.snapshot.safeParse(badEnv).success.should.be.false()

            const response = await tool.handler({ ownerId: 'device1', ownerType: 'device', snapshot: badEnv }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
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
