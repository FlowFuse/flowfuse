const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/observability')
const { basePaginationKeys, searchQueryKeys, auditLogFilterKeys } = FF_UTIL.require('forge/ee/lib/mcp/schemas')
const findTool = toolFinder(tools)

// audit-log routes honor cursor+limit, free-text query, and event/username.
// scope + includeChildren are honored on team/instance/application routes but
// not the device route, so they are listed per tool below.
const auditLogKeys = [...basePaginationKeys, ...searchQueryKeys, ...auditLogFilterKeys]
const auditLogScopedKeys = [...auditLogKeys, 'scope', 'includeChildren']

describe('MCP Observability Tools', function () {
    function stubInject (response = { statusCode: 200, json: () => ({}) }) {
        return sinon.stub().resolves(response)
    }

    const toolDefinitions = [
        {
            name: 'platform_get_team_audit_log',
            param: 'teamId',
            base: id => `/api/v1/teams/${id}/audit-log`,
            queryKeys: auditLogScopedKeys
        },
        {
            name: 'platform_export_team_audit_log',
            param: 'teamId',
            base: id => `/api/v1/teams/${id}/audit-log/export`,
            queryKeys: auditLogScopedKeys
        },
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
            name: 'platform_get_remote_instance_audit_log',
            param: 'remoteInstanceId',
            base: id => `/api/v1/devices/${id}/audit-log`,
            queryKeys: auditLogKeys
        },
        {
            name: 'platform_export_remote_instance_audit_log',
            param: 'remoteInstanceId',
            base: id => `/api/v1/devices/${id}/audit-log/export`,
            queryKeys: auditLogKeys
        },
        {
            name: 'platform_export_application_audit_log',
            param: 'applicationId',
            base: id => `/api/v1/applications/${id}/audit-log/export`,
            queryKeys: auditLogScopedKeys
        },
        {
            name: 'platform_get_hosted_instance_history',
            param: 'hostedInstanceId',
            base: id => `/api/v1/projects/${id}/history`,
            queryKeys: basePaginationKeys
        },
        {
            name: 'platform_get_remote_instance_history',
            param: 'remoteInstanceId',
            base: id => `/api/v1/devices/${id}/history`,
            queryKeys: basePaginationKeys
        },
        {
            name: 'platform_get_hosted_instance_resources',
            param: 'hostedInstanceId',
            base: id => `/api/v1/projects/${id}/resources`,
            queryKeys: null
        },
        {
            name: 'platform_get_team_bom',
            param: 'teamId',
            base: id => `/api/v1/teams/${id}/bom`,
            queryKeys: null
        },
        {
            name: 'platform_get_application_bom',
            param: 'applicationId',
            base: id => `/api/v1/applications/${id}/bom`,
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
                    // (the history routes take only cursor/limit), so assert on limit.
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
            const tool = findTool('platform_get_team_audit_log')
            const inject = stubInject()
            const args = { teamId: 'team1', event: ['user.login', 'user.logout'], limit: 5 }

            await tool.handler(args, { inject })

            const call = inject.firstCall.args[0]
            call.url.should.equal('/api/v1/teams/team1/audit-log?limit=5&event=user.login&event=user.logout')
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
            const tool = findTool('platform_get_team_audit_log')
            const inject = stubInject()
            const args = { teamId: 'team1', scope: 'application', includeChildren: true }

            await tool.handler(args, { inject })

            const call = inject.firstCall.args[0]
            call.url.should.equal('/api/v1/teams/team1/audit-log?scope=application&includeChildren=true')
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

describe('MCP Observability Tools - integration smoke', function () {
    const setup = require('../../../setup')

    let app
    let token

    before(async function () {
        app = await setup({
            ai: { enabled: true },
            expert: { enabled: true }
        })
        token = await createExpertMcpToken(app)
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

    it('reads the team audit log via the underlying route', async function () {
        const tool = tools.find(t => t.name === 'platform_get_team_audit_log')

        const response = await tool.handler({ teamId: app.team.hashid }, { inject })

        response.statusCode.should.equal(200)
        const body = response.json()
        body.should.have.property('meta')
        body.should.have.property('count')
        body.should.have.property('log')
        body.log.should.be.an.Array()
    })

    describe('tool-vs-route equivalence', function () {
        let team
        let instance
        let application
        let device

        before(async function () {
            team = app.team
            instance = app.instance
            application = app.application

            // Enable plan-gated features so equivalence tests hit the real 200, not the "disabled" guard.
            const defaultTeamTypeProperties = app.defaultTeamType.properties
            defaultTeamTypeProperties.features.bom = true
            app.defaultTeamType.properties = defaultTeamTypeProperties
            await app.defaultTeamType.save()

            device = await app.factory.createDevice({ name: 'observability-device' }, team, instance, application)

            // Seed one real entry per scope so assertions compare actual data, not an empty-list shape.
            await app.db.controllers.AuditLog.teamLog(team.id, app.user.id, 'team.settings.updated', { settings: { name: team.name } })
            await app.db.controllers.AuditLog.projectLog(instance.id, app.user.id, 'flows.set', { type: 'flows' })
            await app.db.controllers.AuditLog.deviceLog(device.id, app.user.id, 'flows.set', { type: 'flows' })

            await instance.update({ versions: { 'node-red': { wanted: '4.0.3', current: '4.0.2' } } })
        })

        it('platform_get_team_audit_log matches GET /api/v1/teams/:teamId/audit-log, including query params', async function () {
            const tool = findTool('platform_get_team_audit_log')
            await expectToolMatchesRoute(inject, tool, { teamId: team.hashid, event: 'team.settings.updated', limit: 5 }, {
                method: 'GET',
                url: `/api/v1/teams/${team.hashid}/audit-log?limit=5&event=team.settings.updated`
            })
        })

        it('platform_export_team_audit_log matches GET /api/v1/teams/:teamId/audit-log/export', async function () {
            const tool = findTool('platform_export_team_audit_log')
            await expectToolMatchesRoute(inject, tool, { teamId: team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${team.hashid}/audit-log/export`,
                raw: true
            })
        })

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

        it('platform_get_remote_instance_audit_log matches GET /api/v1/devices/:deviceId/audit-log', async function () {
            const tool = findTool('platform_get_remote_instance_audit_log')
            await expectToolMatchesRoute(inject, tool, { remoteInstanceId: device.hashid }, {
                method: 'GET',
                url: `/api/v1/devices/${device.hashid}/audit-log`
            })
        })

        it('platform_export_remote_instance_audit_log matches GET /api/v1/devices/:deviceId/audit-log/export', async function () {
            const tool = findTool('platform_export_remote_instance_audit_log')
            await expectToolMatchesRoute(inject, tool, { remoteInstanceId: device.hashid }, {
                method: 'GET',
                url: `/api/v1/devices/${device.hashid}/audit-log/export`,
                raw: true
            })
        })

        it('platform_export_application_audit_log matches GET /api/v1/applications/:applicationId/audit-log/export', async function () {
            const tool = findTool('platform_export_application_audit_log')
            await expectToolMatchesRoute(inject, tool, { applicationId: application.hashid }, {
                method: 'GET',
                url: `/api/v1/applications/${application.hashid}/audit-log/export`,
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

        it('platform_get_remote_instance_history matches GET /api/v1/devices/:deviceId/history', async function () {
            const tool = findTool('platform_get_remote_instance_history')
            await expectToolMatchesRoute(inject, tool, { remoteInstanceId: device.hashid }, {
                method: 'GET',
                url: `/api/v1/devices/${device.hashid}/history`
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

        it('platform_get_team_bom matches GET /api/v1/teams/:teamId/bom', async function () {
            const tool = findTool('platform_get_team_bom')
            await expectToolMatchesRoute(inject, tool, { teamId: team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${team.hashid}/bom`
            })
        })

        it('platform_get_application_bom matches GET /api/v1/applications/:applicationId/bom', async function () {
            const tool = findTool('platform_get_application_bom')
            await expectToolMatchesRoute(inject, tool, { applicationId: application.hashid }, {
                method: 'GET',
                url: `/api/v1/applications/${application.hashid}/bom`
            })
        })
    })
})
