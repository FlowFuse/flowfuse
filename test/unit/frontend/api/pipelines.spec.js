import { expect, vi } from 'vitest'

/*
    Mock Values & Imports
*/
const mockGet = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({
    data: {
        teams: [],
        devices: [],
        pipelines: []
    }
}))
const mockPost = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))
const mockPut = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))
const mockDelete = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))

vi.mock('@/api/client', () => {
    return {
        default: {
            get: mockGet,
            post: mockPost,
            put: mockPut,
            delete: mockDelete
        }
    }
})

/*
    Tests
*/
describe('Pipelines API', async () => {
    const PipelinesAPI = await import('../../../../frontend/src/api/pipeline.js')

    afterEach(() => {
        mockGet.mockClear()
        mockPost.mockClear()
        mockPut.mockClear()
        mockDelete.mockClear()
    })

    test('getPipelineStage calls the correct API endpoint when provided a pipelineId and stageId', () => {
        const pipelineId = '1234'
        const stageId = '5678'
        PipelinesAPI.default.getPipelineStage(pipelineId, stageId)
        expect(mockGet).toHaveBeenCalledOnce()
        expect(mockGet).toHaveBeenCalledWith(`/api/v1/pipelines/${pipelineId}/stages/${stageId}`)
    })

    test('addPipelineStage calls the correct API endpoint, with the relevant options', () => {
        const pipelineId = '1234'
        const stage = {
            name: 'My Stage',
            instanceId: 'instance-id',
            unused: 'property'
        }
        const options = {
            name: 'My Stage',
            instanceId: 'instance-id'
        }
        PipelinesAPI.default.addPipelineStage(pipelineId, stage)

        expect(mockPost).toHaveBeenCalledOnce()
        expect(mockPost).toHaveBeenCalledWith(`/api/v1/pipelines/${pipelineId}/stages`, options)
    })

    test('addPipelineStage calls the correct API endpoint, with a "source" stage if provided', () => {
        const pipelineId = '1234'
        const stage = {
            name: 'My Stage',
            instanceId: 'instance-id',
            source: 'stage1234'
        }
        PipelinesAPI.default.addPipelineStage(pipelineId, stage)
        expect(mockPost).toHaveBeenCalledOnce()
        expect(mockPost).toHaveBeenCalledWith(`/api/v1/pipelines/${pipelineId}/stages`, stage)
    })

    test('updatePipelineStage makes a PUT request to update a pipeline stage', () => {
        const pipelineId = '1234'
        const stageId = '4321'
        const stage = {
            name: 'My Stage',
            instanceId: 'instance-id'
        }

        PipelinesAPI.default.updatePipelineStage(pipelineId, stageId, stage)
        expect(mockPut).toHaveBeenCalledOnce()
        expect(mockPut).toHaveBeenCalledWith(`/api/v1/pipelines/${pipelineId}/stages/4321`, stage)
    })

    test('deletePipelineStage makes a DELETE request to delete a pipeline stage', () => {
        const pipelineId = '1234'
        const stageId = '4321'

        PipelinesAPI.default.deletePipelineStage(pipelineId, stageId)
        expect(mockDelete).toHaveBeenCalledWith(`/api/v1/pipelines/${pipelineId}/stages/4321`)
    })
})

describe('Applications API', async () => {
    const ApplicationsAPI = await import('../../../../frontend/src/api/application.js')

    afterEach(() => {
        mockGet.mockClear()
        mockPost.mockClear()
        mockPut.mockClear()
        mockDelete.mockClear()
    })

    test('getPipelines calls the correct API endpoint for a given Application', () => {
        const applicationId = 'application-id'
        ApplicationsAPI.default.getPipelines(applicationId)
        expect(mockGet).toHaveBeenCalledOnce()
        expect(mockGet).toHaveBeenCalledWith(`/api/v1/applications/${applicationId}/pipelines`)
    })

    test('createPipeline calls the correct API endpoint with the relevant options', () => {
        const applicationId = 'application-id'
        const pipelineName = 'My Pipeline'
        ApplicationsAPI.default.createPipeline(applicationId, pipelineName)
        expect(mockPost).toHaveBeenCalledOnce()
        expect(mockPost).toHaveBeenCalledWith('/api/v1/pipelines', { name: pipelineName, applicationId })
    })

    test('deletePipeline calls the correct API endpoint', () => {
        const applicationId = 'application-id'
        const pipelineId = 'application-id'
        ApplicationsAPI.default.deletePipeline(applicationId, pipelineId)
        expect(mockDelete).toHaveBeenCalledOnce()
        expect(mockDelete).toHaveBeenCalledWith(`/api/v1/pipelines/${pipelineId}`)
    })
})
