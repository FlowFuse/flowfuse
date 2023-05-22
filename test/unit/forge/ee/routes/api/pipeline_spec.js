const Hashids = require('hashids/cjs')
const should = require('should')
const sinon = require('sinon')

const TestModelFactory = require('../../../../../lib/TestModelFactory.js')

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

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

        const factory = new TestModelFactory(app)

        TestObjects.pipeline = await factory.createPipeline({ name: 'new-pipeline' }, app.application)

        TestObjects.stageOne = await factory.createPipelineStage({ name: 'stage-one', instanceId: app.instance.id }, TestObjects.pipeline)

        TestObjects.factory = factory

        TestObjects.instanceOne = app.instance

        TestObjects.instanceTwo = await TestObjects.factory.createInstance(
            { name: 'instance-two' },
            app.application,
            app.stack,
            app.template,
            app.projectType,
            { start: false }
        )

        TestObjects.team = app.team
        TestObjects.application = app.application
        TestObjects.stack = app.stack
        TestObjects.template = app.template
        TestObjects.projectType = app.projectType

        await login('alice', 'aaPassword')
    })

    afterEach(async function () {
        await app.close()
        sandbox.restore()
    })

    describe('Create Pipeline Stage', function () {
        it('Should create a new pipeline stage', async function () {
            const pipelineId = TestObjects.pipeline.hashid

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/pipelines/${pipelineId}/stages`,
                payload: {
                    name: 'stage-two',
                    instanceId: TestObjects.instanceTwo.id
                },
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()

            body.should.have.property('id')
            body.should.have.property('name', 'stage-two')
            body.should.have.property('instances')
            body.instances[0].should.have.property('name', 'instance-two')

            response.statusCode.should.equal(200)
        })

        describe('When a previous stage is passed', function () {
            it('Should set the previous stages nextStage to the newly created pipeline stage', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/pipelines/${pipelineId}/stages`,
                    payload: {
                        name: 'stage-two',
                        instanceId: TestObjects.instanceTwo.id,
                        source: TestObjects.stageOne.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('name', 'stage-two')

                const stageOne = await TestObjects.stageOne.reload()
                const stageTwo = await app.db.models.PipelineStage.byId(body.id)

                stageOne.target.should.equal(stageTwo.id)

                response.statusCode.should.equal(200)
            })
        })

        describe('Validates that the pipeline is correct', function () {
            it('Rejects a pipeline stage without an instance', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/pipelines/${pipelineId}/stages`,
                    payload: {
                        name: 'stage-two'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'unexpected_error')
                body.should.have.property('error').match(/instanceId/)

                response.statusCode.should.equal(500)
            })

            it('Rejects a pipeline stage if the instance is already in use', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/pipelines/${pipelineId}/stages`,
                    payload: {
                        name: 'stage-two',
                        instanceId: TestObjects.instanceOne.hashid // in use
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'unexpected_error')
                body.should.have.property('error').match(/instanceId/)

                response.statusCode.should.equal(500)
            })
        })
    })

    describe('Get Pipeline Stage', function () {
        it('Should return a single pipeline stage', async function () {
            const pipelineId = TestObjects.pipeline.hashid
            const stageId = TestObjects.stageOne.hashid

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()

            body.should.have.property('id')
            body.should.have.property('name', 'stage-one')
            body.should.have.property('instances')
            body.instances[0].should.have.property('name', 'project1')

            response.statusCode.should.equal(200)
        })
    })

    describe('Update Pipeline Stage', function () {
        describe('With a new name', function () {
            it('Should update a single pipeline stage with a new name', async function () {
                const pipelineId = TestObjects.pipeline.hashid
                const stageId = TestObjects.stageOne.hashid

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        name: 'New Name'
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('name', 'New Name')
                body.should.have.property('instances')
                body.instances[0].should.have.property('name', 'project1')

                response.statusCode.should.equal(200)
            })
        })

        describe('With a new instance', function () {
            it('Should unassign the old instance and assign the new one', async function () {
                const pipelineId = TestObjects.pipeline.hashid
                const stageId = TestObjects.stageOne.hashid

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        instanceId: TestObjects.instanceTwo.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('instances')
                body.instances.should.have.length(1)
                body.instances[0].should.have.property('name', 'instance-two')

                response.statusCode.should.equal(200)
            })

            it('Should validate the instance ID', async function () {
                const pipelineId = TestObjects.pipeline.hashid
                const stageId = TestObjects.stageOne.hashid

                const fakeUUID = (new Hashids('Instance')).encode('123')

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        instanceId: fakeUUID
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('code', 'unexpected_error')
                body.should.have.property('error').match(/instanceId/)

                response.statusCode.should.equal(500)
            })

            it('Should require the instance to be part of the same application', async function () {
                const pipelineId = TestObjects.pipeline.hashid
                const stageId = TestObjects.stageOne.hashid

                const otherApplication = await TestObjects.factory.createApplication({
                    name: 'other-application'
                }, TestObjects.team)

                const otherApplicationInstance = await TestObjects.factory.createInstance(
                    { name: 'other-application-instance' },
                    otherApplication,
                    TestObjects.stack,
                    TestObjects.template,
                    TestObjects.projectType,
                    { start: false }
                )

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        instanceId: otherApplicationInstance.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('code', 'unexpected_error')
                body.should.have.property('error').match(/not a member of application/)

                response.statusCode.should.equal(500)
            })

            it('Should require the instance to be owned by the same team', async function () {
                const pipelineId = TestObjects.pipeline.hashid
                const stageId = TestObjects.stageOne.hashid

                // Create a new team
                const team1 = await TestObjects.factory.createTeam({ name: 'BTeam' })
                await team1.addUser(TestObjects.user, { through: { role: Roles.Owner } })

                await TestObjects.factory.createSubscription(team1)

                const template = await TestObjects.factory.createProjectTemplate(
                    { name: 'template-two', settings: {}, policy: {} },
                    TestObjects.user
                )

                const projectType = await TestObjects.factory.createProjectType({
                    name: 'projectType2',
                    description: 'default project type',
                    properties: {
                        billingProductId: 'product_123',
                        billingPriceId: 'price_123'
                    }
                })

                const stack = await TestObjects.factory.createStack({ name: 'stack2' }, projectType)

                const application = await TestObjects.factory.createApplication({ name: 'application-1' }, team1)

                const instance = await TestObjects.factory.createInstance(
                    { name: 'other-teams-instance' },
                    application,
                    stack,
                    template,
                    projectType,
                    { start: false }
                )

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        instanceId: instance.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('code', 'unexpected_error')
                body.should.have.property('error').match(/not a member of application/)

                response.statusCode.should.equal(500)
            })
        })
    })

    describe('Delete Pipeline Stage', function () {
        it('should destroy the pipeline stage', async function () {
            const pipelineId = TestObjects.pipeline.hashid
            const stageId = TestObjects.stageOne.hashid

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()
            body.should.have.property('status', 'okay')
            response.statusCode.should.equal(200)

            should(await app.db.models.PipelineStage.byId(stageId)).equal(null)
        })

        describe('When there is a pipeline before and after', function () {
            it('should re-connect the previous to the next pipeline', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                const instanceThree = await TestObjects.factory.createInstance(
                    { name: 'instance-three' },
                    TestObjects.application,
                    TestObjects.stack,
                    TestObjects.template,
                    TestObjects.projectType,
                    { start: false }
                )

                // 1 -> 2 -> 3 delete 2
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)
                await TestObjects.stageOne.reload()
                TestObjects.stageThree = await TestObjects.factory.createPipelineStage({ name: 'stage-three', instanceId: instanceThree.id, source: TestObjects.stageTwo.hashid }, TestObjects.pipeline)
                await TestObjects.stageTwo.reload()

                should(TestObjects.stageOne.target).equal(TestObjects.stageTwo.id)
                should(TestObjects.stageTwo.target).equal(TestObjects.stageThree.id)

                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${TestObjects.stageTwo.hashid}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('status', 'okay')
                response.statusCode.should.equal(200)

                should(await app.db.models.PipelineStage.byId(TestObjects.stageTwo.id)).equal(null)

                const stageOne = await TestObjects.stageOne.reload()

                should(stageOne.target).equal(TestObjects.stageThree.id)
            })
        })

        describe('When there is a pipeline after', function () {
            it('should set the previousStages nextStage to null', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                // 1 -> 2 delete 2
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)
                await TestObjects.stageOne.reload()

                should(TestObjects.stageOne.target).equal(TestObjects.stageTwo.id)

                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${TestObjects.stageTwo.hashid}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('status', 'okay')
                response.statusCode.should.equal(200)

                const stageOne = await TestObjects.stageOne.reload()

                should(stageOne.target).equal(null)
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
