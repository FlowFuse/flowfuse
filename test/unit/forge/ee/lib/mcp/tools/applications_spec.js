const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/applications')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Applications Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_applications', function () {
        const tool = getTool('platform_list_applications')

        it('injects the team applications route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ applications: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/applications?includeInstances=false&includeApplicationDevices=false' }).resolves(routeResponse)

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

    describe('platform_get_application', function () {
        const tool = getTool('platform_get_application')

        it('injects the application route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'app1' }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1' }).resolves(routeResponse)

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

    describe('platform_get_application_audit_log', function () {
        const tool = getTool('platform_get_application_audit_log')

        it('injects the audit-log route with no query string when no filters are set', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ log: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/audit-log' }).resolves(routeResponse)

            const response = await tool.handler({ applicationId: 'app1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('serialises cursor, limit, query, username and scope onto the audit-log route', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ log: [] }) })

            await tool.handler({
                applicationId: 'app1',
                cursor: 'c1',
                limit: 10,
                query: 'deploy',
                event: 'application.created',
                username: 'alice',
                scope: 'application'
            }, { inject })

            inject.firstCall.args[0].url.should.equal(
                '/api/v1/applications/app1/audit-log?cursor=c1&limit=10&query=deploy&event=application.created&username=alice&scope=application'
            )
        })

        it('serialises an array of event names as repeated event params', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ log: [] }) })

            await tool.handler({ applicationId: 'app1', event: ['application.created', 'application.updated'] }, { inject })

            inject.firstCall.args[0].url.should.equal('/api/v1/applications/app1/audit-log?event=application.created&event=application.updated')
        })

        it('serialises includeChildren onto the audit-log route', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ log: [] }) })

            await tool.handler({ applicationId: 'app1', includeChildren: true }, { inject })

            inject.firstCall.args[0].url.should.equal('/api/v1/applications/app1/audit-log?includeChildren=true')
        })

        it('reads from the audit-log route', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ log: [] }) })

            await tool.handler({
                applicationId: 'app1',
                cursor: 'c1',
                limit: 10,
                query: 'deploy',
                event: 'application.created',
                username: 'alice',
                scope: 'application',
                includeChildren: true
            }, { inject })

            inject.firstCall.args[0].url.should.equal(
                '/api/v1/applications/app1/audit-log?cursor=c1&limit=10&query=deploy&event=application.created&username=alice&scope=application&includeChildren=true'
            )
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ applicationId: 'app1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_create_application', function () {
        const tool = getTool('platform_create_application')

        it('posts the application payload and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'app1' }) }
            inject.withArgs({ method: 'POST', url: '/api/v1/applications', payload: { name: 'New App', teamId: 'team1', description: 'desc' } }).resolves(routeResponse)

            const response = await tool.handler({ name: 'New App', teamId: 'team1', description: 'desc' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('omits description from the payload when it is not set', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'app1' }) })

            await tool.handler({ name: 'New App', teamId: 'team1' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ name: 'New App', teamId: 'team1' })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_request' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ name: 'New App', teamId: 'team1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_list_application_snapshots', function () {
        const tool = getTool('platform_list_application_snapshots')

        it('injects the snapshots route with no query string when no filters are set', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ snapshots: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/snapshots' }).resolves(routeResponse)

            const response = await tool.handler({ applicationId: 'app1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('serialises cursor and limit onto the snapshots route', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ snapshots: [] }) })

            await tool.handler({ applicationId: 'app1', cursor: 'c1', limit: 20 }, { inject })

            inject.firstCall.args[0].url.should.equal('/api/v1/applications/app1/snapshots?cursor=c1&limit=20')
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ applicationId: 'app1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_list_team_instance_statuses', function () {
        const tool = getTool('platform_list_team_instance_statuses')

        it('injects the team application statuses route with no query string when associationsLimit is not set', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ applications: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/applications/status' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('serialises associationsLimit onto the team application statuses route', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ applications: [] }) })

            await tool.handler({ teamId: 'team1', associationsLimit: 5 }, { inject })

            inject.firstCall.args[0].url.should.equal('/api/v1/teams/team1/applications/status?associationsLimit=5')
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
