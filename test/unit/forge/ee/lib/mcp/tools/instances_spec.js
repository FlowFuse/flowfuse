const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/instances')
const { basePaginationKeys, searchQueryKeys, auditLogFilterKeys } = FF_UTIL.require('forge/ee/lib/mcp/schemas')
const findTool = toolFinder(tools)

// audit-log routes honor cursor+limit, free-text query, and event/username.
// scope + includeChildren are honored on the hosted-instance route.
const auditLogKeys = [...basePaginationKeys, ...searchQueryKeys, ...auditLogFilterKeys]
const auditLogScopedKeys = [...auditLogKeys, 'scope', 'includeChildren']

describe('MCP Tools: instance configuration', function () {
    const instanceId = '11111111-1111-1111-1111-111111111111'

    const readOnlyTools = [
        { name: 'platform_get_instance_ha', schemaKeys: ['hostedInstanceId'], method: 'GET', url: `/api/v1/projects/${instanceId}/ha` },
        { name: 'platform_get_instance_custom_hostname', schemaKeys: ['hostedInstanceId'], method: 'GET', url: `/api/v1/projects/${instanceId}/customHostname` },
        { name: 'platform_get_instance_custom_hostname_status', schemaKeys: ['hostedInstanceId'], method: 'GET', url: `/api/v1/projects/${instanceId}/customHostname/status` },
        { name: 'platform_get_instance_protection', schemaKeys: ['hostedInstanceId'], method: 'GET', url: `/api/v1/projects/${instanceId}/protectInstance` },
        { name: 'platform_get_instance_auto_update_stack', schemaKeys: ['hostedInstanceId'], method: 'GET', url: `/api/v1/projects/${instanceId}/autoUpdateStack` },
        { name: 'platform_list_instance_http_tokens', schemaKeys: ['hostedInstanceId'], method: 'GET', url: `/api/v1/projects/${instanceId}/httpTokens` }
    ]

    readOnlyTools.forEach(({ name, schemaKeys, method, url }) => {
        describe(name, function () {
            it('is registered with readOnlyHint true and destructiveHint false', function () {
                const tool = findTool(name)
                tool.annotations.should.have.property('readOnlyHint', true)
                tool.annotations.should.have.property('destructiveHint', false)
            })

            it('declares the expected inputSchema keys', function () {
                const tool = findTool(name)
                Object.keys(tool.inputSchema).should.deepEqual(schemaKeys)
            })

            it('calls the expected method and url', async function () {
                const tool = findTool(name)
                const { calls, inject } = recordingInject()
                await tool.handler({ hostedInstanceId: instanceId }, { inject })
                calls.should.have.length(1)
                calls[0].should.have.property('method', method)
                calls[0].should.have.property('url', url)
            })
        })
    })

    describe('platform_list_instance_files', function () {
        const name = 'platform_list_instance_files'

        it('is registered with readOnlyHint true and destructiveHint false', function () {
            const tool = findTool(name)
            tool.annotations.should.have.property('readOnlyHint', true)
            tool.annotations.should.have.property('destructiveHint', false)
        })

        it('declares the expected inputSchema keys', function () {
            const tool = findTool(name)
            Object.keys(tool.inputSchema).should.deepEqual(['hostedInstanceId', 'path'])
        })

        it('calls the expected method and url for the root path', async function () {
            const tool = findTool(name)
            const { calls, inject } = recordingInject()
            await tool.handler({ hostedInstanceId: instanceId, path: '' }, { inject })
            calls.should.have.length(1)
            calls[0].should.have.property('method', 'GET')
            calls[0].should.have.property('url', `/api/v1/projects/${instanceId}/files/_/`)
        })

        it('encodes the path segment', async function () {
            const tool = findTool(name)
            const { calls, inject } = recordingInject()
            const path = 'sub dir/nested'
            await tool.handler({ hostedInstanceId: instanceId, path }, { inject })
            calls.should.have.length(1)
            calls[0].url.should.equal(`/api/v1/projects/${instanceId}/files/_/${encodeURIComponent(path)}`)
            calls[0].url.should.equal(`/api/v1/projects/${instanceId}/files/_/sub%20dir%2Fnested`)
        })
    })
})

describe('MCP Tools: hosted instance observability', function () {
    function stubInject (response = { statusCode: 200, json: () => ({}) }) {
        return sinon.stub().resolves(response)
    }

    const toolDefinitions = [
        {
            name: 'platform_get_hosted_instance_audit_log',
            param: 'hostedInstanceId',
            base: id => `/api/v1/projects/${id}/audit-log`,
            queryKeys: auditLogScopedKeys
        },
        {
            name: 'platform_export_hosted_instance_audit_log',
            param: 'hostedInstanceId',
            base: id => `/api/v1/projects/${id}/audit-log/export`,
            queryKeys: auditLogScopedKeys
        },
        {
            name: 'platform_get_hosted_instance_history',
            param: 'hostedInstanceId',
            base: id => `/api/v1/projects/${id}/history`,
            queryKeys: basePaginationKeys
        },
        {
            name: 'platform_get_hosted_instance_resources',
            param: 'hostedInstanceId',
            base: id => `/api/v1/projects/${id}/resources`,
            queryKeys: null
        }
    ]

    toolDefinitions.forEach(def => {
        describe(def.name, function () {
            it('is registered as a read-only, non-destructive tool', function () {
                const tool = findTool(def.name)
                tool.annotations.should.have.property('readOnlyHint', true)
                tool.annotations.should.have.property('destructiveHint', false)
            })

            it('exposes the expected inputSchema keys', function () {
                const tool = findTool(def.name)
                const expectedKeys = [def.param, ...(def.queryKeys || [])]
                Object.keys(tool.inputSchema).sort().should.deepEqual(expectedKeys.sort())
            })

            it('calls inject with the correct method and bare URL when no query params are given', async function () {
                const tool = findTool(def.name)
                const inject = stubInject()
                const args = { [def.param]: 'abc123' }

                await tool.handler(args, { inject })

                inject.calledOnce.should.be.true()
                const call = inject.firstCall.args[0]
                call.method.should.equal('GET')
                call.url.should.equal(def.base('abc123'))
            })

            if (def.queryKeys) {
                it('serialises pagination params onto the URL', async function () {
                    const tool = findTool(def.name)
                    const inject = stubInject()
                    // limit is honored by every paginated tool here; query is not
                    // (the history route takes only cursor/limit), so assert on limit.
                    const args = { [def.param]: 'abc123', limit: 10 }

                    await tool.handler(args, { inject })

                    const call = inject.firstCall.args[0]
                    call.url.should.equal(`${def.base('abc123')}?limit=10`)
                })
            }
        })
    })

    describe('audit-log tools', function () {
        it('serialises an array `event` filter as one repeated query param per element', async function () {
            const tool = findTool('platform_get_hosted_instance_audit_log')
            const inject = stubInject()
            const args = { hostedInstanceId: 'instance1', event: ['user.login', 'user.logout'], limit: 5 }

            await tool.handler(args, { inject })

            const call = inject.firstCall.args[0]
            call.url.should.equal('/api/v1/projects/instance1/audit-log?limit=5&event=user.login&event=user.logout')
        })

        it('serialises the `username` filter alongside other query params', async function () {
            const tool = findTool('platform_get_hosted_instance_audit_log')
            const inject = stubInject()
            const args = { hostedInstanceId: 'instance1', username: 'alice', limit: 20 }

            await tool.handler(args, { inject })

            const call = inject.firstCall.args[0]
            call.url.should.equal('/api/v1/projects/instance1/audit-log?limit=20&username=alice')
        })

        it('serialises the scope and includeChildren filters where the route supports them', async function () {
            const tool = findTool('platform_get_hosted_instance_audit_log')
            const inject = stubInject()
            const args = { hostedInstanceId: 'instance1', scope: 'device', includeChildren: true }

            await tool.handler(args, { inject })

            const call = inject.firstCall.args[0]
            call.url.should.equal('/api/v1/projects/instance1/audit-log?scope=device&includeChildren=true')
        })
    })

    describe('pass-through response handling', function () {
        it('returns the raw inject response unchanged, without intercepting 404s', async function () {
            const tool = findTool('platform_get_hosted_instance_resources')
            const notFoundResponse = { statusCode: 404, json: () => ({ code: 'not_found', error: 'Not Found' }) }
            const inject = stubInject(notFoundResponse)

            const result = await tool.handler({ hostedInstanceId: 'instance1' }, { inject })

            result.should.equal(notFoundResponse)
        })
    })
})

describe('MCP Tools: team instance lists', function () {
    describe('platform_list_team_projects', function () {
        const tool = findTool('platform_list_team_projects')

        it('has the expected input params', function () {
            Object.keys(tool.inputSchema).should.eql([
                'teamId', 'query', 'sort', 'dir', 'includeMeta', 'orderByMostRecentFlows', 'limit', 'page'
            ])
        })

        it('calls GET with only the supported, defined params serialised', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', sort: 'name', dir: 'desc', limit: 10 }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/projects?sort=name&dir=desc&limit=10')
        })

        it('url-encodes a query value with special characters', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1', query: 'a b&c=d' }, { inject })
            calls[0].url.should.equal('/api/v1/teams/team1/projects?query=a+b%26c%3Dd')
        })
    })

    describe('platform_list_team_dashboard_instances', function () {
        const tool = findTool('platform_list_team_dashboard_instances')

        it('has the teamId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET /api/v1/teams/:teamId/dashboard-instances', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/dashboard-instances')
        })
    })
})

describe('MCP instance configuration tools - integration', function () {
    const setup = require('../../../setup')
    let app
    let token
    let configInstance

    before(async function () {
        app = await setup({
            ai: { enabled: true },
            expert: { enabled: true },
            // Billing disabled: stub Stripe key would reject the real container-start call used to seed the static file store.
            billing: undefined,
            driver: {
                type: 'stub',
                options: {
                    customHostname: {
                        enabled: true,
                        cnameTarget: 'cname.example.com'
                    }
                }
            }
        })
        token = await createExpertMcpToken(app)

        // customHostname/protectedInstance/ha default on; enable staticAssets and teamHttpSecurity too so their routes can be exercised below.
        const defaultTeamTypeProperties = app.defaultTeamType.properties
        defaultTeamTypeProperties.features = {
            ...defaultTeamTypeProperties.features,
            staticAssets: true,
            teamHttpSecurity: true
        }
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()

        // Use a dedicated instance so the default fixture instance (app.project) stays untouched for the smoke test below.
        configInstance = await app.factory.createInstance(
            { name: 'config-instance' },
            app.application,
            app.stack,
            app.template,
            app.projectType,
            { start: false }
        )
        const startResult = await app.containers.start(configInstance)
        await startResult.started

        await configInstance.updateHASettings({ replicas: 2 })
        await configInstance.setCustomHostname('custom.example.com')
        await configInstance.updateProtectedInstanceState({ enabled: true })
        await configInstance.updateSetting('stackUpgradeHour_2', { hour: 3, restart: true })

        await app.db.controllers.AccessToken.createHTTPNodeToken(configInstance, 'instance-http-token', [''])
    })

    after(async function () {
        await app.close()
    })

    function inject (options) {
        return app.inject({
            ...options,
            headers: {
                ...(options.headers || {}),
                authorization: `Bearer ${token}`
            }
        })
    }

    describe('smoke test', function () {
        it('platform_get_instance_auto_update_stack returns the restart schedule for the default instance', async function () {
            // No plan gate on auto-update-stack scheduling, so this works against the default fixture instance.
            const tool = findTool('platform_get_instance_auto_update_stack')
            const response = await tool.handler({ hostedInstanceId: app.project.id }, { inject })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.be.an.Array()
            body.should.have.length(0)
        })
    })

    // Confirms each tool hits the real route (expert-mcp-token inject) using {method, url} derived from the
    // route registration - see forge/ee/routes/index.js and forge/ee/routes/<feature>/index.js.
    describe('tool vs route equivalence', function () {
        it('platform_get_instance_ha matches GET /api/v1/projects/:instanceId/ha', async function () {
            const tool = findTool('platform_get_instance_ha')
            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { hostedInstanceId: configInstance.id }, {
                method: 'GET',
                url: `/api/v1/projects/${configInstance.id}/ha`
            })
            routeResponse.statusCode.should.equal(200)
            routeResponse.json().should.have.property('replicas', 2)
        })

        it('platform_get_instance_custom_hostname matches GET /api/v1/projects/:instanceId/customHostname', async function () {
            // The route returns the hostname as a bare string once set, so compare raw payloads instead of
            // expectToolMatchesRoute, which parses both sides as JSON.
            const tool = findTool('platform_get_instance_custom_hostname')
            const viaTool = await tool.handler({ hostedInstanceId: configInstance.id }, { inject })
            const routeResponse = await inject({ method: 'GET', url: `/api/v1/projects/${configInstance.id}/customHostname` })
            viaTool.statusCode.should.equal(routeResponse.statusCode)
            viaTool.statusCode.should.equal(200)
            viaTool.payload.should.equal(routeResponse.payload)
            viaTool.payload.should.equal('custom.example.com')
        })

        it('platform_get_instance_custom_hostname_status matches GET /api/v1/projects/:instanceId/customHostname/status', async function () {
            const tool = findTool('platform_get_instance_custom_hostname_status')
            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { hostedInstanceId: configInstance.id }, {
                method: 'GET',
                url: `/api/v1/projects/${configInstance.id}/customHostname/status`
            })
            // The CNAME target doesn't resolve to our custom hostname in this environment, so the route reports 410 instead of 200.
            routeResponse.statusCode.should.equal(410)
        })

        it('platform_get_instance_protection matches GET /api/v1/projects/:instanceId/protectInstance', async function () {
            const tool = findTool('platform_get_instance_protection')
            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { hostedInstanceId: configInstance.id }, {
                method: 'GET',
                url: `/api/v1/projects/${configInstance.id}/protectInstance`
            })
            routeResponse.statusCode.should.equal(200)
            routeResponse.json().should.have.property('enabled', true)
        })

        it('platform_get_instance_auto_update_stack matches GET /api/v1/projects/:instanceId/autoUpdateStack', async function () {
            const tool = findTool('platform_get_instance_auto_update_stack')
            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { hostedInstanceId: configInstance.id }, {
                method: 'GET',
                url: `/api/v1/projects/${configInstance.id}/autoUpdateStack`
            })
            routeResponse.statusCode.should.equal(200)
            const body = routeResponse.json()
            body.should.have.length(1)
            body[0].should.have.property('day', 2)
        })

        it('platform_list_instance_files matches GET /api/v1/projects/:instanceId/files/_/', async function () {
            // Seed via the container driver, not the POST route - creating files isn't in the expert-mcp token's allow-list.
            await app.containers.createDirectory(configInstance, '', 'uploads')

            // Freeze the clock since the stub driver stamps listing entries with `new Date()`, keeping lastModified in sync.
            const clock = sinon.useFakeTimers({ now: Date.now(), toFake: ['Date'] })
            let routeResponse
            try {
                const tool = findTool('platform_list_instance_files')
                ;({ routeResponse } = await expectToolMatchesRoute(inject, tool, { hostedInstanceId: configInstance.id, path: '' }, {
                    method: 'GET',
                    url: `/api/v1/projects/${configInstance.id}/files/_/`
                }))
            } finally {
                clock.restore()
            }
            routeResponse.statusCode.should.equal(200)
            const body = routeResponse.json()
            body.should.have.property('count', 1)
            body.files[0].should.have.property('name', 'uploads')
        })

        it('platform_list_instance_http_tokens matches GET /api/v1/projects/:instanceId/httpTokens', async function () {
            const tool = findTool('platform_list_instance_http_tokens')
            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { hostedInstanceId: configInstance.id }, {
                method: 'GET',
                url: `/api/v1/projects/${configInstance.id}/httpTokens`
            })
            routeResponse.statusCode.should.equal(200)
            const body = routeResponse.json()
            body.should.have.property('count', 1)
            body.tokens[0].should.have.property('name', 'instance-http-token')
        })
    })
})

describe('MCP hosted instance read tools - integration', function () {
    const setup = require('../../../setup')

    let app
    let token
    let instance
    let team

    before(async function () {
        app = await setup({
            ai: { enabled: true },
            expert: { enabled: true }
        })
        token = await createExpertMcpToken(app)

        team = app.team
        instance = app.instance

        // Enable plan-gated features so equivalence tests hit the real 200, not the "disabled" guard.
        const defaultTeamTypeProperties = app.defaultTeamType.properties
        defaultTeamTypeProperties.features.instanceResources = true
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()

        // Seed one real audit entry so assertions compare actual data, not an empty-list shape.
        await app.db.controllers.AuditLog.projectLog(instance.id, app.user.id, 'flows.set', { type: 'flows' })

        // A dashboard-module instance so platform_list_team_dashboard_instances returns a row.
        const dashboardApplication = await app.factory.createApplication({ name: 'dashboard-application' }, team)
        await app.factory.createInstance(
            { name: 'dashboard-instance' },
            dashboardApplication,
            app.stack,
            app.template,
            app.projectType,
            {
                start: false,
                settings: {
                    palette: { modules: [{ name: '@flowfuse/node-red-dashboard', version: '~1.15.0', local: true }] }
                }
            }
        )
    })

    after(async function () {
        await app.close()
    })

    function inject (options) {
        return app.inject({
            ...options,
            headers: {
                ...(options.headers || {}),
                authorization: `Bearer ${token}`
            }
        })
    }

    it('platform_get_hosted_instance_audit_log matches GET /api/v1/projects/:instanceId/audit-log, including query params', async function () {
        const tool = findTool('platform_get_hosted_instance_audit_log')
        await expectToolMatchesRoute(inject, tool, { hostedInstanceId: instance.id, username: app.user.username, limit: 5 }, {
            method: 'GET',
            url: `/api/v1/projects/${instance.id}/audit-log?limit=5&username=${app.user.username}`
        })
    })

    it('platform_export_hosted_instance_audit_log matches GET /api/v1/projects/:instanceId/audit-log/export', async function () {
        const tool = findTool('platform_export_hosted_instance_audit_log')
        await expectToolMatchesRoute(inject, tool, { hostedInstanceId: instance.id }, {
            method: 'GET',
            url: `/api/v1/projects/${instance.id}/audit-log/export`,
            raw: true
        })
    })

    it('platform_get_hosted_instance_history matches GET /api/v1/projects/:instanceId/history', async function () {
        const tool = findTool('platform_get_hosted_instance_history')
        await expectToolMatchesRoute(inject, tool, { hostedInstanceId: instance.id }, {
            method: 'GET',
            url: `/api/v1/projects/${instance.id}/history`
        })
    })

    it('platform_get_hosted_instance_resources matches GET /api/v1/projects/:instanceId/resources', async function () {
        // The stub container driver returns fresh random point-in-time values on
        // every call, so bodies are never byte-identical; normalize to compare shape only.
        const shapeOnly = (body) => ({
            meta: body.meta,
            count: body.count,
            resourcesLength: body.resources.length,
            resourceKeys: body.resources[0] && Object.keys(body.resources[0]).sort()
        })
        const tool = findTool('platform_get_hosted_instance_resources')
        await expectToolMatchesRoute(inject, tool, { hostedInstanceId: instance.id }, {
            method: 'GET',
            url: `/api/v1/projects/${instance.id}/resources`,
            normalize: shapeOnly
        })
    })

    it('platform_list_team_projects matches GET /api/v1/teams/:teamId/projects', async function () {
        const tool = findTool('platform_list_team_projects')
        await expectToolMatchesRoute(inject, tool, { teamId: team.hashid }, {
            method: 'GET',
            url: `/api/v1/teams/${team.hashid}/projects`
        })
    })

    it('platform_list_team_dashboard_instances matches GET /api/v1/teams/:teamId/dashboard-instances', async function () {
        const tool = findTool('platform_list_team_dashboard_instances')
        const { routeResponse } = await expectToolMatchesRoute(inject, tool, { teamId: team.hashid }, {
            method: 'GET',
            url: `/api/v1/teams/${team.hashid}/dashboard-instances`
        })
        routeResponse.statusCode.should.equal(200)
        routeResponse.json().projects.should.have.length(1)
    })
})
