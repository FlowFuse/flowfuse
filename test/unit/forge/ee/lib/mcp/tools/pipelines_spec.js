const should = require('should') // eslint-disable-line no-unused-vars

const TestModelFactory = require('../../../../../../lib/TestModelFactory')
const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/pipelines')

const findTool = toolFinder(tools)

describe('MCP Platform Tools - Pipelines', function () {
    describe('platform_list_team_pipelines', function () {
        const tool = findTool('platform_list_team_pipelines')

        it('is defined with read-only, non-destructive annotations', function () {
            should(tool).be.an.Object()
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

        it('accepts a teamId input', function () {
            Object.keys(tool.inputSchema).should.eql(['teamId'])
        })

        it('calls GET /api/v1/teams/:teamId/pipelines', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ teamId: 'team1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/teams/team1/pipelines')
        })
    })

    describe('platform_list_application_pipelines', function () {
        const tool = findTool('platform_list_application_pipelines')

        it('is defined with read-only, non-destructive annotations', function () {
            should(tool).be.an.Object()
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

        it('accepts an applicationId input', function () {
            Object.keys(tool.inputSchema).should.eql(['applicationId'])
        })

        it('calls GET /api/v1/applications/:applicationId/pipelines', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ applicationId: 'app1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/applications/app1/pipelines')
        })
    })

    describe('platform_get_pipeline_stage', function () {
        const tool = findTool('platform_get_pipeline_stage')

        it('is defined with read-only, non-destructive annotations', function () {
            should(tool).be.an.Object()
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

        it('accepts pipelineId and stageId inputs', function () {
            Object.keys(tool.inputSchema).should.eql(['pipelineId', 'stageId'])
        })

        it('calls GET /api/v1/pipelines/:pipelineId/stages/:stageId', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ pipelineId: 'pipe1', stageId: 'stage1' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/pipelines/pipe1/stages/stage1')
        })
    })

    describe('integration smoke', function () {
        const setup = require('../../../setup')

        let app
        let token

        before(async function () {
            app = await setup({ ai: { enabled: true }, expert: { enabled: true } })
            token = await createExpertMcpToken(app)
        })

        after(async function () {
            await app.close()
        })

        function inject (o) {
            return app.inject({ ...o, headers: { ...(o.headers || {}), authorization: `Bearer ${token}` } })
        }

        it('lists pipelines for a team with none configured', async function () {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${app.team.hashid}/pipelines` })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('count', 0)
            body.should.have.property('pipelines')
            body.pipelines.should.be.an.Array()
            body.pipelines.should.have.length(0)
        })
    })

    describe('integration equivalence (tool vs route)', function () {
        const setup = require('../../../setup')
        const { createSnapshot } = FF_UTIL.require('forge/services/snapshots')

        let app
        let token
        let pipeline
        let stageOne
        let stageTwo

        before(async function () {
            app = await setup({ ai: { enabled: true }, expert: { enabled: true } })
            token = await createExpertMcpToken(app)

            const factory = new TestModelFactory(app)

            const deviceGroup = await factory.createApplicationDeviceGroup({ name: 'device-group-a' }, app.application)

            pipeline = await factory.createPipeline({ name: 'equivalence-pipeline' }, app.application)
            stageOne = await factory.createPipelineStage({ name: 'stage-one', instanceId: app.instance.id }, pipeline)
            stageTwo = await factory.createPipelineStage({
                name: 'stage-two',
                deviceGroupId: deviceGroup.id,
                source: stageOne.hashid,
                action: 'use_latest_snapshot'
            }, pipeline)

            await createSnapshot(app, app.instance, app.user, {
                name: 'equivalence-snapshot',
                description: 'snapshot seeded for tool/route equivalence checks',
                setAsTarget: false
            })
        })

        after(async function () {
            await app.close()
        })

        function inject (o) {
            return app.inject({ ...o, headers: { ...(o.headers || {}), authorization: `Bearer ${token}` } })
        }

        it('platform_list_team_pipelines matches GET /api/v1/teams/:teamId/pipelines', async function () {
            const tool = findTool('platform_list_team_pipelines')
            const { routeResponse } = await expectToolMatchesRoute(
                inject,
                tool,
                { teamId: app.team.hashid },
                { method: 'GET', url: `/api/v1/teams/${app.team.hashid}/pipelines` }
            )
            routeResponse.statusCode.should.equal(200)
            const body = routeResponse.json()
            body.count.should.equal(1)
            body.pipelines.should.have.length(1)
        })

        it('platform_list_application_pipelines matches GET /api/v1/applications/:applicationId/pipelines', async function () {
            const tool = findTool('platform_list_application_pipelines')
            const { routeResponse } = await expectToolMatchesRoute(
                inject,
                tool,
                { applicationId: app.application.hashid },
                { method: 'GET', url: `/api/v1/applications/${app.application.hashid}/pipelines` }
            )
            routeResponse.statusCode.should.equal(200)
            const body = routeResponse.json()
            body.count.should.equal(1)
            body.pipelines.should.have.length(1)
        })

        it('platform_get_pipeline_stage matches GET /api/v1/pipelines/:pipelineId/stages/:stageId (instance stage)', async function () {
            const tool = findTool('platform_get_pipeline_stage')
            const { routeResponse } = await expectToolMatchesRoute(
                inject,
                tool,
                { pipelineId: pipeline.hashid, stageId: stageOne.hashid },
                { method: 'GET', url: `/api/v1/pipelines/${pipeline.hashid}/stages/${stageOne.hashid}` }
            )
            routeResponse.statusCode.should.equal(200)
            const body = routeResponse.json()
            body.should.have.property('id', stageOne.hashid)
            body.should.have.property('instances')
        })

        it('platform_get_pipeline_stage matches GET /api/v1/pipelines/:pipelineId/stages/:stageId (device group stage)', async function () {
            const tool = findTool('platform_get_pipeline_stage')
            const { routeResponse } = await expectToolMatchesRoute(
                inject,
                tool,
                { pipelineId: pipeline.hashid, stageId: stageTwo.hashid },
                { method: 'GET', url: `/api/v1/pipelines/${pipeline.hashid}/stages/${stageTwo.hashid}` }
            )
            routeResponse.statusCode.should.equal(200)
            const body = routeResponse.json()
            body.should.have.property('id', stageTwo.hashid)
            body.should.have.property('deviceGroups')
        })
    })
})
