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

    describe('platform_create_device_group', function () {
        const tool = getTool('platform_create_device_group')

        it('posts the group payload and returns the response', async function () {
            const routeResponse = { statusCode: 201, json: () => ({ id: 'group1' }) }
            inject.withArgs({ method: 'POST', url: '/api/v1/applications/app1/device-groups', payload: { name: 'Factory floor', description: 'east wing' } }).resolves(routeResponse)

            const response = await tool.handler({ applicationId: 'app1', name: 'Factory floor', description: 'east wing' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('defaults description to an empty string, since a null one breaks the listings', async function () {
            inject.resolves({ statusCode: 201, json: () => ({ id: 'group1' }) })

            await tool.handler({ applicationId: 'app1', name: 'Factory floor' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ name: 'Factory floor', description: '' })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ applicationId: 'app1', name: 'Factory floor' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_update_device_group', function () {
        const tool = getTool('platform_update_device_group')

        it('rejects an update with nothing to change, which the route answers 200 to', async function () {
            const response = await tool.handler({ applicationId: 'app1', groupId: 'group1' }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
        })

        it('is marked destructive, since pinning a snapshot deploys it to every member', function () {
            tool.annotations.destructiveHint.should.be.true()
        })

        it('puts only the provided fields onto the group route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({}) }
            inject.withArgs({ method: 'PUT', url: '/api/v1/applications/app1/device-groups/group1', payload: { name: 'Renamed group' } }).resolves(routeResponse)

            const response = await tool.handler({ applicationId: 'app1', groupId: 'group1', name: 'Renamed group' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('forwards a target snapshot pin', async function () {
            inject.resolves({ statusCode: 200, json: () => ({}) })

            await tool.handler({ applicationId: 'app1', groupId: 'group1', targetSnapshotId: 'snapshot1' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ targetSnapshotId: 'snapshot1' })
        })

        it('forwards a null target snapshot to clear the pin', async function () {
            inject.resolves({ statusCode: 200, json: () => ({}) })

            await tool.handler({ applicationId: 'app1', groupId: 'group1', targetSnapshotId: null }, { inject })

            inject.firstCall.args[0].payload.should.eql({ targetSnapshotId: null })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_input' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ applicationId: 'app1', groupId: 'group1', targetSnapshotId: 'other' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_update_device_group_membership', function () {
        const tool = getTool('platform_update_device_group_membership')

        it('rejects a membership change with nothing to change', async function () {
            const response = await tool.handler({ applicationId: 'app1', groupId: 'group1' }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
        })

        it('is marked destructive, since set replaces the whole membership', function () {
            tool.annotations.destructiveHint.should.be.true()
        })

        it('patches add and remove lists onto the group route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({}) }
            inject.withArgs({ method: 'PATCH', url: '/api/v1/applications/app1/device-groups/group1', payload: { add: ['device1'], remove: ['device2'] } }).resolves(routeResponse)

            const response = await tool.handler({ applicationId: 'app1', groupId: 'group1', add: ['device1'], remove: ['device2'] }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('patches a set list to replace the whole membership', async function () {
            inject.resolves({ statusCode: 200, json: () => ({}) })

            await tool.handler({ applicationId: 'app1', groupId: 'group1', set: ['device1', 'device3'] }, { inject })

            inject.firstCall.args[0].payload.should.eql({ set: ['device1', 'device3'] })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_input' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ applicationId: 'app1', groupId: 'group1', add: ['foreign-device'] }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_update_device_group_settings', function () {
        const tool = getTool('platform_update_device_group_settings')

        it('is marked destructive, since env is a full replacement', function () {
            tool.annotations.destructiveHint.should.be.true()
        })

        it('puts the env list onto the group settings route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ status: 'okay' }) }
            inject.withArgs({
                method: 'PUT',
                url: '/api/v1/applications/app1/device-groups/group1/settings',
                payload: { env: [{ name: 'FOO', value: 'bar' }] }
            }).resolves(routeResponse)

            const response = await tool.handler({ applicationId: 'app1', groupId: 'group1', env: [{ name: 'FOO', value: 'bar' }] }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('forwards hidden env vars untouched', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ status: 'okay' }) })

            await tool.handler({ applicationId: 'app1', groupId: 'group1', env: [{ name: 'SECRET', value: '', hidden: true }] }, { inject })

            inject.firstCall.args[0].payload.should.eql({ env: [{ name: 'SECRET', value: '', hidden: true }] })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_input' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ applicationId: 'app1', groupId: 'group1', env: [{ name: '1BAD', value: 'x' }] }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
