const should = require('should')
const sinon = require('sinon')
const { v4: uuidv4 } = require('uuid')

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

                stageOne.NextStageId.should.equal(stageTwo.id)

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

                const fakeUUID = uuidv4()

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

                should(TestObjects.stageOne.NextStageId).equal(TestObjects.stageTwo.id)
                should(TestObjects.stageTwo.NextStageId).equal(TestObjects.stageThree.id)

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

                should(stageOne.NextStageId).equal(TestObjects.stageThree.id)
            })
        })

        describe('When there is a pipeline after', function () {
            it('should set the previousStages nextStage to null', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                // 1 -> 2 delete 2
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)
                await TestObjects.stageOne.reload()

                should(TestObjects.stageOne.NextStageId).equal(TestObjects.stageTwo.id)

                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${TestObjects.stageTwo.hashid}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('status', 'okay')
                response.statusCode.should.equal(200)

                const stageOne = await TestObjects.stageOne.reload()

                should(stageOne.NextStageId).equal(null)
            })
        })
    })

    describe('Create Pipeline', function () {
        describe('With a name and application ID', function () {
            it('Should create a new pipeline within the passed application', async function () {
                const pipelineName = 'new-pipeline'
                const applicationId = TestObjects.application.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/applications/${applicationId}/pipelines`,
                    payload: {
                        name: pipelineName
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('name', pipelineName)
                body.should.have.property('stages', [])

                response.statusCode.should.equal(200)
            })
        })

        describe('With no name', function () {
            it('Should fail validation', async function () {
                const applicationId = TestObjects.application.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/applications/${applicationId}/pipelines`,
                    payload: {},
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'invalid_name')
                body.should.have.property('error').match(/Name is required/)

                response.statusCode.should.equal(400)
            })

            it('Should fail validation when blank', async function () {
                const applicationId = TestObjects.application.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/applications/${applicationId}/pipelines`,
                    payload: {
                        name: ' '
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'invalid_name')
                body.should.have.property('error').match(/Name must not be blank/)

                response.statusCode.should.equal(400)
            })
        })

        describe('With out an application', function () {
            it('Should fail validation without application ID', async function () {
                const pipelineName = 'new-pipeline'
                const applicationId = ''

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/applications/${applicationId}/pipelines`,
                    payload: {
                        name: pipelineName
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'not_found')

                response.statusCode.should.equal(404)
            })

            it('Should fail validation when application is not found', async function () {
                const pipelineName = 'new-pipeline'
                const applicationId = 'application-that-does-not-exist'

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/applications/${applicationId}/pipelines`,
                    payload: {
                        name: pipelineName
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'not_found')

                response.statusCode.should.equal(404)
            })
        })

        describe('For an application owned by another team', function () {
            it('Should fail validation', async function () {
                const userPez = await TestObjects.factory.createUser({
                    admin: false,
                    username: 'pez',
                    name: 'Pez Cuckow',
                    email: 'pez@example.com',
                    password: 'ppPassword'
                })

                const team1 = await TestObjects.factory.createTeam({ name: 'PTeam' })
                await team1.addUser(userPez, { through: { role: Roles.Owner } })

                await login('pez', 'ppPassword')

                const pipelineName = 'new-pipeline'
                const applicationId = TestObjects.application.hashid // we are logged in as pez, but this is owned by alice

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/applications/${applicationId}/pipelines`,
                    payload: {
                        name: pipelineName
                    },
                    cookies: { sid: TestObjects.tokens.pez }
                })

                const body = await response.json()

                body.should.have.property('code', 'not_found')

                response.statusCode.should.equal(404)
            })
        })

        describe('When not logged in', function () {
            it('Should prevent creation entirely', async function () {
                const pipelineName = 'new-pipeline'
                const applicationId = TestObjects.application.hashid // this is owned by alice

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/applications/${applicationId}/pipelines`,
                    payload: {
                        name: pipelineName
                    }
                })

                const body = await response.json()

                body.should.have.property('code', 'unauthorized')

                response.statusCode.should.equal(401)
            })
        })
    })

    describe('Delete Pipeline', function () {
        describe('When passed an application and pipeline ID', function () {
            it('Should destroy the pipeline', async function () {
                const pipeline = await TestObjects.factory.createPipeline({
                    name: 'Test owned by Alice'
                }, TestObjects.application)

                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/applications/${TestObjects.application.hashid}/pipelines/${pipeline.hashid}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('status', 'okay')
                response.statusCode.should.equal(200)

                const foundPipeline = await app.db.models.Pipeline.findOne({
                    where: {
                        id: pipeline.id
                    }
                })

                should(foundPipeline).equal(null)
            })

            it('Also destroys all stages within the pipeline', async function () {
                const pipeline = TestObjects.pipeline
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, pipeline)

                const stages = await TestObjects.pipeline.stages()

                stages.length.should.equal(2, 'should start with two pipeline stages')

                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/applications/${TestObjects.application.hashid}/pipelines/${pipeline.hashid}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('status', 'okay')
                response.statusCode.should.equal(200)

                const foundPipeline = await app.db.models.Pipeline.findOne({
                    where: {
                        id: pipeline.id
                    }
                })

                should(foundPipeline).equal(null)

                const foundPipelineStages = await app.db.models.PipelineStage.byPipeline(pipeline.id)
                foundPipelineStages.length.should.equal(0)
            })
        })

        describe('With no pipeline ID', function () {
            it('Should fail gracefully', async function () {
                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/applications/${TestObjects.application.hashid}/pipelines/`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'not_found')
                response.statusCode.should.equal(404)
            })
        })

        describe('With a pipeline that does not exist', function () {
            it('Should fail gracefully', async function () {
                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/applications/${TestObjects.application.hashid}/pipelines/doesnotexist`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'not_found')
                response.statusCode.should.equal(404)
            })
        })

        describe('For an pipeline that is owned by another team', function () {
            it('Should fail validation', async function () {
                const userPez = await TestObjects.factory.createUser({
                    admin: false,
                    username: 'pez',
                    name: 'Pez Cuckow',
                    email: 'pez@example.com',
                    password: 'ppPassword'
                })

                const team1 = await TestObjects.factory.createTeam({ name: 'PTeam' })
                await team1.addUser(userPez, { through: { role: Roles.Owner } })

                await login('pez', 'ppPassword')

                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/applications/${TestObjects.application.hashid}/pipelines/${TestObjects.pipeline.hashid}`,
                    cookies: { sid: TestObjects.tokens.pez }
                })

                const body = await response.json()
                body.should.have.property('code', 'not_found')
                response.statusCode.should.equal(404)

                const foundPipeline = await app.db.models.Pipeline.findOne({
                    where: {
                        id: TestObjects.pipeline.id
                    }
                })

                should(foundPipeline).not.equal(null)
            })
        })
    })

    describe('Update Pipeline', function () {
        describe('When given a new name', function () {
            it('Should update the name of the pipeline', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/applications/${TestObjects.application.hashid}/pipelines/${TestObjects.pipeline.hashid}`,
                    payload: {
                        pipeline: { name: 'new-name' }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('name', 'new-name')
                response.statusCode.should.equal(200)

                await TestObjects.pipeline.reload()

                TestObjects.pipeline.name.should.equal('new-name')
            })
        })

        describe('With no name', function () {
            it('Unset - Should fail gracefully', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/applications/${TestObjects.application.hashid}/pipelines/${TestObjects.pipeline.hashid}`,
                    payload: {
                        pipeline: {}
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'invalid_name')
                body.should.have.property('error').match(/Name is required/)
                response.statusCode.should.equal(400)
            })

            it('Blank - Should fail gracefully', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/applications/${TestObjects.application.hashid}/pipelines/${TestObjects.pipeline.hashid}`,
                    payload: {
                        pipeline: {
                            name: ''
                        }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'invalid_name')
                body.should.have.property('error').match(/not be blank/)
                response.statusCode.should.equal(400)
            })

            it('String of spaces - Should fail gracefully', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/applications/${TestObjects.application.hashid}/pipelines/${TestObjects.pipeline.hashid}`,
                    payload: {
                        pipeline: {
                            name: '    '
                        }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'invalid_name')
                body.should.have.property('error').match(/not be blank/)
                response.statusCode.should.equal(400)
            })
        })

        describe('Owned by another team', function () {
            it('Should fail validation', async function () {
                const userPez = await TestObjects.factory.createUser({
                    admin: false,
                    username: 'pez',
                    name: 'Pez Cuckow',
                    email: 'pez@example.com',
                    password: 'ppPassword'
                })

                const team1 = await TestObjects.factory.createTeam({ name: 'PTeam' })
                await team1.addUser(userPez, { through: { role: Roles.Owner } })

                await login('pez', 'ppPassword')

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/applications/${TestObjects.application.hashid}/pipelines/${TestObjects.pipeline.hashid}`,
                    payload: {
                        name: 'haxor'
                    },
                    cookies: { sid: TestObjects.tokens.pez }
                })

                const body = await response.json()
                body.should.have.property('code', 'not_found')
                response.statusCode.should.equal(404)
            })
        })
    })

    describe('Deploy Pipeline Stage', function () {
        describe('With valid input', function () {
            it('Creates a snapshot of the pipeline stage, and copies to the next stage', async function () {
                // 1 -> 2
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageTwo.hashid}/deploy`,
                    payload: {
                        sourceStageId: TestObjects.stageOne.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('status', 'importing')

                async function isDeployComplete () {
                    const instanceStatusResponse = (await app.inject({
                        method: 'GET',
                        url: `/api/v1/projects/${TestObjects.instanceTwo.id}`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })).json()

                    return !instanceStatusResponse.isDeploying
                }

                await new Promise((resolve, reject) => {
                    const refreshIntervalId = setInterval(async () => {
                        if (await isDeployComplete()) {
                            clearInterval(refreshIntervalId)
                            resolve()
                        }
                    }, 250)
                })

                // Now actually check things worked
                // Snapshot created in stage 1, and set as target
                // Snapshot created in stage 2, and set as target
            })
        })

        describe('With invalid target stages', function () {
            it('Should fail gracefully when not found', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/invalid/deploy`,
                    payload: {
                        sourceStageId: TestObjects.stageOne.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'not_found')
                response.statusCode.should.equal(404)
            })

            it('Should fail gracefully if the stage is not part of the pipeline', async function () {
                TestObjects.pipeline2 = await TestObjects.factory.createPipeline({ name: 'new-pipeline-2' }, TestObjects.application)
                TestObjects.pl2StageOne = await TestObjects.factory.createPipelineStage({ name: 'pl2-stage-one', instanceId: TestObjects.instanceOne.id }, TestObjects.pipeline2)

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.pl2StageOne.hashid}/deploy`,
                    payload: {
                        sourceStageId: TestObjects.stageOne.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'invalid_stage')
                response.statusCode.should.equal(400)
            })

            // not sure how to do this as we can't create a stage with no instance?
            // it('Should fail gracefully if the stage has no instances', async function () {
            //     TestObjects.pipeline2 = await TestObjects.factory.createPipeline({ name: 'new-pipeline-2' }, TestObjects.application)
            //     TestObjects.pl2StageOne = await TestObjects.factory.createPipelineStage({ name: 'pl2-stage-one', instanceId: undefined }, TestObjects.pipeline2)

            //     const response = await app.inject({
            //         method: 'PUT',
            //         url: `/api/v1/pipelines/${TestObjects.pipeline2.hashid}/stages/${TestObjects.pl2StageOne.hashid}/deploy`,
            //         payload: {
            //             sourceStageId: TestObjects.stageOne.hashid
            //         },
            //         cookies: { sid: TestObjects.tokens.alice }
            //     })

            //     const body = await response.json()

            //     console.log(body)

            //     body.should.have.property('code', 'invalid_stage')
            //     response.statusCode.should.equal(400)

            // })
            // it('Should fail gracefully if the stage has more than one instance')
        })

        describe('With invalid source stages', function () {
            it('Should fail gracefully when not set', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageTwo.hashid}/deploy`,
                    payload: {
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'missing_source_stage')
                response.statusCode.should.equal(400)
            })

            it('Should fail gracefully when not found', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageTwo.hashid}/deploy`,
                    payload: {
                        sourceStageId: 'invalid'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'not_found')
                response.statusCode.should.equal(404)
            })

            it('Should fail gracefully if the stage is not part of the pipeline', async function () {
                TestObjects.pipeline2 = await TestObjects.factory.createPipeline({ name: 'new-pipeline-2' }, TestObjects.application)
                TestObjects.pl2StageOne = await TestObjects.factory.createPipelineStage({ name: 'pl2-stage-one', instanceId: TestObjects.instanceOne.id }, TestObjects.pipeline2)

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageTwo.hashid}/deploy`,
                    payload: {
                        sourceStageId: TestObjects.pl2StageOne.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'invalid_stage')
                response.statusCode.should.equal(400)
            })
            it('Should fail gracefully if the stage has no instances')
            it('Should fail gracefully if the stage has more than one instance')
        })

        describe('With instances that are on different teams', function () {
            it('Should fail gracefully')
        })
    })
})
