const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/pipelines')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Pipelines Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_pipelines', function () {
        const tool = getTool('platform_list_pipelines')

        it('injects the team pipelines route when given a teamId', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ count: 0, pipelines: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/teams/team1/pipelines' }).resolves(routeResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('injects the application pipelines route when given an applicationId', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ count: 0, pipelines: [] }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/applications/app1/pipelines' }).resolves(routeResponse)

            const response = await tool.handler({ applicationId: 'app1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.should.equal(errorResponse)
        })

        it('returns an error without injecting when neither teamId nor applicationId is given', async function () {
            const response = await tool.handler({}, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().should.match({ code: 'invalid_request' })
        })

        it('returns an error without injecting when both teamId and applicationId are given', async function () {
            const response = await tool.handler({ teamId: 'team1', applicationId: 'app1' }, { inject })

            inject.called.should.be.false()
            response.statusCode.should.equal(400)
            response.json().should.match({ code: 'invalid_request' })
        })
    })

    describe('platform_get_pipeline_stage', function () {
        const tool = getTool('platform_get_pipeline_stage')

        it('injects the pipeline stage route and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'stage1' }) }
            inject.withArgs({ method: 'GET', url: '/api/v1/pipelines/pipe1/stages/stage1' }).resolves(routeResponse)

            const response = await tool.handler({ pipelineId: 'pipe1', stageId: 'stage1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ pipelineId: 'pipe1', stageId: 'stage1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_create_pipeline', function () {
        const tool = getTool('platform_create_pipeline')

        it('posts the pipeline payload and returns the response', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'pipe1' }) }
            inject.withArgs({ method: 'POST', url: '/api/v1/pipelines', payload: { applicationId: 'app1', name: 'Production' } }).resolves(routeResponse)

            const response = await tool.handler({ applicationId: 'app1', name: 'Production' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_name' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ applicationId: 'app1', name: '' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_update_pipeline', function () {
        const tool = getTool('platform_update_pipeline')

        it('wraps the flat name into the nested pipeline shape the route reads', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'pipe1' }) }
            inject.withArgs({ method: 'PUT', url: '/api/v1/pipelines/pipe1', payload: { pipeline: { name: 'Staging' } } }).resolves(routeResponse)

            const response = await tool.handler({ pipelineId: 'pipe1', name: 'Staging' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ pipelineId: 'pipe1', name: 'Staging' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_add_pipeline_stage', function () {
        const tool = getTool('platform_add_pipeline_stage')

        it('posts an instance stage with only the provided fields', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'stage2' }) }
            inject.withArgs({
                method: 'POST',
                url: '/api/v1/pipelines/pipe1/stages',
                payload: { name: 'Deploy to prod', instanceId: '11111111-1111-1111-1111-111111111111', action: 'prompt', source: 'stage1' }
            }).resolves(routeResponse)

            const response = await tool.handler({ pipelineId: 'pipe1', name: 'Deploy to prod', instanceId: '11111111-1111-1111-1111-111111111111', action: 'prompt', source: 'stage1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('posts a git-repo stage with the git settings', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'stage2' }) })

            await tool.handler({ pipelineId: 'pipe1', name: 'Push to repo', gitTokenId: 'token1', url: 'https://github.com/org/repo', branch: 'main' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ name: 'Push to repo', gitTokenId: 'token1', url: 'https://github.com/org/repo', branch: 'main' })
        })

        it('rejects an action outside the snapshot action set', function () {
            tool.inputSchema.action.safeParse('bogus').success.should.be.false()
            tool.inputSchema.action.safeParse('use_latest_snapshot').success.should.be.true()
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_input' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ pipelineId: 'pipe1', name: 'stage' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_update_pipeline_stage', function () {
        const tool = getTool('platform_update_pipeline_stage')

        it('puts only the provided fields onto the stage route', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ id: 'stage1' }) }
            inject.withArgs({
                method: 'PUT',
                url: '/api/v1/pipelines/pipe1/stages/stage1',
                payload: { name: 'Renamed stage', action: 'create_snapshot' }
            }).resolves(routeResponse)

            const response = await tool.handler({ pipelineId: 'pipe1', stageId: 'stage1', name: 'Renamed stage', action: 'create_snapshot' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('forwards a rebinding to a device', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'stage1' }) })

            await tool.handler({ pipelineId: 'pipe1', stageId: 'stage1', deviceId: 'device1' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ deviceId: 'device1' })
        })

        it('triggers the rebind branch when only git fields are provided', async function () {
            // The route only applies git settings inside its rebinding branch, which is
            // triggered by instanceId/deviceId/deviceGroupId being present - so the handler
            // adds a blank deviceGroupId when a git token is sent without one of those.
            inject.resolves({ statusCode: 200, json: () => ({ id: 'stage1' }) })

            await tool.handler({ pipelineId: 'pipe1', stageId: 'stage1', gitTokenId: 'token1', url: 'https://github.com/org/repo', branch: 'main' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ gitTokenId: 'token1', url: 'https://github.com/org/repo', branch: 'main', deviceGroupId: '' })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 400, json: () => ({ code: 'invalid_input' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ pipelineId: 'pipe1', stageId: 'stage1', instanceId: 'a', deviceId: 'b' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_deploy_pipeline_stage', function () {
        const tool = getTool('platform_deploy_pipeline_stage')

        it('puts to the deploy route with an empty payload by default', async function () {
            const routeResponse = { statusCode: 200, json: () => ({ status: 'importing' }) }
            inject.withArgs({ method: 'PUT', url: '/api/v1/pipelines/pipe1/stages/stage1/deploy', payload: {} }).resolves(routeResponse)

            const response = await tool.handler({ pipelineId: 'pipe1', stageId: 'stage1' }, { inject })

            inject.calledOnce.should.be.true()
            response.should.equal(routeResponse)
        })

        it('sends sourceSnapshotId for prompt-action stages', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ status: 'importing' }) })

            await tool.handler({ pipelineId: 'pipe1', stageId: 'stage1', sourceSnapshotId: 'snapshot1' }, { inject })

            inject.firstCall.args[0].payload.should.eql({ sourceSnapshotId: 'snapshot1' })
        })

        it('passes through an error response', async function () {
            const errorResponse = { statusCode: 403, json: () => ({ code: 'protected_instance' }) }
            inject.resolves(errorResponse)

            const response = await tool.handler({ pipelineId: 'pipe1', stageId: 'stage1' }, { inject })
            response.should.equal(errorResponse)
        })
    })
})
