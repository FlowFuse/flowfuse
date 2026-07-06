const should = require('should') // eslint-disable-line no-unused-vars

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/snapshots')
const findTool = toolFinder(tools)

describe('MCP Tools - snapshots', function () {
    const READ_TOOLS = [
        'platform_get_hosted_instance_snapshot',
        'platform_get_remote_instance_snapshot',
        'platform_get_snapshot',
        'platform_get_snapshot_full',
        'platform_list_instance_target_devices',
        'platform_get_instance_device_settings'
    ]

    READ_TOOLS.forEach((name) => {
        it(`${name} is annotated as read-only and non-destructive`, function () {
            const tool = findTool(name)
            tool.annotations.should.have.property('readOnlyHint', true)
            tool.annotations.should.have.property('destructiveHint', false)
        })
    })

    describe('platform_get_hosted_instance_snapshot', function () {
        it('has the expected inputSchema keys', function () {
            const tool = findTool('platform_get_hosted_instance_snapshot')
            Object.keys(tool.inputSchema).should.deepEqual(['hostedInstanceId', 'snapshotId'])
        })

        it('issues a GET against the hosted instance snapshot endpoint', async function () {
            const tool = findTool('platform_get_hosted_instance_snapshot')
            const { inject, calls } = recordingInject()
            await tool.handler({ hostedInstanceId: 'inst1', snapshotId: 'snap1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/projects/inst1/snapshots/snap1')
        })
    })

    describe('platform_get_remote_instance_snapshot', function () {
        it('has the expected inputSchema keys', function () {
            const tool = findTool('platform_get_remote_instance_snapshot')
            Object.keys(tool.inputSchema).should.deepEqual(['remoteInstanceId', 'snapshotId'])
        })

        it('issues a GET against the remote instance snapshot endpoint', async function () {
            const tool = findTool('platform_get_remote_instance_snapshot')
            const { inject, calls } = recordingInject()
            await tool.handler({ remoteInstanceId: 'dev1', snapshotId: 'snap1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/devices/dev1/snapshots/snap1')
        })
    })

    describe('platform_get_snapshot', function () {
        it('has the expected inputSchema keys', function () {
            const tool = findTool('platform_get_snapshot')
            Object.keys(tool.inputSchema).should.deepEqual(['snapshotId'])
        })

        it('issues a GET against the snapshot endpoint', async function () {
            const tool = findTool('platform_get_snapshot')
            const { inject, calls } = recordingInject()
            await tool.handler({ snapshotId: 'snap1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/snapshots/snap1')
        })
    })

    describe('platform_get_snapshot_full', function () {
        it('has the expected inputSchema keys', function () {
            const tool = findTool('platform_get_snapshot_full')
            Object.keys(tool.inputSchema).should.deepEqual(['snapshotId'])
        })

        it('issues a GET against the snapshot full-payload endpoint', async function () {
            const tool = findTool('platform_get_snapshot_full')
            const { inject, calls } = recordingInject()
            await tool.handler({ snapshotId: 'snap1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/snapshots/snap1/full')
        })
    })

    describe('platform_list_instance_target_devices', function () {
        it('has the expected inputSchema keys', function () {
            const tool = findTool('platform_list_instance_target_devices')
            Object.keys(tool.inputSchema).should.deepEqual(['hostedInstanceId', 'cursor', 'limit'])
        })

        it('issues a GET against the instance devices endpoint with no query when no pagination args are given', async function () {
            const tool = findTool('platform_list_instance_target_devices')
            const { inject, calls } = recordingInject()
            await tool.handler({ hostedInstanceId: 'inst1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/projects/inst1/devices')
        })

        it('serialises pagination args into the query string, URL-encoding values', async function () {
            const tool = findTool('platform_list_instance_target_devices')
            const { inject, calls } = recordingInject()
            await tool.handler({ hostedInstanceId: 'inst1', cursor: 'a b&c', limit: 10 }, { inject })
            calls.should.have.length(1)
            calls[0].url.should.equal('/api/v1/projects/inst1/devices?cursor=a+b%26c&limit=10')
        })
    })

    describe('platform_get_instance_device_settings', function () {
        it('has the expected inputSchema keys', function () {
            const tool = findTool('platform_get_instance_device_settings')
            Object.keys(tool.inputSchema).should.deepEqual(['hostedInstanceId'])
        })

        it('issues a GET against the instance device settings endpoint', async function () {
            const tool = findTool('platform_get_instance_device_settings')
            const { inject, calls } = recordingInject()
            await tool.handler({ hostedInstanceId: 'inst1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/projects/inst1/devices/settings')
        })
    })

    describe('platform_list_hosted_instance_snapshots query serialisation', function () {
        it('omits undefined pagination args and keeps the ones supplied', async function () {
            const tool = findTool('platform_list_hosted_instance_snapshots')
            const { inject, calls } = recordingInject()
            await tool.handler({ hostedInstanceId: 'inst1', cursor: 'abc123', limit: 5 }, { inject })
            calls.should.have.length(1)
            calls[0].url.should.equal('/api/v1/projects/inst1/snapshots?cursor=abc123&limit=5')
        })
    })

    describe('platform_list_remote_instance_snapshots query serialisation', function () {
        it('omits undefined pagination args and keeps the ones supplied', async function () {
            const tool = findTool('platform_list_remote_instance_snapshots')
            const { inject, calls } = recordingInject()
            await tool.handler({ remoteInstanceId: 'dev1', limit: 5 }, { inject })
            calls.should.have.length(1)
            calls[0].url.should.equal('/api/v1/devices/dev1/snapshots?limit=5')
        })
    })

    describe('integration smoke', function () {
        const setup = require('../../../setup')

        let app
        let token
        let instanceSnapshot
        let device
        let deviceSnapshot

        before(async function () {
            app = await setup({ ai: { enabled: true }, expert: { enabled: true } })
            token = await createExpertMcpToken(app)

            instanceSnapshot = await app.factory.createSnapshot(
                { name: 'instance-snapshot-1', description: 'first instance snapshot' },
                app.project,
                app.user
            )

            device = await app.factory.createDevice({ name: 'device-1', type: 'test-device' }, app.team, null, app.application)
            deviceSnapshot = await app.factory.createDeviceSnapshot(
                { name: 'device-snapshot-1', description: 'first device snapshot' },
                device,
                app.user
            )

            // Seed the target snapshot directly so platform_get_instance_device_settings has non-default data to return.
            await app.project.updateSetting('deviceSettings', { targetSnapshot: instanceSnapshot.id })
        })

        after(async function () {
            await app.close()
        })

        function inject (options) {
            return app.inject({
                ...options,
                headers: {
                    ...(options.headers || {}),
                    authorization: `Bearer ${token}`
                }
            })
        }

        it('lists target devices for a hosted instance with no devices assigned', async function () {
            const tool = findTool('platform_list_instance_target_devices')
            const response = await tool.handler({ hostedInstanceId: app.project.id }, { inject })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('devices')
            body.devices.should.be.an.Array()
            body.devices.should.have.length(0)
        })

        // {method, url} below are written independently of the tool's own url-building code.
        describe('tool vs route equivalence', function () {
            it('platform_list_hosted_instance_snapshots matches GET /api/v1/projects/:instanceId/snapshots', async function () {
                const tool = findTool('platform_list_hosted_instance_snapshots')
                const { viaTool } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { hostedInstanceId: app.project.id, limit: 10 },
                    { method: 'GET', url: `/api/v1/projects/${app.project.id}/snapshots?limit=10` }
                )
                viaTool.json().snapshots.should.have.length(1)
                viaTool.json().snapshots[0].should.have.property('name', 'instance-snapshot-1')
            })

            it('platform_get_hosted_instance_snapshot matches GET /api/v1/projects/:instanceId/snapshots/:snapshotId', async function () {
                const tool = findTool('platform_get_hosted_instance_snapshot')
                const { viaTool } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { hostedInstanceId: app.project.id, snapshotId: instanceSnapshot.hashid },
                    { method: 'GET', url: `/api/v1/projects/${app.project.id}/snapshots/${instanceSnapshot.hashid}` }
                )
                viaTool.json().should.have.property('name', 'instance-snapshot-1')
            })

            it('platform_list_remote_instance_snapshots matches GET /api/v1/devices/:deviceId/snapshots', async function () {
                const tool = findTool('platform_list_remote_instance_snapshots')
                const { viaTool } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { remoteInstanceId: device.hashid, limit: 10 },
                    { method: 'GET', url: `/api/v1/devices/${device.hashid}/snapshots?limit=10` }
                )
                viaTool.json().snapshots.should.have.length(1)
                viaTool.json().snapshots[0].should.have.property('name', 'device-snapshot-1')
            })

            it('platform_get_remote_instance_snapshot matches GET /api/v1/devices/:deviceId/snapshots/:snapshotId', async function () {
                const tool = findTool('platform_get_remote_instance_snapshot')
                const { viaTool } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { remoteInstanceId: device.hashid, snapshotId: deviceSnapshot.hashid },
                    { method: 'GET', url: `/api/v1/devices/${device.hashid}/snapshots/${deviceSnapshot.hashid}` }
                )
                viaTool.json().should.have.property('name', 'device-snapshot-1')
            })

            it('platform_get_snapshot matches GET /api/v1/snapshots/:id', async function () {
                const tool = findTool('platform_get_snapshot')
                const { viaTool } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { snapshotId: instanceSnapshot.hashid },
                    { method: 'GET', url: `/api/v1/snapshots/${instanceSnapshot.hashid}` }
                )
                viaTool.json().should.have.property('name', 'instance-snapshot-1')
            })

            it('platform_get_snapshot_full matches GET /api/v1/snapshots/:id/full', async function () {
                const tool = findTool('platform_get_snapshot_full')
                const { viaTool } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { snapshotId: instanceSnapshot.hashid },
                    { method: 'GET', url: `/api/v1/snapshots/${instanceSnapshot.hashid}/full` }
                )
                viaTool.json().should.have.property('flows')
            })

            it('platform_list_instance_target_devices matches GET /api/v1/projects/:instanceId/devices (no devices assigned)', async function () {
                const tool = findTool('platform_list_instance_target_devices')
                const { viaTool } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { hostedInstanceId: app.project.id },
                    { method: 'GET', url: `/api/v1/projects/${app.project.id}/devices` }
                )
                viaTool.json().devices.should.have.length(0)
            })

            it('platform_get_instance_device_settings matches GET /api/v1/projects/:instanceId/devices/settings', async function () {
                const tool = findTool('platform_get_instance_device_settings')
                const { viaTool } = await expectToolMatchesRoute(
                    inject,
                    tool,
                    { hostedInstanceId: app.project.id },
                    { method: 'GET', url: `/api/v1/projects/${app.project.id}/devices/settings` }
                )
                viaTool.json().should.have.property('targetSnapshot', instanceSnapshot.hashid)
            })
        })
    })
})
