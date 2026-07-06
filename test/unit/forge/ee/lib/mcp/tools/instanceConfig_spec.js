const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/instanceConfig')
const findTool = toolFinder(tools)

describe('MCP Tools: instanceConfig', function () {
    const instanceId = '11111111-1111-1111-1111-111111111111'
    const deviceId = 'abc123'

    const readOnlyTools = [
        { name: 'platform_get_instance_ha', schemaKeys: ['hostedInstanceId'], method: 'GET', url: `/api/v1/projects/${instanceId}/ha` },
        { name: 'platform_get_instance_custom_hostname', schemaKeys: ['hostedInstanceId'], method: 'GET', url: `/api/v1/projects/${instanceId}/customHostname` },
        { name: 'platform_get_instance_custom_hostname_status', schemaKeys: ['hostedInstanceId'], method: 'GET', url: `/api/v1/projects/${instanceId}/customHostname/status` },
        { name: 'platform_get_instance_protection', schemaKeys: ['hostedInstanceId'], method: 'GET', url: `/api/v1/projects/${instanceId}/protectInstance` },
        { name: 'platform_get_instance_auto_update_stack', schemaKeys: ['hostedInstanceId'], method: 'GET', url: `/api/v1/projects/${instanceId}/autoUpdateStack` },
        { name: 'platform_list_instance_http_tokens', schemaKeys: ['hostedInstanceId'], method: 'GET', url: `/api/v1/projects/${instanceId}/httpTokens` },
        { name: 'platform_list_remote_instance_http_tokens', schemaKeys: ['remoteInstanceId'], method: 'GET', url: `/api/v1/devices/${deviceId}/httpTokens`, args: { remoteInstanceId: deviceId } }
    ]

    readOnlyTools.forEach(({ name, schemaKeys, method, url, args }) => {
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
                await tool.handler(args || { hostedInstanceId: instanceId }, { inject })
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

    describe('integration tests', function () {
        const setup = require('../../../setup')
        let app
        let token
        let configInstance
        let device

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

            device = await app.factory.createDevice({ name: 'config-device' }, app.team)

            await app.db.controllers.AccessToken.createHTTPNodeToken(configInstance, 'instance-http-token', [''])
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
        })
    })
})
