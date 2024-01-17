const should = require('should') // eslint-disable-line
const setup = require('../../setup')

describe('PipelineStage model', function () {
    let app
    before(async function () {
        app = await setup()
    })

    after(async function () {
        await app.close()
    })

    describe('model static', function () {
        describe('sortStages', function () {
            it('returns an ordered stage array from ordered data', async function () {
                const unorderedStages = [
                    { id: 1, name: 'stage1', NextStageId: 2 },
                    { id: 2, name: 'stage2', NextStageId: 3 },
                    { id: 3, name: 'stage3', NextStageId: 4 },
                    { id: 4, name: 'stage4', NextStageId: null }
                ]
                const orderedStages = await app.db.models.PipelineStage.sortStages(unorderedStages)
                orderedStages.should.deepEqual([
                    { id: 1, name: 'stage1', NextStageId: 2 },
                    { id: 2, name: 'stage2', NextStageId: 3 },
                    { id: 3, name: 'stage3', NextStageId: 4 },
                    { id: 4, name: 'stage4', NextStageId: null }
                ])
            })
            it('returns an ordered stage array from unordered data', async function () {
                const unorderedStages = [
                    { id: 2, name: 'stage2', NextStageId: 3 },
                    { id: 4, name: 'stage4', NextStageId: null },
                    { id: 3, name: 'stage3', NextStageId: 4 },
                    { id: 1, name: 'stage1', NextStageId: 2 }
                ]
                const orderedStages = await app.db.models.PipelineStage.sortStages(unorderedStages)
                orderedStages.should.deepEqual([
                    { id: 1, name: 'stage1', NextStageId: 2 },
                    { id: 2, name: 'stage2', NextStageId: 3 },
                    { id: 3, name: 'stage3', NextStageId: 4 },
                    { id: 4, name: 'stage4', NextStageId: null }
                ])
            })
            it('returns empty array when stage array contains a loop', async function () {
                // this test is mainly to ensure we dont max out the stack
                const unorderedStages = [
                    { id: 2, name: 'stage2', NextStageId: 3 },
                    { id: 4, name: 'stage4', NextStageId: 2 },
                    { id: 3, name: 'stage3', NextStageId: 4 },
                    { id: 1, name: 'stage1', NextStageId: 2 }
                ]
                const orderedStages = await app.db.models.PipelineStage.sortStages(unorderedStages)
                orderedStages.should.deepEqual([])
            })
            it('returns empty array when stage array with a loop and a missing stage', async function () {
                // this test is mainly to ensure we dont max out the stack
                const unorderedStages = []
                const orderedStages = await app.db.models.PipelineStage.sortStages(unorderedStages)
                orderedStages.should.deepEqual([])
            })
            it('handles empty array', async function () {
                const unorderedStages = []
                const orderedStages = await app.db.models.PipelineStage.sortStages(unorderedStages)
                orderedStages.should.deepEqual([])
            })
        })
    })
})
