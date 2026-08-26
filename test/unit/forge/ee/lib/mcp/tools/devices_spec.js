const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/devices')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Devices Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_remote_instances', function () {
        const tool = getTool('platform_list_remote_instances')

        it('calls the team devices endpoint when no applicationId is given, defaulting to page 1', async function () {
            inject.resolves({
                statusCode: 200,
                json: () => ({
                    count: 193,
                    meta: { page: 1, pageSize: 10, total: 193, pageCount: 20 },
                    devices: [
                        {
                            id: 'device1',
                            name: 'Acme Edge - appliance',
                            ownerType: 'application',
                            mode: 'autonomous',
                            status: 'running',
                            onlineStatus: 'offline',
                            lastSeenAt: '2026-06-02T11:04:00.000Z',
                            lastSeenMs: 4820000000,
                            team: { id: 'team1', name: 'Acme' },
                            application: { id: 'app1', name: 'Acme Plant' }
                        }
                    ]
                })
            })

            const response = await tool.handler({ teamId: 'team1', limit: 10 }, { inject })

            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/teams/team1/devices?page=1&limit=10' })
            response.json().should.eql({
                count: 193,
                meta: { page: 1, pageSize: 10, total: 193, pageCount: 20 },
                devices: [
                    {
                        id: 'device1',
                        name: 'Acme Edge - appliance',
                        ownerType: 'application',
                        mode: 'autonomous',
                        requiredStatus: 'running',
                        liveStatus: 'offline',
                        lastSeenAt: '2026-06-02T11:04:00.000Z',
                        lastSeenMs: 4820000000,
                        team: { id: 'team1', name: 'Acme' },
                        application: { id: 'app1', name: 'Acme Plant' }
                    }
                ]
            })
        })

        it('calls the application devices endpoint when applicationId is given', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ count: 0, devices: [] }) })

            await tool.handler({ teamId: 'team1', applicationId: 'app1', query: 'edge', page: 2, limit: 5 }, { inject })

            inject.firstCall.args[0].should.eql({
                method: 'GET',
                url: '/api/v1/applications/app1/devices?page=2&limit=5&query=edge'
            })
        })

        it('calls the project devices endpoint when hostedInstanceId is given, taking priority over applicationId', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ count: 0, devices: [] }) })

            await tool.handler({ teamId: 'team1', applicationId: 'app1', hostedInstanceId: 'instance1', limit: 10 }, { inject })

            inject.firstCall.args[0].should.eql({
                method: 'GET',
                url: '/api/v1/projects/instance1/devices?page=1&limit=10'
            })
        })

        it('filters by mode using the filters=mode:x query param, matching the dashboard', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ count: 0, devices: [] }) })

            await tool.handler({ teamId: 'team1', mode: 'developer', limit: 10 }, { inject })

            inject.firstCall.args[0].should.eql({
                method: 'GET',
                url: '/api/v1/teams/team1/devices?page=1&limit=10&filters=mode%3Adeveloper'
            })
        })

        it('reports ownerType null and no application for an unassigned device', async function () {
            inject.resolves({
                statusCode: 200,
                json: () => ({
                    count: 1,
                    devices: [{
                        id: 'device1',
                        name: 'unassigned-device',
                        ownerType: null,
                        status: 'offline',
                        onlineStatus: 'not-seen',
                        lastSeenAt: null,
                        lastSeenMs: null,
                        team: { id: 'team1', name: 'Acme' }
                    }]
                })
            })

            const response = await tool.handler({ teamId: 'team1', limit: 10 }, { inject })

            should(response.json().devices[0].ownerType).be.null()
            should(response.json().devices[0].application).be.undefined()
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 500, json: () => ({ code: 'unexpected_error' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1', limit: 10 }, { inject })
            response.should.equal(errorResponse)
        })

        it('looks the cached live state up per device, not by the hostedInstanceId filter', async function () {
            inject.resolves({
                statusCode: 200,
                json: () => ({
                    count: 2,
                    meta: { page: 1, pageSize: 10, total: 2, pageCount: 1 },
                    devices: [
                        { id: 'device1', name: 'one', status: 'running', onlineStatus: 'offline' },
                        { id: 'device2', name: 'two', status: 'running', onlineStatus: 'offline' }
                    ]
                })
            })
            const getLiveCachedState = sinon.stub()
            getLiveCachedState.withArgs('device1').resolves('running')
            getLiveCachedState.withArgs('device2').resolves(null)
            const app = { db: { controllers: { Device: { getLiveCachedState } } } }

            const response = await tool.handler(
                { teamId: 'team1', hostedInstanceId: 'a-project-uuid' },
                { inject, app }
            )

            // Each row is looked up by its own device id. Passing the hostedInstanceId filter
            // here instead gave every row one shared, wrong lookup, so liveStatus always fell
            // back to the stored onlineStatus.
            getLiveCachedState.calledWith('device1').should.be.true()
            getLiveCachedState.calledWith('device2').should.be.true()
            getLiveCachedState.calledWith('a-project-uuid').should.be.false()

            const { devices } = response.json()
            devices[0].liveStatus.should.equal('running')
            devices[1].liveStatus.should.equal('offline')
        })
    })

    describe('platform_list_team_provisioning_tokens', function () {
        const tool = getTool('platform_list_team_provisioning_tokens')

        it('injects the provisioning-tokens route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ meta: {}, count: 0, tokens: [] }) }
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
