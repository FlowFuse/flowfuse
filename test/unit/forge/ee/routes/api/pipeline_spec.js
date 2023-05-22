const sinon = require('sinon')

const setup = require('../../setup')

describe('Pipelines API', function () {
    const sandbox = sinon.createSandbox()

    const TestObjects = { tokens: {} }

    let app

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    beforeEach(async function () {
        app = await setup()
        sandbox.stub(app.log, 'info')
        sandbox.stub(app.log, 'warn')
        sandbox.stub(app.log, 'error')

        await login('alice', 'aaPassword')
    })

    afterEach(async function () {
        await app.close()
        sandbox.restore()
    })

    describe('Create Pipeline Stage', function () {
        it('Should create a new pipeline stage', async function () {
            const pipelineId = 123
            const stageId = 123

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
        })

        describe('When a previous stage is passed', function () {
            it('Should set the previous stages nextStage to the newly created pipeline stage')
        })
    })

    describe('Get Pipeline Stage', function () {
        it('Should return a single pipeline stage', async function () {
            const pipelineId = 123
            const stageId = 123

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
        })
    })

    describe('Update Pipeline Stage', function () {
        describe('With a new name', function () {
            it('Should update a single pipeline stage with a new name', async function () {
                const pipelineId = 123
                const stageId = 123

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        name: 'New Name'
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })
            })
        })
    })

    describe('Delete Pipeline Stage', function () {
        it('should destroy the pipeline stage', async function () {

        })

        describe('When there is a pipeline before and after', function () {
            it('should re-connect the previous to the next pipeline')
        })

        describe('When there is a pipeline after', function () {
            it('should set the previousStages nextStage to null', function () {

            })
        })
    })

    describe('Create Pipeline', function () {
        describe('With a name and application ID', function () {
            it('Should create a new pipeline within the passed application')
        })

        describe('With no name', function () {
            it('Should fail validation')
        })

        describe('With no application ID', function () {
            it('Should fail validation')
        })
    })

    describe('Delete Pipeline', function () {
        describe('When passed an application and pipeline ID', function () {
            it('Should destroy the pipeline')

            it('Also destroy all stages within the pipeline')
        })

        describe('With no pipeline ID', function () {
            it('Should fail gracefully')
        })

        describe('With a pipeline that does not exist', function () {
            it('Should fail gracefully')
        })
    })

    describe('Update Pipeline', function () {
        describe('When given a new name', function () {
            it('Should update the name of the pipeline')

            it('Also destroy all stages within the pipeline')
        })

        describe('With no name', function () {
            it('Unset - Should fail gracefully')
            it('Blank - Should fail gracefully')
            it('String of spaces - Should fail gracefully')
        })
    })
})
