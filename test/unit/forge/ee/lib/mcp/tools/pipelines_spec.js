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
})
