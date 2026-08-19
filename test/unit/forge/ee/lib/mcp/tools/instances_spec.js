const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/instances')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Instances Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_hosted_instances', function () {
        const tool = getTool('platform_list_hosted_instances')

        describe('scoped to an application', function () {
            it('lists instances without live status by default', async function () {
                inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/instances' }).resolves({
                    statusCode: 200,
                    json: () => ({
                        count: 2,
                        instances: [
                            { id: 'instance1', name: 'running-instance', url: 'https://running.example.com' },
                            { id: 'instance2', name: 'stopped-instance' }
                        ]
                    })
                })

                const response = await tool.handler({ teamId: 'team1', applicationId: 'app1' }, { inject })

                inject.calledOnce.should.be.true()
                response.statusCode.should.equal(200)
                response.json().should.eql({
                    count: 2,
                    instances: [
                        { id: 'instance1', name: 'running-instance', url: 'https://running.example.com', state: undefined },
                        { id: 'instance2', name: 'stopped-instance', url: undefined, state: undefined }
                    ]
                })
            })

            it('filters by name when query is set', async function () {
                inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/instances' }).resolves({
                    statusCode: 200,
                    json: () => ({
                        count: 2,
                        instances: [
                            { id: 'instance1', name: 'production' },
                            { id: 'instance2', name: 'staging' }
                        ]
                    })
                })

                const response = await tool.handler({ teamId: 'team1', applicationId: 'app1', query: 'prod' }, { inject })

                response.json().instances.should.have.length(1)
                response.json().instances[0].id.should.equal('instance1')
            })

            it('merges live status when includeLiveStatus is true', async function () {
                inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/instances' }).resolves({
                    statusCode: 200,
                    json: () => ({
                        count: 1,
                        instances: [{ id: 'instance1', name: 'production', url: 'https://prod.example.com' }]
                    })
                })
                inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/instances/status' }).resolves({
                    statusCode: 200,
                    json: () => ({
                        count: 1,
                        instances: [{ id: 'instance1', meta: { state: 'running' } }]
                    })
                })

                const response = await tool.handler({ teamId: 'team1', applicationId: 'app1', includeLiveStatus: true }, { inject })

                inject.calledTwice.should.be.true()
                response.json().instances[0].state.should.equal('running')
            })

            it('fetches live status and filters by state when state is set, even without includeLiveStatus', async function () {
                inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/instances' }).resolves({
                    statusCode: 200,
                    json: () => ({
                        count: 2,
                        instances: [
                            { id: 'instance1', name: 'production' },
                            { id: 'instance2', name: 'staging' }
                        ]
                    })
                })
                inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/instances/status' }).resolves({
                    statusCode: 200,
                    json: () => ({
                        count: 2,
                        instances: [
                            { id: 'instance1', meta: { state: 'running' } },
                            { id: 'instance2', meta: { state: 'stopped' } }
                        ]
                    })
                })

                const response = await tool.handler({ teamId: 'team1', applicationId: 'app1', state: ['running'] }, { inject })

                inject.calledTwice.should.be.true()
                response.json().instances.should.have.length(1)
                response.json().instances[0].id.should.equal('instance1')
            })

            it('passes through an error response from the instances list call', async function () {
                const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
                inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/instances' }).resolves(errorResponse)

                const response = await tool.handler({ teamId: 'team1', applicationId: 'app1' }, { inject })
                response.should.equal(errorResponse)
            })

            it('passes through an error response from the status call', async function () {
                inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/instances' }).resolves({
                    statusCode: 200,
                    json: () => ({ count: 0, instances: [] })
                })
                const errorResponse = { statusCode: 500, json: () => ({ code: 'unexpected_error' }) }
                inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/instances/status' }).resolves(errorResponse)

                const response = await tool.handler({ teamId: 'team1', applicationId: 'app1', includeLiveStatus: true }, { inject })
                response.should.equal(errorResponse)
            })
        })

        describe('scoped to a team', function () {
            it('defaults to page 1 with a limit of 10', async function () {
                inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/projects?page=1&limit=10' }).resolves({
                    statusCode: 200,
                    json: () => ({
                        count: 1,
                        meta: { page: 1, pageSize: 10, total: 1, pageCount: 1 },
                        projects: [
                            {
                                id: 'instance1',
                                name: 'production',
                                url: 'https://prod.example.com',
                                application: { id: 'app1', name: 'Acme Plant' },
                                projectType: { id: 'type1', name: 'type-cloud' },
                                stack: { id: 'stack1', name: 'stack-123', label: 'Node-RED 3.1' },
                                template: { id: 'tmpl1', name: 'Default' }
                            }
                        ]
                    })
                })

                const response = await tool.handler({ teamId: 'team1' }, { inject })

                response.json().should.eql({
                    count: 1,
                    meta: { page: 1, pageSize: 10, total: 1, pageCount: 1 },
                    instances: [
                        {
                            id: 'instance1',
                            name: 'production',
                            url: 'https://prod.example.com',
                            application: { id: 'app1', name: 'Acme Plant' },
                            projectType: { id: 'type1', name: 'type-cloud' },
                            stack: { id: 'stack1', name: 'stack-123', label: 'Node-RED 3.1' },
                            template: { id: 'tmpl1', name: 'Default' },
                            state: undefined
                        }
                    ]
                })
            })

            it('expands the "error" state group into its raw states and forwards includeLiveStatus as includeMeta', async function () {
                inject.resolves({
                    statusCode: 200,
                    json: () => ({ count: 0, meta: { page: 1, pageSize: 10, total: 0, pageCount: 1 }, projects: [] })
                })

                await tool.handler({ teamId: 'team1', page: 2, limit: 5, state: ['error'], includeLiveStatus: true }, { inject })

                inject.firstCall.args[0].should.eql({
                    method: 'GET',
                    url: '/api/v1/teams/team1/projects?page=2&limit=5&state=error&state=crashed&includeMeta=true'
                })
            })

            it('expands the "running" and "notRunning" state groups the same way the dashboard filter does', async function () {
                inject.resolves({
                    statusCode: 200,
                    json: () => ({ count: 0, meta: { page: 1, pageSize: 25, total: 0, pageCount: 1 }, projects: [] })
                })

                await tool.handler({ teamId: 'team1', state: ['running'] }, { inject })

                inject.firstCall.args[0].should.eql({
                    method: 'GET',
                    url: '/api/v1/teams/team1/projects?page=1&limit=10' +
                        '&state=importing&state=connected&state=info&state=success&state=pushing&state=pulling&state=loading' +
                        '&state=updating&state=installing&state=safe&state=protected&state=running&state=warning&state=starting'
                })

                await tool.handler({ teamId: 'team1', state: ['notRunning'] }, { inject })

                inject.secondCall.args[0].should.eql({
                    method: 'GET',
                    url: '/api/v1/teams/team1/projects?page=1&limit=10' +
                        '&state=stopping&state=restarting&state=suspending&state=rollback&state=stopped&state=suspended&state=offline&state=unknown'
                })
            })

            it('passes sort, dir and orderByMostRecentFlows through on the team path', async function () {
                inject.resolves({
                    statusCode: 200,
                    json: () => ({ count: 0, meta: { page: 1, pageSize: 10, total: 0, pageCount: 1 }, projects: [] })
                })

                await tool.handler({ teamId: 'team1', sort: 'name', dir: 'asc', orderByMostRecentFlows: true }, { inject })

                inject.firstCall.args[0].should.eql({
                    method: 'GET',
                    url: '/api/v1/teams/team1/projects?page=1&limit=10&sort=name&dir=asc&orderByMostRecentFlows=true'
                })
            })

            it('passes through an error response', async function () {
                const errorResponse = { statusCode: 500, json: () => ({ code: 'unexpected_error' }) }
                inject.resolves(errorResponse)

                const response = await tool.handler({ teamId: 'team1' }, { inject })
                response.should.equal(errorResponse)
            })
        })
    })

    const instanceId = '11111111-1111-1111-1111-111111111111'

    // Single-route GET-by-id readers: each injects one URL and returns the response verbatim.
    const passthroughGetTools = [
        { name: 'platform_get_hosted_instance_resources', url: `/api/v1/projects/${instanceId}/resources` }
    ]

    passthroughGetTools.forEach(({ name, url }) => {
        describe(name, function () {
            const tool = getTool(name)

            it(`injects GET ${url} and returns the response`, async function () {
                const routeResponse = { statusCode: 200, json: () => ({ ok: true }) }
                inject.withArgs({ method: 'GET', url }).resolves(routeResponse)

                const response = await tool.handler({ hostedInstanceId: instanceId }, { inject })

                inject.calledOnce.should.be.true()
                response.should.equal(routeResponse)
            })

            it('passes through an error response', async function () {
                const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
                inject.resolves(errorResponse)

                const response = await tool.handler({ hostedInstanceId: instanceId }, { inject })
                response.should.equal(errorResponse)
            })
        })
    })

    describe('platform_get_instance_config', function () {
        const tool = getTool('platform_get_instance_config')

        it('fetches all three sections and keys them when sections is omitted', async function () {
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/ha` }).resolves({ statusCode: 200, json: () => ({ replicas: 2 }) })
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/protectInstance` }).resolves({ statusCode: 200, json: () => ({ enabled: true }) })
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/autoUpdateStack` }).resolves({ statusCode: 404, json: () => ({ code: 'not_found' }) })

            const response = await tool.handler({ hostedInstanceId: instanceId }, { inject })

            inject.calledThrice.should.be.true()
            response.json().should.eql({
                ha: { statusCode: 200, data: { replicas: 2 } },
                protection: { statusCode: 200, data: { enabled: true } },
                autoUpdateStack: { statusCode: 404, data: { code: 'not_found' } }
            })
        })

        it('preserves an array payload such as the autoUpdateStack schedule', async function () {
            const schedule = [{ hour: 2, day: 0, restart: true }, { hour: 3, day: 4, restart: false }]
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/autoUpdateStack` }).resolves({ statusCode: 200, json: () => schedule })

            const response = await tool.handler({ hostedInstanceId: instanceId, sections: ['autoUpdateStack'] }, { inject })

            inject.calledOnce.should.be.true()
            response.json().should.eql({ autoUpdateStack: { statusCode: 200, data: schedule } })
        })

        it('fetches only the requested sections', async function () {
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/ha` }).resolves({ statusCode: 200, json: () => ({ replicas: 3 }) })

            const response = await tool.handler({ hostedInstanceId: instanceId, sections: ['ha'] }, { inject })

            inject.calledOnce.should.be.true()
            response.json().should.eql({ ha: { statusCode: 200, data: { replicas: 3 } } })
        })
    })

    describe('platform_get_instance_custom_hostname', function () {
        const tool = getTool('platform_get_instance_custom_hostname')

        it('returns the custom hostname response directly without includeStatus', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ hostname: 'my.example.com' }) }
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/customHostname` }).resolves(routeResponse)

            const response = await tool.handler({ hostedInstanceId: instanceId }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('also fetches the verification status when includeStatus is true', async function () {
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/customHostname` }).resolves({ statusCode: 200, json: () => ({ hostname: 'my.example.com' }) })
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/customHostname/status` }).resolves({ statusCode: 410, json: () => ({ code: 'not_verified' }) })

            const response = await tool.handler({ hostedInstanceId: instanceId, includeStatus: true }, { inject })

            inject.calledTwice.should.be.true()
            response.json().should.eql({
                hostname: { hostname: 'my.example.com' },
                status: { code: 'not_verified' }
            })
        })
    })

    describe('platform_list_instance_http_tokens', function () {
        const tool = getTool('platform_list_instance_http_tokens')

        it('lists hosted instance HTTP tokens via the projects route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ tokens: [] }) }
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/httpTokens` }).resolves(routeResponse)

            const response = await tool.handler({ instanceId, instanceType: 'hosted' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('lists remote instance HTTP tokens via the devices route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ tokens: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/devices/device1/httpTokens' }).resolves(routeResponse)

            const response = await tool.handler({ instanceId: 'device1', instanceType: 'remote' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })
    })

    describe('platform_list_instance_files', function () {
        const tool = getTool('platform_list_instance_files')

        it('lists the file-store root for an empty path', async function () {
            const url = `/api/v1/projects/${instanceId}/files/_/`
            const routeResponse = { statusCode: 200, json: () => ({ files: [] }) }
            inject.withArgs({ method: 'GET', url }).resolves(routeResponse)

            const response = await tool.handler({ hostedInstanceId: instanceId, path: '' }, { inject })

            response.should.equal(routeResponse)
        })

        it('URL-encodes the requested path', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ files: [] }) })

            await tool.handler({ hostedInstanceId: instanceId, path: 'sub dir/data' }, { inject })

            inject.firstCall.args[0].url.should.equal(`/api/v1/projects/${instanceId}/files/_/sub%20dir%2Fdata`)
        })
    })

    describe('platform_get_hosted_instance_audit_log', function () {
        const tool = getTool('platform_get_hosted_instance_audit_log')

        it('injects the audit-log route with no query string when no filters are set', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ log: [] }) })

            await tool.handler({ hostedInstanceId: instanceId }, { inject })

            inject.firstCall.args[0].url.should.equal(`/api/v1/projects/${instanceId}/audit-log`)
        })

        it('serialises cursor/limit/query, an event array, username, scope and includeChildren', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ log: [] }) })

            await tool.handler({
                hostedInstanceId: instanceId,
                cursor: 'abc',
                limit: 20,
                query: 'deploy',
                event: ['project.created', 'flows.deployed'],
                username: 'alice',
                scope: 'device',
                includeChildren: true
            }, { inject })

            inject.firstCall.args[0].url.should.equal(
                `/api/v1/projects/${instanceId}/audit-log` +
                '?cursor=abc&limit=20&query=deploy&event=project.created&event=flows.deployed&username=alice&scope=device&includeChildren=true'
            )
        })

        it('exports to the CSV route when format is csv', async function () {
            inject.resolves({ statusCode: 200, json: () => ({}) })

            await tool.handler({ hostedInstanceId: instanceId, format: 'csv', event: 'flows.deployed', scope: 'project' }, { inject })

            inject.firstCall.args[0].url.should.equal(
                `/api/v1/projects/${instanceId}/audit-log/export?event=flows.deployed&scope=project`
            )
        })
    })

    describe('platform_get_instance_history', function () {
        const tool = getTool('platform_get_instance_history')

        it('serialises cursor and limit onto the hosted instance history route', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ timeline: [] }) })

            await tool.handler({ instanceId, instanceType: 'hosted', cursor: 'c1', limit: 5 }, { inject })

            inject.firstCall.args[0].url.should.equal(`/api/v1/projects/${instanceId}/history?cursor=c1&limit=5`)
        })

        it('reads remote instance history via the devices route', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ timeline: [] }) })

            await tool.handler({ instanceId: 'device1', instanceType: 'remote', limit: 5 }, { inject })

            inject.firstCall.args[0].url.should.equal('/api/v1/devices/device1/history?limit=5')
        })
    })

    describe('platform_list_team_dashboard_instances', function () {
        const tool = getTool('platform_list_team_dashboard_instances')

        it('injects the team dashboard-instances route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ projects: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/dashboard-instances' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })
    })
})
