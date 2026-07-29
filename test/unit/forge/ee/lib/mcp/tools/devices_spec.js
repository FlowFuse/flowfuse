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
    })
})
