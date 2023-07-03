const should = require('should') // eslint-disable-line
const setup = require('../../setup')

describe('PipelineStage view', function () {
    let app
    before(async function () {
        app = await setup()
    })

    after(async function () {
        await app.close()
    })

    describe('stageList', function () {
        it('returns stages in the correct order', async function () {
            const pipeline = await app.factory.createPipeline({
                name: 'pipeline-1'
            },
            app.application)

            const stage1 = await app.factory.createPipelineStage({
                name: 's1',
                instanceId: app.instance.id
            }, pipeline)
            const stage2 = await app.factory.createPipelineStage({
                name: 's2',
                instanceId: app.instance.id
            }, pipeline)
            const stage3 = await app.factory.createPipelineStage({
                name: 's3',
                instanceId: app.instance.id
            }, pipeline)

            stage1.NextStageId = stage2.id
            stage2.NextStageId = stage3.id
            await stage1.save()
            await stage2.save()

            function validateList (list) {
                list.should.have.length(3)
                list[0].should.have.property('id', stage1.hashid)
                list[1].should.have.property('id', stage2.hashid)
                list[2].should.have.property('id', stage3.hashid)
            }

            validateList(await app.db.views.PipelineStage.stageList([
                stage1,
                stage2,
                stage3
            ]))
            validateList(await app.db.views.PipelineStage.stageList([
                stage3,
                stage2,
                stage1
            ]))
            validateList(await app.db.views.PipelineStage.stageList([
                stage2,
                stage1,
                stage3
            ]))
            validateList(await app.db.views.PipelineStage.stageList([
                stage1,
                stage3,
                stage2
            ]))
        })
    })
})
