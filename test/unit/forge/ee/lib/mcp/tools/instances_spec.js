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

            it('passes through an error response', async function () {
                const errorResponse = { statusCode: 500, json: () => ({ code: 'unexpected_error' }) }
                inject.resolves(errorResponse)

                const response = await tool.handler({ teamId: 'team1' }, { inject })
                response.should.equal(errorResponse)
            })
        })
    })
})
