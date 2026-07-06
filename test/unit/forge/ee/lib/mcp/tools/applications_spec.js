const should = require('should') // eslint-disable-line no-unused-vars

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')
const setup = require('../../../setup')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/applications')
const findTool = toolFinder(tools)

describe('MCP Application Tools', function () {
    describe('platform_get_application_remote_instances', function () {
        const tool = findTool('platform_get_application_remote_instances')

        it('has read-only annotations', function () {
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

        it('exposes the expected input fields', function () {
            Object.keys(tool.inputSchema).should.eql(['applicationId', 'cursor', 'limit', 'page', 'query'])
        })

        it('requests the devices endpoint with no query string when no filters are given', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ applicationId: 'app1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/applications/app1/devices')
        })

        it('serialises cursor, limit, page and query onto the query string', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ applicationId: 'app1', query: 'foo bar', cursor: 'c1', limit: 5, page: 2 }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/applications/app1/devices?cursor=c1&limit=5&page=2&query=foo+bar')
        })
    })

    describe('platform_get_application_audit_log', function () {
        const tool = findTool('platform_get_application_audit_log')

        it('has read-only annotations', function () {
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

        it('exposes the expected input fields', function () {
            Object.keys(tool.inputSchema).should.eql(['applicationId', 'cursor', 'limit', 'query', 'event', 'username', 'scope'])
        })

        it('requests the audit-log endpoint with no query string when no filters are given', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ applicationId: 'app1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/applications/app1/audit-log')
        })

        it('serialises cursor, limit, event, username and scope onto the query string', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({
                applicationId: 'app1',
                cursor: 'c1',
                limit: 10,
                event: 'application.created',
                username: 'alice',
                scope: 'application'
            }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/applications/app1/audit-log?cursor=c1&limit=10&event=application.created&username=alice&scope=application')
        })

        it('serialises an array of event names as repeated event params', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({
                applicationId: 'app1',
                event: ['application.created', 'application.updated']
            }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/applications/app1/audit-log?event=application.created&event=application.updated')
        })
    })

    describe('platform_list_application_snapshots', function () {
        const tool = findTool('platform_list_application_snapshots')

        it('has read-only annotations', function () {
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

        it('exposes the expected input fields', function () {
            Object.keys(tool.inputSchema).should.eql(['applicationId', 'cursor', 'limit'])
        })

        it('requests the snapshots endpoint with no query string when no filters are given', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ applicationId: 'app1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/applications/app1/snapshots')
        })

        it('serialises cursor and limit onto the query string', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ applicationId: 'app1', cursor: 'c1', limit: 20 }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/applications/app1/snapshots?cursor=c1&limit=20')
        })
    })

    describe('Integration smoke test', function () {
        let app
        let token

        before(async function () {
            app = await setup({ ai: { enabled: true }, expert: { enabled: true } })
            token = await createExpertMcpToken(app)
        })

        after(async function () {
            await app.close()
        })

        it('lists application snapshots for a real application via the tool handler', async function () {
            const tool = findTool('platform_list_application_snapshots')
            const inject = (options) => app.inject({
                ...options,
                headers: { ...(options.headers || {}), authorization: `Bearer ${token}` }
            })

            const response = await tool.handler({ applicationId: app.application.hashid }, { inject })

            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('snapshots')
            body.snapshots.should.be.an.Array()
            body.should.have.property('count')
        })

        describe('Tool responses match their backing routes', function () {
            let device

            function inject (options) {
                return app.inject({
                    ...options,
                    headers: { ...(options.headers || {}), authorization: `Bearer ${token}` }
                })
            }

            before(async function () {
                device = await app.factory.createDevice({ name: 'mcp-app-device' }, app.team, null, app.application)
                await app.auditLog.Application.application.created(app.user.id, null, app.application)
                await app.auditLog.Application.application.updated(app.user.id, null, app.application, { name: 'updated name' })
            })

            it('platform_list_applications matches GET /api/v1/teams/:teamId/applications', async function () {
                const tool = findTool('platform_list_applications')
                const { routeResponse } = await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                    method: 'GET',
                    url: `/api/v1/teams/${app.team.hashid}/applications?includeInstances=false&includeApplicationDevices=false`
                })
                routeResponse.json().applications.map(a => a.id).should.containEql(app.application.hashid)
            })

            it('platform_get_application matches GET /api/v1/applications/:applicationId', async function () {
                const tool = findTool('platform_get_application')
                const { routeResponse } = await expectToolMatchesRoute(inject, tool, { applicationId: app.application.hashid }, {
                    method: 'GET',
                    url: `/api/v1/applications/${app.application.hashid}`
                })
                routeResponse.json().id.should.equal(app.application.hashid)
            })

            it('platform_get_application_hosted_instances matches GET /api/v1/applications/:applicationId/instances', async function () {
                const tool = findTool('platform_get_application_hosted_instances')
                const { routeResponse } = await expectToolMatchesRoute(inject, tool, { applicationId: app.application.hashid }, {
                    method: 'GET',
                    url: `/api/v1/applications/${app.application.hashid}/instances`
                })
                routeResponse.json().instances.map(i => i.id).should.containEql(app.instance.id)
            })

            it('platform_get_application_remote_instances matches GET /api/v1/applications/:applicationId/devices', async function () {
                const tool = findTool('platform_get_application_remote_instances')
                const { routeResponse } = await expectToolMatchesRoute(inject, tool, { applicationId: app.application.hashid, limit: 10 }, {
                    method: 'GET',
                    url: `/api/v1/applications/${app.application.hashid}/devices?limit=10`
                })
                routeResponse.json().devices.map(d => d.id).should.containEql(device.hashid)
            })

            it('platform_get_application_instances_status matches GET /api/v1/applications/:applicationId/instances/status', async function () {
                const tool = findTool('platform_get_application_instances_status')
                const { routeResponse } = await expectToolMatchesRoute(inject, tool, { applicationId: app.application.hashid }, {
                    method: 'GET',
                    url: `/api/v1/applications/${app.application.hashid}/instances/status`
                })
                routeResponse.json().instances.map(i => i.id).should.containEql(app.instance.id)
            })

            it('platform_get_application_audit_log matches GET /api/v1/applications/:applicationId/audit-log', async function () {
                const tool = findTool('platform_get_application_audit_log')
                const { routeResponse } = await expectToolMatchesRoute(inject, tool, { applicationId: app.application.hashid, limit: 10 }, {
                    method: 'GET',
                    url: `/api/v1/applications/${app.application.hashid}/audit-log?limit=10`
                })
                routeResponse.json().log.length.should.be.above(0)
            })

            it('platform_get_application_audit_log filters by event when requested', async function () {
                const tool = findTool('platform_get_application_audit_log')
                const { routeResponse } = await expectToolMatchesRoute(inject, tool, { applicationId: app.application.hashid, event: 'application.created' }, {
                    method: 'GET',
                    url: `/api/v1/applications/${app.application.hashid}/audit-log?event=application.created`
                })
                routeResponse.json().log.length.should.equal(1)
            })

            it('platform_list_application_snapshots matches GET /api/v1/applications/:applicationId/snapshots', async function () {
                const tool = findTool('platform_list_application_snapshots')
                await expectToolMatchesRoute(inject, tool, { applicationId: app.application.hashid }, {
                    method: 'GET',
                    url: `/api/v1/applications/${app.application.hashid}/snapshots`
                })
            })
        })
    })
})
