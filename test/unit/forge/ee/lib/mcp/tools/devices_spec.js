const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/devices')
const { basePaginationKeys, searchQueryKeys, auditLogFilterKeys } = FF_UTIL.require('forge/ee/lib/mcp/schemas')
const findTool = toolFinder(tools)

// The device audit-log route honors cursor+limit, free-text query, and
// event/username, but has no scope/includeChildren parameters.
const auditLogKeys = [...basePaginationKeys, ...searchQueryKeys, ...auditLogFilterKeys]

describe('MCP Device Read Tools', function () {
    function stubInject (response = { statusCode: 200, json: () => ({}) }) {
        return sinon.stub().resolves(response)
    }

    const toolDefinitions = [
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
            name: 'platform_get_remote_instance_history',
            param: 'remoteInstanceId',
            base: id => `/api/v1/devices/${id}/history`,
            queryKeys: basePaginationKeys
        },
        {
            name: 'platform_list_remote_instance_http_tokens',
            param: 'remoteInstanceId',
            base: id => `/api/v1/devices/${id}/httpTokens`,
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
            const tool = findTool('platform_get_remote_instance_audit_log')
            const inject = stubInject()
            const args = { remoteInstanceId: 'device1', event: ['flows.set', 'device.updated'], limit: 5 }

            await tool.handler(args, { inject })

            const call = inject.firstCall.args[0]
            call.url.should.equal('/api/v1/devices/device1/audit-log?limit=5&event=flows.set&event=device.updated')
        })

        it('serialises the `username` filter alongside other query params', async function () {
            const tool = findTool('platform_get_remote_instance_audit_log')
            const inject = stubInject()
            const args = { remoteInstanceId: 'device1', username: 'alice', limit: 20 }

            await tool.handler(args, { inject })

            const call = inject.firstCall.args[0]
            call.url.should.equal('/api/v1/devices/device1/audit-log?limit=20&username=alice')
        })
    })

    describe('platform_list_team_provisioning_tokens', function () {
        const tool = findTool('platform_list_team_provisioning_tokens')

        it('has the teamId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET /api/v1/teams/:teamId/devices/provisioning', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/devices/provisioning')
        })
    })
})

describe('MCP Device Read Tools - integration smoke', function () {
    const setup = require('../../../setup')

    let app
    let token
    let team
    let instance
    let application
    let device

    before(async function () {
        app = await setup({
            ai: { enabled: true },
            expert: { enabled: true }
        })
        token = await createExpertMcpToken(app)

        team = app.team
        instance = app.instance
        application = app.application

        // Enable the HTTP bearer token feature so the device httpTokens route hits a real 200, not the "disabled" guard.
        const defaultTeamTypeProperties = app.defaultTeamType.properties
        defaultTeamTypeProperties.features = {
            ...defaultTeamTypeProperties.features,
            teamHttpSecurity: true
        }
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()

        device = await app.factory.createDevice({ name: 'devices-spec-device' }, team, instance, application)

        // Seed one real audit-log entry and one HTTP token so assertions compare actual data, not an empty-list shape.
        await app.db.controllers.AuditLog.deviceLog(device.id, app.user.id, 'flows.set', { type: 'flows' })
        await app.db.controllers.AccessToken.createHTTPNodeToken(device, 'device-http-token', [''])
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

    describe('tool-vs-route equivalence', function () {
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

        it('platform_get_remote_instance_history matches GET /api/v1/devices/:deviceId/history', async function () {
            const tool = findTool('platform_get_remote_instance_history')
            await expectToolMatchesRoute(inject, tool, { remoteInstanceId: device.hashid }, {
                method: 'GET',
                url: `/api/v1/devices/${device.hashid}/history`
            })
        })

        it('platform_list_remote_instance_http_tokens matches GET /api/v1/devices/:deviceId/httpTokens', async function () {
            const tool = findTool('platform_list_remote_instance_http_tokens')
            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { remoteInstanceId: device.hashid }, {
                method: 'GET',
                url: `/api/v1/devices/${device.hashid}/httpTokens`
            })
            routeResponse.statusCode.should.equal(200)
            const body = routeResponse.json()
            body.should.have.property('count', 1)
            body.tokens[0].should.have.property('name', 'device-http-token')
        })

        it('platform_list_team_provisioning_tokens matches GET /api/v1/teams/:teamId/devices/provisioning', async function () {
            await app.db.controllers.AccessToken.createTokenForTeamDeviceProvisioning('equivalence-test-token', app.team)

            const tool = findTool('platform_list_team_provisioning_tokens')
            const { routeResponse } = await expectToolMatchesRoute(inject, tool, { teamId: app.team.hashid }, {
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/devices/provisioning`
            })
            routeResponse.statusCode.should.equal(200)
            routeResponse.json().tokens.should.not.be.empty()
        })
    })
})
