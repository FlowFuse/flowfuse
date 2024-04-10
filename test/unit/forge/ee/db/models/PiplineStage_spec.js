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
    describe('Relations', function () {
        let PipelineStage
        beforeEach(async () => {
            ({ PipelineStage } = app.db.models)
        })

        // helper functions
        const nameGenerator = (name) => `${name} ${Math.random().toString(36).substring(7)}`
        const newPipeline = async (applicationId = null) => {
            const name = nameGenerator('Test Pipeline')
            const pipeline = await app.db.models.Pipeline.create({ name, ApplicationId: applicationId })
            return pipeline
        }
        const newPipelineStage = async (pipelineId = null, nextStageId = null) => {
            const name = nameGenerator('Test PipelineStage')
            const pipelineStage = await PipelineStage.create({ name, NextStageId: nextStageId, PipelineId: pipelineId })
            return pipelineStage
        }

        // TESTS

        // RELATION: NextStageId INTEGER REFERENCES PipelineStages (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should set PipelineStage.NextStageId to null when PipelineStage is deleted', async function () {
            const pipeline = await newPipeline()
            const pipelineStage1 = await newPipelineStage(pipeline.id)
            const pipelineStage2 = await newPipelineStage(pipeline.id)
            pipelineStage1.NextStageId = pipelineStage2.id
            await pipelineStage1.save()

            // ensure the relationship is set
            await pipelineStage1.reload()
            pipelineStage1.should.have.property('NextStageId', pipelineStage2.id)

            // delete the pipeline stage that is being referenced by NextStageId
            await pipelineStage2.destroy()

            const updated = await PipelineStage.findByPk(pipeline.id)
            should(updated).not.be.null()
            updated.should.have.property('NextStageId', null)
        })

        // RELATION: NextStageId INTEGER REFERENCES PipelineStages (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should update PipelineStage.NextStageId when PipelineStage.id is updated', async function () {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            const pipeline = await newPipeline()
            const pipelineStage1 = await newPipelineStage(pipeline.id)
            const pipelineStage2 = await newPipelineStage(pipeline.id)
            pipelineStage1.NextStageId = pipelineStage2.id
            await pipelineStage1.save()

            // ensure the relationship is set
            await pipelineStage1.reload()
            pipelineStage1.should.have.property('NextStageId', pipelineStage2.id)

            // update the id of the pipeline stage that is being referenced by NextStageId
            pipelineStage2.id = pipelineStage2.id + 1
            await pipelineStage2.save()
            await pipelineStage2.reload()

            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            pipelineStage2.should.have.property('id', pipelineStage2.id)
        })

        // RELATION: PipelineId INTEGER REFERENCES Pipelines (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should set PipelineStage.PipelineId to null when Pipeline is deleted', async function () {
            const pipeline = await newPipeline()
            const pipelineStage = await newPipelineStage(pipeline.id)
            pipelineStage.should.have.property('PipelineId', pipeline.id)

            await pipeline.destroy()

            const updated = await PipelineStage.findByPk(pipelineStage.id)
            should(updated).not.be.null()
            updated.should.have.property('PipelineId', null)
        })

        // RELATION: PipelineId INTEGER REFERENCES Pipelines (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should update PipelineStage.PipelineId when Pipeline.id is updated', async function () {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            const pipeline = await newPipeline()
            const pipelineStage = await newPipelineStage(pipeline.id)
            pipelineStage.should.have.property('PipelineId', pipeline.id)

            pipeline.id = pipeline.id + 1
            await pipeline.save()
            await pipeline.reload()

            const updated = await PipelineStage.findByPk(pipelineStage.id)

            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            updated.should.have.property('PipelineId', pipeline.id)
        })
    })
})
