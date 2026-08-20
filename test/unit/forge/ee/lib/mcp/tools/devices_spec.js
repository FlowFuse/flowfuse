const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/devices')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

const remoteInstanceId = 'device1'
const hostedInstanceId = '11111111-1111-1111-1111-111111111111'

describe('MCP Devices Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_remote_instances', function () {
        const tool = getTool('platform_list_remote_instances')

        function deviceBody () {
            return {
                meta: { page: 1, pageSize: 10, total: 1, pageCount: 1 },
                devices: [
                    {
                        id: 'device1',
                        name: 'edge-pi',
                        ownerType: 'application',
                        mode: 'autonomous',
                        status: 'running',
                        onlineStatus: 'connected',
                        lastSeenAt: '2026-08-01T00:00:00.000Z',
                        lastSeenMs: 1234,
                        team: { id: 'team1', name: 'Acme', extra: 'drop' },
                        application: { id: 'app1', name: 'Plant', extra: 'drop' }
                    }
                ]
            }
        }

        it('lists a team\'s remote instances and normalises each device', async function () {
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/devices?page=1&limit=10' }).resolves({
                statusCode: 200,
                json: () => deviceBody()
            })

            const response = await tool.handler({ teamId: 'team1', page: 1, limit: 10 }, { inject })

            inject.calledOnce.should.be.true()
            response.statusCode.should.equal(200)
            response.json().should.eql({
                count: 1,
                meta: { page: 1, pageSize: 10, total: 1, pageCount: 1 },
                devices: [
                    {
                        id: 'device1',
                        name: 'edge-pi',
                        ownerType: 'application',
                        mode: 'autonomous',
                        requiredStatus: 'running',
                        liveStatus: 'connected',
                        lastSeenAt: '2026-08-01T00:00:00.000Z',
                        lastSeenMs: 1234,
                        team: { id: 'team1', name: 'Acme' },
                        application: { id: 'app1', name: 'Plant' }
                    }
                ]
            })
        })

        it('scopes to an application and serialises query and mode filter', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ meta: {}, devices: [] }) })

            await tool.handler({ teamId: 'team1', applicationId: 'app1', query: 'pi', mode: 'autonomous', page: 1, limit: 10 }, { inject })

            inject.firstCall.args[0].should.eql({
                method: 'GET',
                url: '/api/v1/applications/app1/devices?page=1&limit=10&query=pi&filters=mode%3Aautonomous'
            })
        })

        it('scopes to a hosted instance device group, which takes priority over applicationId', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ meta: {}, devices: [] }) })

            await tool.handler({ teamId: 'team1', applicationId: 'app1', hostedInstanceId, page: 1, limit: 10 }, { inject })

            inject.firstCall.args[0].url.should.equal(`/api/v1/projects/${hostedInstanceId}/devices?page=1&limit=10`)
        })

        it('prefers the cached live state from the database when available', async function () {
            inject.resolves({ statusCode: 200, json: () => deviceBody() })
            const app = { db: { controllers: { Device: { getLiveCachedState: sinon.stub().resolves('running') } } } }

            const response = await tool.handler({ teamId: 'team1', hostedInstanceId, page: 1, limit: 10 }, { inject, app })

            app.db.controllers.Device.getLiveCachedState.calledWith(hostedInstanceId).should.be.true()
            response.json().devices[0].liveStatus.should.equal('running')
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', page: 1, limit: 10 }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_remote_instance', function () {
        const tool = getTool('platform_get_remote_instance')

        it('normalises status and online status onto the returned device', async function () {
            inject.withArgs({ method: 'GET', url: `/api/v1/devices/${remoteInstanceId}` }).resolves({
                statusCode: 200,
                json: () => ({ id: 'device1', name: 'edge-pi', status: 'running', onlineStatus: 'connected' })
            })

            const response = await tool.handler({ remoteInstanceId }, { inject })

            inject.calledOnce.should.be.true()
            response.json().should.eql({
                id: 'device1',
                name: 'edge-pi',
                requiredStatus: 'running',
                liveStatus: 'connected'
            })
        })

        it('prefers the cached live state from the database when available', async function () {
            inject.resolves({
                statusCode: 200,
                json: () => ({ id: 'device1', status: 'running', onlineStatus: 'connected' })
            })
            const app = { db: { controllers: { Device: { getLiveCachedState: sinon.stub().resolves('installing') } } } }

            const response = await tool.handler({ remoteInstanceId }, { inject, app })

            app.db.controllers.Device.getLiveCachedState.calledWith(remoteInstanceId).should.be.true()
            response.json().liveStatus.should.equal('installing')
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ remoteInstanceId }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_remote_instance_status', function () {
        const tool = getTool('platform_get_remote_instance_status')

        it('returns the cached live state without querying the device', async function () {
            const app = {
                comms: { devices: {} },
                db: { controllers: { Device: { getLiveCachedState: sinon.stub().resolves({ state: 'running' }) } } }
            }

            const response = await tool.handler({ teamId: 'team1', remoteInstanceId }, { app })

            response.should.eql({ state: 'running' })
        })

        it('queries the device over MQTT when there is no cached state', async function () {
            const sendCommandAwaitReply = sinon.stub().resolves({ state: 'running', health: { cpu: 5 }, snapshot: 'snap1' })
            const app = {
                comms: { devices: { sendCommandAwaitReply } },
                db: { controllers: { Device: { getLiveCachedState: sinon.stub().resolves(null) } } }
            }

            const response = await tool.handler({ teamId: 'team1', remoteInstanceId }, { app })

            sendCommandAwaitReply.calledWith('team1', remoteInstanceId, 'get-liveState', {}, { timeout: 3000 }).should.be.true()
            response.should.eql({ state: 'running', health: { cpu: 5 }, snapshot: 'snap1' })
        })

        it('reports when device communications are unavailable', async function () {
            const app = {}

            const response = await tool.handler({ teamId: 'team1', remoteInstanceId }, { app })

            response.should.eql({ error: 'Device communications not available' })
        })

        it('reports when the device is not reachable', async function () {
            const app = {
                comms: { devices: { sendCommandAwaitReply: sinon.stub().rejects(new Error('timeout')) } },
                db: { controllers: { Device: { getLiveCachedState: sinon.stub().resolves(null) } } }
            }

            const response = await tool.handler({ teamId: 'team1', remoteInstanceId }, { app })

            response.should.eql({ error: 'Device is not reachable. It may be offline or not connected to the platform.' })
        })
    })

    describe('platform_create_remote_instance', function () {
        const tool = getTool('platform_create_remote_instance')

        it('posts the new device and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'device1' }) }
            inject.withArgs({ method: 'POST', url: '/api/v1/devices', payload: { name: 'edge-pi', team: 'team1', type: 'Raspberry Pi 4' } }).resolves(routeResponse)

            const response = await tool.handler({ name: 'edge-pi', teamId: 'team1', type: 'Raspberry Pi 4' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('defaults type to an empty string', async function () {
            inject.resolves({ statusCode: 200, json: () => ({}) })

            await tool.handler({ name: 'edge-pi', teamId: 'team1' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ name: 'edge-pi', team: 'team1', type: '' })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_request' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ name: 'edge-pi', teamId: 'team1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_assign_remote_instance_to_application', function () {
        const tool = getTool('platform_assign_remote_instance_to_application')

        it('puts the application assignment and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({}) }
            inject.withArgs({ method: 'PUT', url: `/api/v1/devices/${remoteInstanceId}`, payload: { application: 'app1' } }).resolves(routeResponse)

            const response = await tool.handler({ remoteInstanceId, applicationId: 'app1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ remoteInstanceId, applicationId: 'app1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_remote_instance_audit_log', function () {
        const tool = getTool('platform_get_remote_instance_audit_log')

        it('injects the audit-log route with no query string when no filters are set', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ log: [] }) }
            inject.withArgs({ method: 'GET', url: `/api/v1/devices/${remoteInstanceId}/audit-log` }).resolves(routeResponse)

            const response = await tool.handler({ remoteInstanceId }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('serialises cursor, limit, query, an event array and username', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ log: [] }) })

            await tool.handler({
                remoteInstanceId,
                cursor: 'abc',
                limit: 20,
                query: 'deploy',
                event: ['device.updated', 'flows.deployed'],
                username: 'alice'
            }, { inject })

            inject.firstCall.args[0].url.should.equal(
                `/api/v1/devices/${remoteInstanceId}/audit-log` +
                '?cursor=abc&limit=20&query=deploy&event=device.updated&event=flows.deployed&username=alice'
            )
        })

        it('exports to the /audit-log/export route when format is csv', async function () {
            inject.resolves({ statusCode: 200, json: () => ({}) })

            await tool.handler({ remoteInstanceId, format: 'csv', event: 'device.updated', username: 'alice' }, { inject })

            inject.firstCall.args[0].url.should.equal(
                `/api/v1/devices/${remoteInstanceId}/audit-log/export?event=device.updated&username=alice`
            )
        })

        it('reads the /audit-log route when format is json', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ log: [] }) })

            await tool.handler({ remoteInstanceId, format: 'json', event: 'device.updated' }, { inject })

            inject.firstCall.args[0].url.should.equal(
                `/api/v1/devices/${remoteInstanceId}/audit-log?event=device.updated`
            )
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ remoteInstanceId }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_list_team_provisioning_tokens', function () {
        const tool = getTool('platform_list_team_provisioning_tokens')

        it('injects the provisioning-tokens route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ tokens: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/devices/provisioning' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
