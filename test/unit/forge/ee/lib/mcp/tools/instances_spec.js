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

        it('requires either teamId or applicationId', async function () {
            const response = await tool.handler({}, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
        })

        it('rejects combining sort with orderByMostRecentFlows', async function () {
            // The route applies orderByMostRecentFlows only when sort produced no ordering, so
            // accepting both silently dropped the health-first ordering the caller asked for.
            const response = await tool.handler(
                { teamId: 'team1', sort: 'name', orderByMostRecentFlows: true, includeLiveStatus: true },
                { inject }
            )

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
            response.json().error.should.match(/cannot be combined/)
        })

        it('rejects orderByMostRecentFlows without includeLiveStatus', async function () {
            const response = await tool.handler({ teamId: 'team1', orderByMostRecentFlows: true }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().error.should.match(/requires includeLiveStatus/)
        })

        it('allows orderByMostRecentFlows alongside includeLiveStatus', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ count: 0, projects: [] }) })

            await tool.handler({ teamId: 'team1', orderByMostRecentFlows: true, includeLiveStatus: true }, { inject })

            inject.firstCall.args[0].url.should.match(/orderByMostRecentFlows=true/)
        })

        it('rejects passing both teamId and applicationId', async function () {
            const response = await tool.handler({ teamId: 'team1', applicationId: 'app1' }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().code.should.equal('invalid_request')
        })

        describe('scoped to an application', function () {
            it('rejects team-only sort params without calling the endpoint', async function () {
                const response = await tool.handler({ applicationId: 'app1', sort: 'name', orderByMostRecentFlows: true }, { inject })

                inject.called.should.be.false()
                response.statusCode.should.equal(400)
                response.json().code.should.equal('invalid_request')
                response.json().error.should.match(/sort, orderByMostRecentFlows/)
            })

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

                const response = await tool.handler({ applicationId: 'app1' }, { inject })

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

                const response = await tool.handler({ applicationId: 'app1', query: 'prod' }, { inject })

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

                const response = await tool.handler({ applicationId: 'app1', includeLiveStatus: true }, { inject })

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

                const response = await tool.handler({ applicationId: 'app1', state: ['running'] }, { inject })

                inject.calledTwice.should.be.true()
                response.json().instances.should.have.length(1)
                response.json().instances[0].id.should.equal('instance1')
            })

            it('passes through an error response from the instances list call', async function () {
                const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
                inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/instances' }).resolves(errorResponse)

                const response = await tool.handler({ applicationId: 'app1' }, { inject })
                response.should.equal(errorResponse)
            })

            it('passes through an error response from the status call', async function () {
                inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/instances' }).resolves({
                    statusCode: 200,
                    json: () => ({ count: 0, instances: [] })
                })
                const errorResponse = { statusCode: 500, json: () => ({ code: 'unexpected_error' }) }
                inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/instances/status' }).resolves(errorResponse)

                const response = await tool.handler({ applicationId: 'app1', includeLiveStatus: true }, { inject })
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

            it('passes sort and dir through on the team path', async function () {
                inject.resolves({
                    statusCode: 200,
                    json: () => ({ count: 0, meta: { page: 1, pageSize: 10, total: 0, pageCount: 1 }, projects: [] })
                })

                await tool.handler({ teamId: 'team1', sort: 'name', dir: 'asc' }, { inject })

                inject.firstCall.args[0].should.eql({
                    method: 'GET',
                    url: '/api/v1/teams/team1/projects?page=1&limit=10&sort=name&dir=asc'
                })
            })

            it('passes orderByMostRecentFlows through on the team path', async function () {
                inject.resolves({
                    statusCode: 200,
                    json: () => ({ count: 0, meta: { page: 1, pageSize: 10, total: 0, pageCount: 1 }, projects: [] })
                })

                // sort is deliberately absent: the route only honours orderByMostRecentFlows when
                // sort produced no ordering, so the two are mutually exclusive by design.
                await tool.handler({ teamId: 'team1', dir: 'asc', orderByMostRecentFlows: true, includeLiveStatus: true }, { inject })

                inject.firstCall.args[0].should.eql({
                    method: 'GET',
                    url: '/api/v1/teams/team1/projects?page=1&limit=10&includeMeta=true&dir=asc&orderByMostRecentFlows=true'
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

    describe('platform_get_hosted_instance_config', function () {
        const tool = getTool('platform_get_hosted_instance_config')

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

        it('reports success when at least one requested section was returned', async function () {
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/ha` }).resolves({ statusCode: 404, json: () => ({ code: 'not_found' }) })
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/protectInstance` }).resolves({ statusCode: 200, json: () => ({ enabled: true }) })

            const response = await tool.handler({ hostedInstanceId: instanceId, sections: ['ha', 'protection'] }, { inject })

            response.statusCode.should.equal(200)
        })

        it('keeps the per-section report readable when every requested section failed', async function () {
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/ha` }).resolves({ statusCode: 404, json: () => ({ code: 'not_found' }) })
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/protectInstance` }).resolves({ statusCode: 404, json: () => ({ code: 'not_found' }) })

            const response = await tool.handler({ hostedInstanceId: instanceId, sections: ['ha', 'protection'] }, { inject })

            // Each section already reports its own statusCode, so failing the envelope too only
            // pushed the whole report through formatResponse's error branch, which stringifies it.
            response.statusCode.should.equal(200)
            response.json().ha.statusCode.should.equal(404)
            response.json().protection.statusCode.should.equal(404)
        })
    })

    describe('platform_check_hosted_instance_name_availability', function () {
        const tool = getTool('platform_check_hosted_instance_name_availability')

        it('reports a free name as available', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ available: true }) })

            const response = await tool.handler({ name: 'a-free-name' }, { inject })

            response.statusCode.should.equal(200)
            response.json().available.should.equal(true)
        })

        it('reports a taken name as available: false rather than as an error', async function () {
            // The route answers 409 for a name that is taken or disallowed. That is the answer
            // this tool exists to give, so passing it back as an error envelope made a normal
            // negative result indistinguishable from the tool malfunctioning.
            inject.resolves({ statusCode: 409, json: () => ({ code: 'invalid_project_name', error: 'name in use' }) })

            const response = await tool.handler({ name: 'ladida' }, { inject })

            response.statusCode.should.equal(200)
            response.json().should.eql({ available: false, reason: 'name in use' })
        })

        it('keeps the reason distinct for a disallowed name', async function () {
            inject.resolves({ statusCode: 409, json: () => ({ code: 'invalid_project_name', error: 'name not allowed' }) })

            const response = await tool.handler({ name: 'admin' }, { inject })

            response.json().should.eql({ available: false, reason: 'name not allowed' })
        })

        it('still surfaces a genuine error', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_name', error: 'Invalid name' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ name: 'x' }, { inject })

            response.should.equal(errorResponse)
        })
    })

    describe('platform_create_hosted_instance', function () {
        const tool = getTool('platform_create_hosted_instance')

        it('blanks hidden template env values, as the read tools do', async function () {
            // GET /projects/:id blanks these; the create route does not, so without this the
            // same secrets platform_get_hosted_instance redacts came back here in plaintext.
            inject.resolves({
                statusCode: 200,
                json: () => ({
                    id: 'new-uuid',
                    template: {
                        settings: {
                            env: [
                                { name: 'SECRET', value: 'a-real-secret', hidden: true },
                                { name: 'PUBLIC', value: 'visible', hidden: false },
                                { name: 'NO_FLAG', value: 'also-visible' }
                            ]
                        }
                    }
                })
            })

            const response = await tool.handler({
                name: 'inst', applicationId: 'app1', projectType: 'pt1', stack: 'st1', template: 'tm1'
            }, { inject })

            response.json().template.settings.env.should.eql([
                { name: 'SECRET', value: '', hidden: true },
                { name: 'PUBLIC', value: 'visible', hidden: false },
                { name: 'NO_FLAG', value: 'also-visible' }
            ])
        })

        it('does not fall over when the response carries no template env', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'new-uuid' }) })

            const response = await tool.handler({
                name: 'inst', applicationId: 'app1', projectType: 'pt1', stack: 'st1', template: 'tm1'
            }, { inject })

            response.json().should.eql({ id: 'new-uuid' })
        })

        it('passes an error response straight through', async function () {
            const errorResponse = { statusCode: 409, json: () => ({ code: 'invalid_project_name', error: 'name in use' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({
                name: 'inst', applicationId: 'app1', projectType: 'pt1', stack: 'st1', template: 'tm1'
            }, { inject })

            response.should.equal(errorResponse)
        })
    })

    describe('platform_get_hosted_instance_custom_hostname', function () {
        const tool = getTool('platform_get_hosted_instance_custom_hostname')

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
            // Each part carries its own status, as get_hosted_instance_config does. Reporting the
            // composed body under the first response's error status sent it down formatResponse's
            // error branch, which stringified the whole thing into one unreadable `error` field.
            response.statusCode.should.equal(200)
            response.json().should.eql({
                hostname: { statusCode: 200, data: { hostname: 'my.example.com' } },
                status: { statusCode: 410, data: { code: 'not_verified' } }
            })
        })

        it('still reports both parts, as a success, when the hostname itself 404s', async function () {
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/customHostname` }).resolves({ statusCode: 404, json: () => ({ code: 'not_found', error: 'Not Found' }) })
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/customHostname/status` }).resolves({ statusCode: 200, json: () => ({ verified: true }) })

            const response = await tool.handler({ hostedInstanceId: instanceId, includeStatus: true }, { inject })

            response.statusCode.should.equal(200)
            response.json().hostname.statusCode.should.equal(404)
            response.json().status.data.should.eql({ verified: true })
        })

        it('stays readable when both parts fail, which is the no-hostname-configured case', async function () {
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/customHostname` }).resolves({ statusCode: 404, json: () => ({ code: 'not_found', error: 'Not Found' }) })
            inject.withArgs({ method: 'GET', url: `/api/v1/projects/${instanceId}/customHostname/status` }).resolves({ statusCode: 404, json: () => ({ code: 'not_found', error: 'Not Found' }) })

            const response = await tool.handler({ hostedInstanceId: instanceId, includeStatus: true }, { inject })

            // An error status here would send the composed body down formatResponse's error
            // branch and stringify the per-part report into one unreadable `error` field.
            response.statusCode.should.equal(200)
            response.json().hostname.statusCode.should.equal(404)
            response.json().status.statusCode.should.equal(404)
        })
    })

    describe('platform_list_hosted_instance_files', function () {
        const tool = getTool('platform_list_hosted_instance_files')

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
