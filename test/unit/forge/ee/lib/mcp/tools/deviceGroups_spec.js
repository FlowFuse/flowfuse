const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/deviceGroups')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Device Groups Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_team_device_groups', function () {
        const tool = getTool('platform_list_team_device_groups')

        it('injects the team device groups route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ count: 0, groups: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/device-groups?cursor=c1&limit=25&query=foo' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1', cursor: 'c1', limit: 25, query: 'foo' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('omits undefined query params', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ count: 0, groups: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/device-groups' }).resolves(routeResponse)

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

    describe('platform_list_application_device_groups', function () {
        const tool = getTool('platform_list_application_device_groups')

        it('injects the application device groups route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ count: 0, groups: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/device-groups?cursor=c1&limit=25&query=foo' }).resolves(routeResponse)

            const response = await tool.handler({ applicationId: 'app1', cursor: 'c1', limit: 25, query: 'foo' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('omits undefined query params', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ count: 0, groups: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/device-groups' }).resolves(routeResponse)

            const response = await tool.handler({ applicationId: 'app1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ applicationId: 'app1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_application_device_group', function () {
        const tool = getTool('platform_get_application_device_group')

        it('injects the single device group route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'group1' }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/device-groups/group1' }).resolves(routeResponse)

            const response = await tool.handler({ applicationId: 'app1', groupId: 'group1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ applicationId: 'app1', groupId: 'group1' }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
