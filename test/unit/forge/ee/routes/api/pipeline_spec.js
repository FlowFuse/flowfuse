const { Op } = require('sequelize')
const should = require('should')
const sinon = require('sinon')
const { v4: uuidv4 } = require('uuid')

const { createSnapshot } = require('../../../../../../forge/services/snapshots')
const { addFlowsToProject } = require('../../../../../lib/Snapshots.js')
const TestModelFactory = require('../../../../../lib/TestModelFactory.js')

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Pipelines API', function () {
    const sandbox = sinon.createSandbox()

    const TestObjects = {
        tokens: {},
        /** @type {TestModelFactory} */
        factory: null
    }

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

    async function createDeviceSnapshot (device, options) {
        // Only stub once if called multiple times
        if (!app.comms.devices.sendCommandAwaitReply.restore) {
            sinon.stub(app.comms.devices, 'sendCommandAwaitReply').resolves({
                flows: [{ custom: 'custom-flows' }],
                credentials: {
                    $: {
                        key: 'value'
                    }
                },
                package: {
                    modules: {
                        custom: 'custom-module'
                    }
                }
            })
        }

        device.Team = TestObjects.team
        return await app.db.controllers.ProjectSnapshot.createDeviceSnapshot(TestObjects.application, device, TestObjects.user, options)
    }

    before(async function () {
        app = await setup()
        sandbox.stub(app.log, 'info')
        sandbox.stub(app.log, 'warn')
        sandbox.stub(app.log, 'error')

        const factory = new TestModelFactory(app)

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
        TestObjects.user = app.user

        TestObjects.deviceOne = await TestObjects.factory.createDevice({ name: 'device-a', type: 'dog' }, app.team, null, app.application)
        TestObjects.deviceTwo = await TestObjects.factory.createDevice({ name: 'device-b', type: 'robot' }, app.team, null, app.application)

        TestObjects.deviceGroupOne = await TestObjects.factory.createApplicationDeviceGroup({ name: 'device-group-a' }, app.application)
        TestObjects.deviceGroupTwo = await TestObjects.factory.createApplicationDeviceGroup({ name: 'device-group-b' }, app.application)

        const userPez = await TestObjects.factory.createUser({
            admin: false,
            username: 'pez',
            name: 'Pez Cuckow',
            email: 'pez@example.com',
            password: 'ppPassword'
        })

        const userBob = await TestObjects.factory.createUser({
            admin: false,
            username: 'bob',
            name: 'Bob Kenobi',
            email: 'bob@example.com',
            password: 'bbPassword'
        })

        const team1 = await TestObjects.factory.createTeam({ name: 'PTeam' })
        await team1.addUser(userPez, { through: { role: Roles.Owner } })
        await TestObjects.team.addUser(userBob, { through: { role: Roles.Member } })

        await login('pez', 'ppPassword')

        await login('bob', 'bbPassword')

        await login('alice', 'aaPassword')
    })

    after(async function () {
        await app.close()
        sandbox.restore()
    })
    beforeEach(async function () {
        /** @type {TestModelFactory} */
        const factory = app.factory
        TestObjects.pipeline = await factory.createPipeline({ name: 'new-pipeline' }, app.application)
        TestObjects.stageOne = await factory.createPipelineStage({ name: 'stage-one', instanceId: app.instance.id }, TestObjects.pipeline)

        TestObjects.pipelineDevices = await factory.createPipeline({ name: 'new-pipeline-devices' }, app.application)
        TestObjects.pipelineDevicesStageOne = await factory.createPipelineStage({ name: 'stage-one-devices', deviceId: TestObjects.deviceOne.id, action: 'use_latest_snapshot' }, TestObjects.pipelineDevices)

        TestObjects.pipelineDeviceGroups = await factory.createPipeline({ name: 'new-pipeline-device-groups' }, app.application)
        TestObjects.pipelineDeviceGroupsStageOne = await factory.createPipelineStage({ name: 'stage-one-instance', instanceId: app.instance.id, action: 'use_latest_snapshot' }, TestObjects.pipelineDeviceGroups)
        TestObjects.pipelineDeviceGroupsStageTwo = await factory.createPipelineStage({ name: 'stage-two-device-group', deviceGroupId: TestObjects.deviceGroupOne.id, source: TestObjects.pipelineDeviceGroupsStageOne.hashid, action: 'use_latest_snapshot' }, TestObjects.pipelineDeviceGroups)

        app.log.info.reset()
        app.log.warn.reset()
        app.log.error.reset()
    })
    afterEach(async function () {
        await app.db.models.PipelineStage.destroy({ where: {} })
        await app.db.models.Pipeline.destroy({ where: {} })
        await app.db.models.ProjectSnapshot.destroy({ where: {} })
    })

    describe('Create Pipeline Stage', function () {
        describe('With instance', function () {
            it('Should create a new pipeline stage', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/pipelines/${pipelineId}/stages`,
                    payload: {
                        name: 'stage-two',
                        instanceId: TestObjects.instanceTwo.id,
                        action: 'prompt'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('name', 'stage-two')
                body.should.have.property('instances')
                body.should.have.property('action', 'prompt')
                body.instances[0].should.have.property('name', 'instance-two')

                response.statusCode.should.equal(200)
            })

            describe('Validates that the pipeline is correct', function () {
                it('Rejects a pipeline stage if the instance is already in use', async function () {
                    const pipelineId = TestObjects.pipeline.hashid

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/pipelines/${pipelineId}/stages`,
                        payload: {
                            name: 'stage-two',
                            instanceId: TestObjects.instanceOne.id // in use
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()

                    body.should.have.property('code', 'invalid_input')
                    body.should.have.property('error').match(/instanceId/)
                    body.should.have.property('error').match(/already in use in this pipeline/)

                    response.statusCode.should.equal(400)
                })

                it('Rejects if trying to use action=use_active_snapshot', async function () {
                    const pipelineId = TestObjects.pipeline.hashid

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/pipelines/${pipelineId}/stages`,
                        payload: {
                            name: 'stage-two',
                            instanceId: TestObjects.instanceTwo.id,
                            action: 'use_active_snapshot'
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()

                    body.should.have.property('code', 'invalid_input')
                    body.should.have.property('error').match(/only support the following/)

                    response.statusCode.should.equal(400)
                })

                it('Rejects if instance owned by another application', async function () {
                    const application2 = await TestObjects.factory.createApplication({ name: 'application-1 2' }, TestObjects.team)
                    const instanceThree = await TestObjects.factory.createInstance(
                        { name: 'instance-three' },
                        application2,
                        app.stack,
                        app.template,
                        app.projectType,
                        { start: false }
                    )
                    const pipelineId = TestObjects.pipeline.hashid

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/pipelines/${pipelineId}/stages`,
                        payload: {
                            name: 'stage-two',
                            instanceId: instanceThree.id,
                            action: 'prompt'
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()
                    response.statusCode.should.equal(400)
                    body.should.have.property('code', 'invalid_input')
                    body.should.have.property('error').match(/Invalid instance/)
                })
            })
        })

        describe('With device', function () {
            it('Should create a pipeline stage', async function () {
                const pipelineId = TestObjects.pipelineDevices.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/pipelines/${pipelineId}/stages`,
                    payload: {
                        name: 'stage-two',
                        deviceId: TestObjects.deviceTwo.hashid,
                        action: 'prompt'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('name', 'stage-two')
                body.should.have.property('devices')

                body.devices[0].should.have.property('name', 'device-b')

                response.statusCode.should.equal(200)
            })

            describe('Validates that the pipeline is correct', function () {
                it('Rejects a pipeline stage if the device is already in use', async function () {
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/pipelines/${TestObjects.pipelineDevices.hashid}/stages`,
                        payload: {
                            name: 'stage-two',
                            deviceId: TestObjects.deviceOne.hashid // in use
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()

                    body.should.have.property('code', 'invalid_input')
                    body.should.have.property('error').match(/deviceId/)
                    body.should.have.property('error').match(/already in use in this pipeline/)

                    response.statusCode.should.equal(400)
                })
                it('Rejects if device owned by another application', async function () {
                    const application2 = await TestObjects.factory.createApplication({ name: 'application-1 2' }, TestObjects.team)
                    const otherDevice = await TestObjects.factory.createDevice({ name: 'device-b', type: 'dog' }, TestObjects.team, null, application2)

                    const pipelineId = TestObjects.pipeline.hashid

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/pipelines/${pipelineId}/stages`,
                        payload: {
                            name: 'stage-two',
                            deviceId: otherDevice.hashid,
                            action: 'prompt'
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()
                    response.statusCode.should.equal(400)
                    body.should.have.property('code', 'invalid_input')
                    body.should.have.property('error').match(/Invalid device/)
                })
            })
        })

        describe('With device group', function () {
            it('Should create a pipeline stage', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/pipelines/${pipelineId}/stages`,
                    payload: {
                        name: 'stage-two',
                        deviceGroupId: TestObjects.deviceGroupTwo.hashid,
                        action: 'prompt'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response.statusCode.should.equal(200)

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('name', 'stage-two')
                body.should.have.property('deviceGroups')

                body.deviceGroups[0].should.have.property('name', 'device-group-b')
            })

            describe('Validates that the first stage cannot be a device group', function () {
                it('Rejects a pipeline stage if the device group is applied to the 1st stage', async function () {
                    const pl = await TestObjects.factory.createPipeline({ name: 'new-pipeline' }, app.application)

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/pipelines/${pl.hashid}/stages`,
                        payload: {
                            name: 'stage-one',
                            deviceGroupId: TestObjects.deviceGroupOne.hashid
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    response.statusCode.should.equal(400)
                    const body = await response.json()
                    body.should.have.property('code', 'invalid_input')
                    body.should.have.property('error').match(/A Device Group cannot be the first stage/)
                })
                it('Rejects a pipeline stage if the device group owned by another application', async function () {
                    const application2 = await TestObjects.factory.createApplication({ name: 'application-1 2' }, TestObjects.team)
                    const otherDeviceGroup = await TestObjects.factory.createApplicationDeviceGroup({ name: 'device-group-c' }, application2)

                    const pipelineId = TestObjects.pipeline.hashid

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/pipelines/${pipelineId}/stages`,
                        payload: {
                            name: 'stage-two',
                            deviceGroupId: otherDeviceGroup.hashid,
                            action: 'prompt'
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })
                    response.statusCode.should.equal(400)
                    const body = await response.json()
                    body.should.have.property('code', 'invalid_input')
                    body.should.have.property('error').match(/Invalid device group/)
                })
            })

            describe('Validates that a stage cannot be added after device group', function () {
                it('Rejects a pipeline stage if the device group is added where a device group already exists', async function () {
                    const newPipeline = await TestObjects.factory.createPipeline({ name: 'new-pipeline' }, app.application)
                    const pipelineId = newPipeline.hashid
                    // add an instance stage
                    const s1 = await TestObjects.factory.createPipelineStage({ name: 'stage-one', instanceId: app.instance.id }, newPipeline)
                    // add a device group stage
                    const s2DeviceGroup = await TestObjects.factory.createApplicationDeviceGroup({ name: 'device-group-c' }, app.application)
                    await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceGroupId: s2DeviceGroup.hashid, source: s1.hashid, action: 'use_latest_snapshot' }, newPipeline)
                    const newDeviceGroup = await TestObjects.factory.createApplicationDeviceGroup({ name: 'device-group-d' }, app.application)

                    // try to add another device group stage
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/pipelines/${pipelineId}/stages`,
                        payload: {
                            name: 'stage-three',
                            deviceGroupId: newDeviceGroup.hashid,
                            action: 'prompt'
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    response.statusCode.should.equal(400)
                    const body = await response.json()
                    body.should.have.property('code', 'invalid_input')
                    body.should.have.property('error').match(/only one device group/i)
                })
            })
        })

        describe('With either device or instance', function () {
            describe('When a previous stage is passed', function () {
                it('Should set the previous stages nextStage to the newly created pipeline stage', async function () {
                    const pipelineId = TestObjects.pipeline.hashid

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/pipelines/${pipelineId}/stages`,
                        payload: {
                            name: 'stage-two',
                            instanceId: TestObjects.instanceTwo.id,
                            source: TestObjects.stageOne.hashid
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
        })

        describe('With both device and instance', function () {
            it('Rejects the request gracefully', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/pipelines/${pipelineId}/stages`,
                    payload: {
                        name: 'stage-two',
                        deviceId: TestObjects.deviceTwo.hashid,
                        instanceId: TestObjects.instanceTwo.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'invalid_input')
                body.should.have.property('error').match(/only one is permitted/i)

                response.statusCode.should.equal(400)
            })
        })

        describe('With both device and device group', function () {
            it('Rejects the request gracefully', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/pipelines/${pipelineId}/stages`,
                    payload: {
                        name: 'stage-two',
                        deviceId: TestObjects.deviceTwo.id,
                        deviceGroupId: TestObjects.deviceGroupTwo.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'invalid_input')
                body.should.have.property('error').match(/only one is permitted/i)

                response.statusCode.should.equal(400)
            })
        })

        describe('With both instance and device group', function () {
            it('Rejects the request gracefully', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/pipelines/${pipelineId}/stages`,
                    payload: {
                        name: 'stage-two',
                        instanceId: TestObjects.instanceTwo.id,
                        deviceGroupId: TestObjects.deviceGroupTwo.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'invalid_input')
                body.should.have.property('error').match(/only one is permitted/i)

                response.statusCode.should.equal(400)
            })
        })

        describe('With neither device, instance or device group', function () {
            it('Fails gracefully with a clear error', async function () {
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

                body.should.have.property('code', 'invalid_input')
                body.should.have.property('error').match(/instance/)
                body.should.have.property('error').match(/device/)
                body.should.have.property('error').match(/group/)
                body.should.have.property('error').match(/is required/)

                response.statusCode.should.equal(400)
            })
        })
    })

    describe('Get Pipeline Stage', function () {
        it('Should return a single pipeline stage with an instance', async function () {
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
            body.instances.should.have.length(1)

            response.statusCode.should.equal(200)
        })

        it('Should return a single pipeline stage with a device', async function () {
            const pipelineId = TestObjects.pipelineDevices.hashid
            const stageId = TestObjects.pipelineDevicesStageOne.hashid

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()

            body.should.have.property('id')
            body.should.have.property('name', 'stage-one-devices')
            body.should.have.property('devices')
            body.devices[0].should.have.property('name', 'device-a')
            body.devices.should.have.length(1)

            response.statusCode.should.equal(200)
        })

        it('Should return a single pipeline stage with a device group', async function () {
            const pipelineId = TestObjects.pipelineDeviceGroups.hashid
            const stageId = TestObjects.pipelineDeviceGroupsStageTwo.hashid

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            response.statusCode.should.equal(200)

            const body = await response.json()
            body.should.have.property('id')
            body.should.have.property('name', 'stage-two-device-group')
            body.should.have.property('deviceGroups').and.be.an.Array().and.have.length(1)
            body.deviceGroups[0].should.have.property('name', 'device-group-a')
            body.deviceGroups[0].should.have.property('deviceCount', 0)
            body.deviceGroups[0].should.have.property('targetMatchCount', 0)
            body.deviceGroups[0].should.have.property('activeMatchCount', 0)
            body.deviceGroups[0].should.have.property('developerModeCount', 0)
            body.deviceGroups[0].should.have.property('runningCount', 0)
            body.deviceGroups[0].should.have.property('isDeploying', false)
            body.deviceGroups[0].should.have.property('hasTargetSnapshot', false)
        })

        it('Should fail if the pipeline does not contain the request stage', async function () {
            const pipelineId = TestObjects.pipelineDevices.hashid
            const stageId = TestObjects.stageOne.hashid

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()
            body.should.have.property('code', 'not_found')

            response.statusCode.should.equal(404)
        })

        it('Should fail if the stage does not exist', async function () {
            const pipelineId = TestObjects.pipelineDevices.hashid
            const stageId = 'XdWMHFcS' // fake-id

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()
            body.should.have.property('code', 'not_found')

            response.statusCode.should.equal(404)
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

                body.should.have.property('code', 'invalid_input')
                body.should.have.property('error').match(/instanceId/)

                response.statusCode.should.equal(400)
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

                body.should.have.property('code', 'invalid_instancesHaveSameApplication')
                body.should.have.property('error').match(/not a member of application/)

                response.statusCode.should.equal(400)
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

                body.should.have.property('code', 'invalid_instancesHaveSameApplication')
                body.should.have.property('error').match(/not a member of application/)

                response.statusCode.should.equal(400)
            })

            it('Should unassign the old device', async function () {
                const pipelineId = TestObjects.pipelineDevices.hashid
                const stageId = TestObjects.pipelineDevicesStageOne.hashid

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        instanceId: TestObjects.instanceOne.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('instances')
                body.instances.should.have.length(1)
                body.instances[0].should.have.property('name', 'project1');
                (body.devices || []).should.have.length(0)

                response.statusCode.should.equal(200)
            })
        })

        describe('With a new device', function () {
            it('Should unassign the old device and assign the new one', async function () {
                const pipelineId = TestObjects.pipelineDevices.hashid
                const stageId = TestObjects.pipelineDevicesStageOne.hashid

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        deviceId: TestObjects.deviceTwo.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('devices')
                body.devices.should.have.length(1)
                body.devices[0].should.have.property('name', 'device-b');
                (body.instances || []).should.have.length(0)

                response.statusCode.should.equal(200)
            })

            it('Should require the device to be part of the same application', async function () {
                const pipelineId = TestObjects.pipelineDevices.hashid
                const stageId = TestObjects.pipelineDevicesStageOne.hashid

                const otherApplication = await TestObjects.factory.createApplication({
                    name: 'other-application'
                }, TestObjects.team)

                const deviceFromOtherApplication = await TestObjects.factory.createDevice({ name: 'device-b', type: 'robot' }, TestObjects.team, null, otherApplication)

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        deviceId: deviceFromOtherApplication.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('code', 'invalid_devicesHaveSameApplication')
                body.should.have.property('error').match(/not a member of application/)

                response.statusCode.should.equal(400)
            })

            it('Should unassign the old instance', async function () {
                const pipelineId = TestObjects.pipeline.hashid
                const stageId = TestObjects.stageOne.hashid

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        deviceId: TestObjects.deviceOne.hashid,
                        action: 'prompt'
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('devices')
                body.devices.should.have.length(1)
                body.devices[0].should.have.property('name', 'device-a');
                (body.instances || []).should.have.length(0)

                response.statusCode.should.equal(200)
            })
        })

        describe('With a new device group', function () {
            it('Should unassign the old device group and assign the new one', async function () {
                const pipelineId = TestObjects.pipelineDeviceGroups.hashid
                const stageId = TestObjects.pipelineDeviceGroupsStageTwo.hashid // the 2nd stage is the one with the device group
                const newDeviceGroup = await TestObjects.factory.createApplicationDeviceGroup({ name: 'new-device-group' }, TestObjects.application)
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        deviceGroupId: newDeviceGroup.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }

                })

                const body = await response.json()

                body.should.have.property('id')
                body.should.have.property('deviceGroups').and.be.an.Array().and.have.length(1)
                body.deviceGroups[0].should.have.property('name', 'new-device-group')

                response.statusCode.should.equal(200)
            })

            it('Should require the device group to be part of the same application', async function () {
                const pipelineId = TestObjects.pipelineDeviceGroups.hashid
                const stageId = TestObjects.pipelineDeviceGroupsStageTwo.hashid

                const otherApplication = await TestObjects.factory.createApplication({
                    name: 'other-application'
                }, TestObjects.team)

                // const deviceGroupFromOtherApplication = await TestObjects.factory.createDevice({ name: 'device-b', type: 'robot' }, TestObjects.team, null, otherApplication)
                const deviceGroupFromOtherApplication = await TestObjects.factory.createApplicationDeviceGroup({ name: 'device-group-b' }, otherApplication)

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        deviceGroupId: deviceGroupFromOtherApplication.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response.statusCode.should.equal(400)

                const body = await response.json()
                body.should.have.property('code', 'invalid_deviceGroupsHaveSameApplication')
                body.should.have.property('error').match(/not a member of application/)
            })

            it('Should not be allowed to replace 1st stage', async function () {
                const pipelineId = TestObjects.pipeline.hashid
                const stageId = TestObjects.stageOne.hashid

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        deviceGroupId: TestObjects.deviceOne.hashid,
                        action: 'prompt'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response.statusCode.should.equal(400)

                const body = await response.json()
                body.should.have.property('code', 'invalid_input')
                body.should.have.property('error').match(/A Device Group cannot be the first stage/i)
            })

            it('Should not be allowed set a center stage as a device group', async function () {
                const pipelineId = TestObjects.pipeline.hashid
                const stageId = TestObjects.stageOne.hashid

                // add a device as the 2nd stage - this will be the center stage
                await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceId: TestObjects.deviceOne.id, source: TestObjects.stageOne.hashid, action: 'use_active_snapshot' }, TestObjects.pipeline)

                // add a device group as the 3rd stage - this will be the last stage
                await TestObjects.factory.createPipelineStage({ name: 'stage-three', deviceGroupId: TestObjects.deviceGroupOne.id, source: TestObjects.stageOne.hashid, action: 'use_active_snapshot' }, TestObjects.pipeline)

                // now attempt to update the center stage as a device group
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                    payload: {
                        deviceGroupId: TestObjects.deviceGroupTwo.hashid,
                        action: 'prompt'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response.statusCode.should.equal(400)

                const body = await response.json()
                body.should.have.property('code', 'invalid_input')
            })
        })
    })

    describe('Delete Pipeline Stage', function () {
        it('should destroy the pipeline stage, but not touch the assigned instance', async function () {
            const pipelineId = TestObjects.pipeline.hashid
            const stageId = TestObjects.stageOne.hashid
            const instanceId = TestObjects.instanceOne.id

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()
            body.should.have.property('status', 'okay')
            response.statusCode.should.equal(200)

            should(await app.db.models.PipelineStage.byId(stageId)).equal(null)
            should(await app.db.models.Project.byId(instanceId)).not.equal(null)
        })

        it('should destroy the pipeline stage, but not touch the assigned device', async function () {
            const pipelineId = TestObjects.pipelineDevices.hashid
            const stageId = TestObjects.pipelineDevicesStageOne.hashid
            const deviceId = TestObjects.deviceOne.hashid

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()
            body.should.have.property('status', 'okay')
            response.statusCode.should.equal(200)

            should(await app.db.models.PipelineStage.byId(stageId)).equal(null)
            should(await app.db.models.Device.byId(deviceId)).not.equal(null)
        })

        it('should destroy the pipeline stage, but not touch the assigned device group', async function () {
            const pipelineId = TestObjects.pipelineDeviceGroups.hashid
            const stageId = TestObjects.pipelineDeviceGroupsStageOne.hashid
            const deviceGroupId = TestObjects.deviceGroupOne.hashid

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()
            body.should.have.property('status', 'okay')
            response.statusCode.should.equal(200)

            should(await app.db.models.PipelineStage.byId(stageId)).equal(null)
            should(await app.db.models.DeviceGroup.byId(deviceGroupId)).not.equal(null)
        })

        it('should fail if the pipeline stage is not on this pipeline', async function () {
            const pipelineId = TestObjects.pipelineDevices.hashid
            const stageId = TestObjects.stageOne.hashid

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()
            body.should.have.property('code', 'not_found')
            response.statusCode.should.equal(404)
        })

        it('should fail if the pipeline stage not found', async function () {
            const pipelineId = TestObjects.pipelineDevices.hashid
            const stageId = 'X82nTt' // fake ID

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/pipelines/${pipelineId}/stages/${stageId}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()
            body.should.have.property('code', 'not_found')
            response.statusCode.should.equal(404)
        })

        describe('When there is a pipeline before and after', function () {
            it('should re-connect the previous to the next pipeline', async function () {
                const pipelineId = TestObjects.pipeline.hashid

                // 1 -> 2 -> 3 delete 2
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)
                await TestObjects.stageOne.reload()
                TestObjects.stageThree = await TestObjects.factory.createPipelineStage({ name: 'stage-three', deviceId: TestObjects.deviceOne.id, source: TestObjects.stageTwo.hashid, action: 'use_active_snapshot' }, TestObjects.pipeline)
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
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceId: TestObjects.deviceOne.id, source: TestObjects.stageOne.hashid, action: 'use_active_snapshot' }, TestObjects.pipeline)
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
                    url: '/api/v1/pipelines',
                    payload: {
                        applicationId,
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
                    url: '/api/v1/pipelines',
                    payload: {
                        applicationId
                    },
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
                    url: '/api/v1/pipelines',
                    payload: {
                        name: ' ',
                        applicationId
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
                    url: '/api/v1/pipelines',
                    payload: {
                        name: pipelineName,
                        applicationId
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
                    url: '/api/v1/pipelines',
                    payload: {
                        name: pipelineName,
                        applicationId
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
                const pipelineName = 'new-pipeline'
                const applicationId = TestObjects.application.hashid // we are logged in as pez, but this is owned by alice

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/pipelines',
                    payload: {
                        name: pipelineName,
                        applicationId
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
                    url: '/api/v1/pipelines',
                    payload: {
                        name: pipelineName,
                        applicationId
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
                    url: `/api/v1/pipelines/${pipeline.hashid}`,
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
                    url: `/api/v1/pipelines/${pipeline.hashid}`,
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
                    url: '/api/v1/pipelines/',
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
                    url: '/api/v1/pipelines/doesnotexist',
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()
                body.should.have.property('code', 'not_found')
                response.statusCode.should.equal(404)
            })
        })

        describe('For an pipeline that is owned by another team', function () {
            it('Should fail validation', async function () {
                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}`,
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
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}`,
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
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}`,
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
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}`,
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
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}`,
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
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}`,
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
        async function isDeployComplete (instance) {
            const instanceStatusResponse = (await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${instance.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })).json()

            return instanceStatusResponse?.meta?.isDeploying === false
        }

        function waitForDeployToComplete (instance) {
            return new Promise((resolve, reject) => {
                const refreshIntervalId = setInterval(async () => {
                    if (await isDeployComplete(instance)) {
                        clearInterval(refreshIntervalId)
                        resolve()
                    }
                }, 250)
            })
        }
        async function isDeviceDeployComplete (device) {
            const statusResponse = (await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${device.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })).json()

            return {
                isDeploying: statusResponse?.isDeploying === true,
                targetSnapshotHashid: statusResponse?.targetSnapshot?.id
            }
        }

        function waitForDeviceDeployGetTargetSnapshot (device) {
            return new Promise((resolve, reject) => {
                const refreshIntervalId = setInterval(async () => {
                    const { isDeploying, targetSnapshotHashid } = await isDeviceDeployComplete(device)
                    if (isDeploying) {
                        clearInterval(refreshIntervalId)
                        resolve(targetSnapshotHashid)
                    }
                }, 30)
            })
        }

        beforeEach(async function () {
            TestObjects.tokens.instanceOne = (await TestObjects.instanceOne.refreshAuthTokens()).token
        })

        describe('With action=create_snapshot', function () {
            beforeEach(async function () {
                await TestObjects.stageOne.update({ action: 'create_snapshot' })
                await TestObjects.pipelineDevicesStageOne.update({ action: 'create_snapshot' }, { validate: false }) // Force into bad state
            })

            describe('With valid input', function () {
                describe('For instance=>instance', function () {
                    it('Creates a snapshot of the source instance, and copies to the target instance', async function () {
                        // Setup an initial configuration
                        const setupResult = await addFlowsToProject(app,
                            TestObjects.instanceOne.id,
                            TestObjects.tokens.instanceOne,
                            TestObjects.tokens.alice,
                            [{ id: 'node1' }], // flows
                            { testCreds: 'abc' }, // credentials
                            'key1', // key
                            // settings
                            {
                                httpAdminRoot: '/test-red',
                                dashboardUI: '/test-dash',
                                palette: {
                                    modules: [
                                        { name: 'module1', version: '1.0.0' }
                                    ]
                                },
                                env: [
                                    { name: 'one', value: 'a' },
                                    { name: 'two', value: 'b' }
                                ]
                            }
                        )

                        // ensure setup was successful before generating a snapshot & performing rollback
                        setupResult.flowsAddResponse.statusCode.should.equal(200)
                        setupResult.credentialsCreateResponse.statusCode.should.equal(200)
                        setupResult.storageSettingsResponse.statusCode.should.equal(200)
                        setupResult.updateProjectSettingsResponse.statusCode.should.equal(200)

                        // 1 -> 2
                        TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)

                        const response = await app.inject({
                            method: 'PUT',
                            url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                            cookies: { sid: TestObjects.tokens.alice }
                        })

                        const body = await response.json()
                        body.should.have.property('status', 'importing')

                        // Wait for the deploy to complete
                        await waitForDeployToComplete(TestObjects.instanceTwo)

                        // Now actually check things worked
                        // Snapshot created in stage 1
                        // Snapshot created in stage 2, flows created, and set as target
                        const sourceStageSnapshots = await TestObjects.instanceOne.getProjectSnapshots()
                        sourceStageSnapshots.should.have.lengthOf(1)
                        sourceStageSnapshots[0].name.should.match(/Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
                        sourceStageSnapshots[0].description.should.match(/Snapshot created for pipeline deployment from stage-one to stage-two as part of pipeline new-pipeline/)

                        // Get the snapshot for instance 2 post deploy
                        const targetStageSnapshots = await TestObjects.instanceTwo.getProjectSnapshots()
                        targetStageSnapshots.should.have.lengthOf(1)

                        const targetSnapshot = targetStageSnapshots[0]

                        targetSnapshot.name.should.match(/Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
                        targetSnapshot.description.should.match(/Snapshot created for pipeline deployment from stage-one to stage-two as part of pipeline new-pipeline/)

                        targetSnapshot.flows.should.have.property('flows')
                        targetSnapshot.flows.flows.should.have.lengthOf(1)
                        targetSnapshot.flows.flows[0].should.have.property('id', 'node1')
                        targetSnapshot.flows.should.have.property('credentials')
                        targetSnapshot.flows.credentials.should.have.property('$')
                        targetSnapshot.settings.should.have.property('settings')
                        targetSnapshot.settings.settings.should.have.property('httpAdminRoot', '/test-red')
                        targetSnapshot.settings.settings.should.have.property('dashboardUI', '/test-dash')
                        targetSnapshot.settings.should.have.property('env')
                        targetSnapshot.settings.env.should.have.property('one', 'a')
                        targetSnapshot.settings.env.should.have.property('two', 'b')
                        targetSnapshot.settings.should.have.property('modules')

                        // Verify the container driver was asked to restart the flows
                        app.log.info.calledWith(`[stub driver] Restarting flows ${TestObjects.instanceTwo.id}`).should.be.true()
                    })
                })

                describe('For device=>instance', function () {
                    it('Should fail gracefully as creating snapshots of devices at deploy time is not supported', async function () {
                        // 1 -> 2
                        TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceOne.id, source: TestObjects.pipelineDevicesStageOne.hashid }, TestObjects.pipelineDevices)

                        const response = await app.inject({
                            method: 'PUT',
                            url: `/api/v1/pipelines/${TestObjects.pipelineDevices.hashid}/stages/${TestObjects.pipelineDevicesStageOne.hashid}/deploy`,
                            cookies: { sid: TestObjects.tokens.alice }
                        })

                        const body = await response.json()

                        body.should.have.property('code', 'invalid_source_action')
                        body.error.should.match(/not supported/)

                        response.statusCode.should.equal(400)
                    })
                })

                describe('For device=>device', function () {
                    it('Should fail gracefully as creating snapshots of devices at deploy time is not supported', async function () {
                        // 1 -> 2
                        TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceId: TestObjects.deviceTwo.id, source: TestObjects.pipelineDevicesStageOne.hashid, action: 'prompt' }, TestObjects.pipelineDevices)

                        const response = await app.inject({
                            method: 'PUT',
                            url: `/api/v1/pipelines/${TestObjects.pipelineDevices.hashid}/stages/${TestObjects.pipelineDevicesStageOne.hashid}/deploy`,
                            cookies: { sid: TestObjects.tokens.alice }
                        })

                        const body = await response.json()

                        body.should.have.property('code', 'invalid_source_action')
                        body.error.should.match(/not supported/)

                        response.statusCode.should.equal(400)
                    })
                })

                describe('For instance=>device', function () {
                    it('Creates a snapshot of the source instance and sets it at the target snapshot on the target device', async function () {
                        // No snapshot yet
                        const latestSnapshot = await TestObjects.instanceOne.getProjectSnapshots()
                        latestSnapshot.should.have.length(0)

                        // 1 -> 2
                        TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceId: TestObjects.deviceTwo.id, source: TestObjects.stageOne.hashid, action: 'prompt' }, TestObjects.pipeline)

                        const response = await app.inject({
                            method: 'PUT',
                            url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                            cookies: { sid: TestObjects.tokens.alice }
                        })

                        const body = await response.json()
                        body.should.have.property('status', 'importing')

                        const createdSnapshot = await TestObjects.instanceOne.getLatestSnapshot()
                        should(createSnapshot).should.not.equal(undefined)

                        // Wait for the deploy to complete & check the target snapshot has been set
                        const targetSnapshotHashid = await waitForDeviceDeployGetTargetSnapshot(TestObjects.deviceTwo)
                        createdSnapshot.hashid.should.equal(targetSnapshotHashid)
                    })
                })
            })

            describe('With invalid source stages', function () {
                it('Should fail gracefully when not set', async function () {
                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages//deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()

                    body.should.have.property('code', 'not_found')
                    response.statusCode.should.equal(404)
                })

                it('Should fail gracefully when not found', async function () {
                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/invalid/deploy`,
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
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()

                    body.should.have.property('code', 'invalid_stage')
                    response.statusCode.should.equal(400)
                })
            })

            describe('With invalid target stage', function () {
                it('Fails gracefully if the target device is in developer mode', async function () {
                    const deviceInDeveloperMode = await TestObjects.factory.createDevice({ name: 'device-in-developer-mode', mode: 'developer' }, app.team, null, app.application)

                    // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceId: deviceInDeveloperMode.id, source: TestObjects.stageOne.hashid, action: 'prompt' }, TestObjects.pipeline)

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()

                    body.should.have.property('code', 'invalid_target_stage')
                    response.statusCode.should.equal(400)
                })
            })
        })

        describe('With action=prompt', function () {
            beforeEach(async function () {
                await TestObjects.stageOne.update({ action: 'prompt' })
                await TestObjects.pipelineDevicesStageOne.update({ action: 'prompt' })
            })

            afterEach(async function () {
                await app.db.models.ProjectSnapshot.destroy({
                    where: {
                        ProjectId: [TestObjects.instanceOne.id, TestObjects.instanceTwo.id]
                    }
                })
            })

            describe('With invalid input', function () {
                it('Should require the user passing in a snapshot ID to copy to the target instance', async function () {
                // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()
                    body.should.have.property('code', 'invalid_source_snapshot')
                    response.statusCode.should.equal(400)
                })

                it('Should fail gracefully if the passed in instance snapshot ID is not from the correct pipeline stage', async function () {
                    // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)

                    const snapshotFromOtherInstance = await createSnapshot(app, TestObjects.instanceTwo, TestObjects.user, {
                        name: 'Oldest Existing Snapshot Created In Test',
                        description: 'This was the first snapshot created as part of the test process',
                        setAsTarget: false // no need to deploy to devices of the source
                    })

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice },
                        payload: {
                            sourceSnapshotId: snapshotFromOtherInstance.hashid
                        }
                    })

                    const body = await response.json()
                    body.should.have.property('code', 'invalid_source_snapshot')
                    body.error.should.match(/not associated with source instance/)
                    response.statusCode.should.equal(400)
                })

                it('Should fail gracefully if the passed in device snapshot ID is not from the correct pipeline stage', async function () {
                    // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two-devices', deviceId: TestObjects.deviceTwo.id, source: TestObjects.pipelineDevicesStageOne.hashid, action: 'use_active_snapshot' }, TestObjects.pipelineDevices)

                    const snapshotFromOtherDevice = await createDeviceSnapshot(TestObjects.deviceTwo, {
                        name: 'snapshot1',
                        description: 'a snapshot'
                    })

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipelineDevices.hashid}/stages/${TestObjects.pipelineDevicesStageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice },
                        payload: {
                            sourceSnapshotId: snapshotFromOtherDevice.hashid
                        }
                    })

                    const body = await response.json()
                    body.should.have.property('code', 'invalid_source_snapshot')
                    body.error.should.match(/not associated with source device/)
                    response.statusCode.should.equal(400)
                })
            })

            describe('For instance=>instance', function () {
                it('Should copy the existing selected instance snapshot to the target instance', async function () {
                    // Setup an initial configuration
                    const setupResult = await addFlowsToProject(app,
                        TestObjects.instanceOne.id,
                        TestObjects.tokens.instanceOne,
                        TestObjects.tokens.alice,
                        [{ id: 'node1' }], // flows
                        { testCreds: 'abc' }, // credentials
                        'key1', // key
                        // settings
                        {
                            httpAdminRoot: '/test-red',
                            dashboardUI: '/test-dash',
                            palette: {
                                modules: [
                                    { name: 'module1', version: '1.0.0' }
                                ]
                            },
                            env: [
                                { name: 'one', value: 'a' },
                                { name: 'two', value: 'b' }
                            ]
                        }
                    )

                    // Ensure setup was successful
                    setupResult.flowsAddResponse.statusCode.should.equal(200)
                    setupResult.credentialsCreateResponse.statusCode.should.equal(200)
                    setupResult.storageSettingsResponse.statusCode.should.equal(200)
                    setupResult.updateProjectSettingsResponse.statusCode.should.equal(200)

                    // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)

                    await createSnapshot(app, TestObjects.instanceOne, TestObjects.user, {
                        name: 'Oldest Existing Snapshot Created In Test',
                        description: 'This was the first snapshot created as part of the test process',
                        setAsTarget: false // no need to deploy to devices of the source
                    })

                    // This one has custom props to validate against
                    const existingSnapshot = await createSnapshot(app, TestObjects.instanceOne, TestObjects.user, {
                        name: 'Existing Snapshot Created In Test',
                        description: 'This was the second snapshot created as part of the test process',
                        setAsTarget: false, // no need to deploy to devices of the source
                        flows: { custom: 'custom-flows' },
                        credentials: { custom: 'custom-creds' },
                        settings: {
                            modules: { custom: 'custom-module' },
                            env: { custom: 'custom-env' }
                        }
                    })

                    await createSnapshot(app, TestObjects.instanceOne, TestObjects.user, {
                        name: 'Another Existing Snapshot Created In Test',
                        description: 'This was the last snapshot created as part of the test process',
                        setAsTarget: false // no need to deploy to devices of the source
                    })

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice },
                        payload: {
                            sourceSnapshotId: existingSnapshot.hashid
                        }
                    })

                    const body = await response.json()
                    body.should.have.property('status', 'importing')

                    // Wait for the deploy to complete
                    await waitForDeployToComplete(TestObjects.instanceTwo)

                    // No new snapshot should have been created in stage 1
                    const sourceInstanceSnapshots = await TestObjects.instanceOne.getProjectSnapshots()
                    sourceInstanceSnapshots.should.have.lengthOf(3)

                    // Snapshot created in stage 2, flows created, and set as target

                    // Get the snapshot for instance 2 post deploy
                    const snapshots = await TestObjects.instanceTwo.getProjectSnapshots()
                    snapshots.should.have.lengthOf(1)

                    const targetSnapshot = snapshots[0]

                    targetSnapshot.name.should.match(/Existing Snapshot Created In Test - Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
                    targetSnapshot.description.should.match(/Snapshot created for pipeline deployment from stage-one to stage-two as part of pipeline new-pipeline/)
                    targetSnapshot.description.should.match(/This was the second snapshot created as part of the test process/)

                    targetSnapshot.flows.should.have.property('flows')
                    targetSnapshot.flows.flows.should.match({ custom: 'custom-flows' })

                    targetSnapshot.flows.should.have.property('credentials')
                    targetSnapshot.flows.credentials.should.have.property('$')

                    targetSnapshot.settings.should.have.property('settings')
                    targetSnapshot.settings.modules.should.have.property('custom', 'custom-module')
                    targetSnapshot.settings.env.should.have.property('custom', 'custom-env')

                    // Verify the container driver was asked to restart the flows
                    app.log.info.calledWith(`[stub driver] Restarting flows ${TestObjects.instanceTwo.id}`).should.be.true()
                })
            })

            describe('For device=>instance', function () {
                it('Should copy the existing selected device snapshot to the target instance', async function () {
                    await createDeviceSnapshot(TestObjects.deviceOne, {
                        name: 'old-snapshot',
                        description: 'a snapshot created first'
                    })

                    const snapshotToSetAsTarget = await createDeviceSnapshot(TestObjects.deviceOne, {
                        name: 'device-snapshot-to-set-as-target',
                        description: 'a snapshot that will become the target'
                    })

                    await createDeviceSnapshot(TestObjects.deviceOne, {
                        name: 'latest-snapshot',
                        description: 'a snapshot crated last'
                    })

                    // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.pipelineDevicesStageOne.hashid }, TestObjects.pipelineDevices)

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipelineDevices.hashid}/stages/${TestObjects.pipelineDevicesStageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice },
                        payload: {
                            sourceSnapshotId: snapshotToSetAsTarget.hashid
                        }
                    })

                    const body = await response.json()
                    body.should.have.property('status', 'importing')

                    // Wait for the deploy to complete
                    await waitForDeployToComplete(TestObjects.instanceTwo)

                    // No new snapshot should have been created in stage 1
                    const sourceDeviceSnapshots = await TestObjects.deviceOne.getProjectSnapshots()
                    sourceDeviceSnapshots.should.have.lengthOf(3)

                    // Snapshot created in stage 2, flows created, and set as target

                    // Get the snapshot for instance 2 post deploy
                    const snapshots = await TestObjects.instanceTwo.getProjectSnapshots()
                    snapshots.should.have.lengthOf(1)

                    const targetSnapshot = snapshots[0]

                    targetSnapshot.name.should.match(/device-snapshot-to-set-as-target - Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
                    targetSnapshot.description.should.match(/Snapshot created for pipeline deployment from stage-one-devices to stage-two as part of pipeline new-pipeline-devices/)
                    targetSnapshot.description.should.match(/a snapshot that will become the target/)

                    targetSnapshot.flows.should.have.property('flows')
                    targetSnapshot.flows.flows.should.match([{ custom: 'custom-flows' }])

                    targetSnapshot.flows.should.have.property('credentials')
                    targetSnapshot.flows.credentials.should.have.property('$')

                    targetSnapshot.settings.should.have.property('settings')
                    targetSnapshot.settings.modules.should.have.property('custom', 'custom-module')

                    // Verify the container driver was asked to restart the flows
                    app.log.info.calledWith(`[stub driver] Restarting flows ${TestObjects.instanceTwo.id}`).should.be.true()
                })
            })

            describe('For device=>device', function () {
                it('Should set the selected device snapshot as the target snapshot of the target', function () {
                    it('Should copy the existing selected device snapshot to the target instance', async function () {
                        await createDeviceSnapshot(TestObjects.deviceOne, {
                            name: 'old-snapshot',
                            description: 'a snapshot created first'
                        })

                        const snapshotToSetAsTarget = await createDeviceSnapshot(TestObjects.deviceOne, {
                            name: 'device-snapshot-to-set-as-target',
                            description: 'a snapshot that will become the target'
                        })

                        await createDeviceSnapshot(TestObjects.deviceOne, {
                            name: 'latest-snapshot',
                            description: 'a snapshot crated last'
                        })

                        // 1 device -> 2 device
                        TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceId: TestObjects.deviceTwo.id, source: TestObjects.pipelineDevicesStageOne.hashid, action: 'use_active_snapshot' }, TestObjects.pipelineDevices)

                        const response = await app.inject({
                            method: 'PUT',
                            url: `/api/v1/pipelines/${TestObjects.pipelineDevices.hashid}/stages/${TestObjects.pipelineDevicesStageOne.hashid}/deploy`,
                            cookies: { sid: TestObjects.tokens.alice },
                            payload: {
                                sourceSnapshotId: snapshotToSetAsTarget.hashid
                            }
                        })

                        const body = await response.json()
                        body.should.have.property('status', 'importing')

                        // No new snapshot should have been created in stage 1
                        const sourceDeviceSnapshots = await TestObjects.deviceOne.getProjectSnapshots()
                        sourceDeviceSnapshots.should.have.lengthOf(3)

                        // No snapshot created on the target device
                        const snapshots = await TestObjects.deviceTwo.getProjectSnapshots()
                        snapshots.should.have.lengthOf(0)

                        // Wait for the deploy to complete & check the target snapshot has been set
                        const targetSnapshotHashid = await waitForDeviceDeployGetTargetSnapshot(TestObjects.deviceTwo)
                        snapshotToSetAsTarget.hashid.should.equal(targetSnapshotHashid)
                    })
                })
            })

            describe('For instance=>device', function () {
                it('Should copy the existing selected instance snapshot to the target instance', async function () {
                    // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceId: TestObjects.deviceTwo.id, source: TestObjects.stageOne.hashid, action: 'use_active_snapshot' }, TestObjects.pipeline)

                    const existingSnapshot = await createSnapshot(app, TestObjects.instanceOne, TestObjects.user, {
                        name: 'Existing Snapshot Created In Test',
                        description: 'This was the second snapshot created as part of the test process',
                        setAsTarget: false // no need to deploy to devices of the source
                    })

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice },
                        payload: {
                            sourceSnapshotId: existingSnapshot.hashid
                        }
                    })

                    const body = await response.json()
                    body.should.have.property('status', 'importing')

                    // No new snapshot should have been created in stage 1
                    const sourceInstanceSnapshots = await TestObjects.instanceOne.getProjectSnapshots()
                    sourceInstanceSnapshots.should.have.lengthOf(1)

                    // No snapshot created on the target device
                    const snapshots = await TestObjects.deviceTwo.getProjectSnapshots()
                    snapshots.should.have.lengthOf(0)

                    // Wait for the deploy to complete & check the target snapshot has been set
                    const targetSnapshotHashid = await waitForDeviceDeployGetTargetSnapshot(TestObjects.deviceTwo)
                    existingSnapshot.hashid.should.equal(targetSnapshotHashid)
                })
            })
        })

        describe('With action=use_latest_snapshot', function () {
            beforeEach(async function () {
                await TestObjects.stageOne.update({ action: 'use_latest_snapshot' })
                await TestObjects.pipelineDevicesStageOne.update({ action: 'use_latest_snapshot' })
            })

            afterEach(async function () {
                await app.db.models.ProjectSnapshot.destroy({
                    where: {
                        [Op.or]: [
                            { ProjectId: TestObjects.instanceOne.id },
                            { DeviceId: TestObjects.deviceOne.id }
                        ]
                    }
                })
            })

            describe('For instance=>instance', function () {
                it('Copies the existing instance snapshot to the next stages instance', async function () {
                    // Setup an initial configuration
                    const setupResult = await addFlowsToProject(app,
                        TestObjects.instanceOne.id,
                        TestObjects.tokens.instanceOne,
                        TestObjects.tokens.alice,
                        [{ id: 'node1' }], // flows
                        { testCreds: 'abc' }, // credentials
                        'key1', // key
                        // settings
                        {
                            httpAdminRoot: '/test-red',
                            dashboardUI: '/test-dash',
                            palette: {
                                modules: [
                                    { name: 'module1', version: '1.0.0' }
                                ]
                            },
                            env: [
                                { name: 'one', value: 'a' },
                                { name: 'two', value: 'b' }
                            ]
                        }
                    )

                    // Ensure setup was successful
                    setupResult.flowsAddResponse.statusCode.should.equal(200)
                    setupResult.credentialsCreateResponse.statusCode.should.equal(200)
                    setupResult.storageSettingsResponse.statusCode.should.equal(200)
                    setupResult.updateProjectSettingsResponse.statusCode.should.equal(200)

                    await TestObjects.stageOne.update({ action: 'use_latest_snapshot' })

                    // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)

                    await createSnapshot(app, TestObjects.instanceOne, TestObjects.user, {
                        name: 'Oldest Snapshot Created In Test',
                        description: 'This was the first snapshot created as part of the test process',
                        setAsTarget: false // no need to deploy to devices of the source
                    })

                    // This one has custom props to validate against
                    await createSnapshot(app, TestObjects.instanceOne, TestObjects.user, {
                        name: 'Latest Snapshot Created In Test',
                        description: 'This was the second snapshot created as part of the test process',
                        setAsTarget: false, // no need to deploy to devices of the source
                        flows: { custom: 'custom-flows' },
                        credentials: { custom: 'custom-creds' },
                        settings: {
                            modules: { custom: 'custom-module' },
                            env: { custom: 'custom-env' }
                        }
                    })

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()
                    body.should.have.property('status', 'importing')

                    // Wait for the deploy to complete
                    await waitForDeployToComplete(TestObjects.instanceTwo)

                    // No new snapshot should have been created in stage 1
                    const sourceInstanceSnapshots = await TestObjects.instanceOne.getProjectSnapshots()
                    sourceInstanceSnapshots.should.have.lengthOf(2)

                    // Snapshot created in stage 2, flows created, and set as target

                    // Get the snapshot for instance 2 post deploy
                    const snapshots = await TestObjects.instanceTwo.getProjectSnapshots()
                    snapshots.should.have.lengthOf(1)

                    const targetSnapshot = snapshots[0]

                    targetSnapshot.name.should.match(/Latest Snapshot Created In Test - Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
                    targetSnapshot.description.should.match(/Snapshot created for pipeline deployment from stage-one to stage-two as part of pipeline new-pipeline/)
                    targetSnapshot.description.should.match(/This was the second snapshot created as part of the test process/)

                    targetSnapshot.flows.should.have.property('flows')
                    targetSnapshot.flows.flows.should.match({ custom: 'custom-flows' })

                    targetSnapshot.flows.should.have.property('credentials')
                    targetSnapshot.flows.credentials.should.have.property('$')

                    targetSnapshot.settings.should.have.property('settings')
                    targetSnapshot.settings.modules.should.have.property('custom', 'custom-module')
                    targetSnapshot.settings.env.should.have.property('custom', 'custom-env')

                    // Verify the container driver was asked to restart the flows
                    app.log.info.calledWith(`[stub driver] Restarting flows ${TestObjects.instanceTwo.id}`).should.be.true()
                })
            })

            describe('For device=>instance', function () {
                it('Copies the existing device snapshot to the next stages instance', async function () {
                    await createDeviceSnapshot(TestObjects.deviceOne, {
                        name: 'old-snapshot',
                        description: 'a snapshot created first'
                    })

                    await createDeviceSnapshot(TestObjects.deviceOne, {
                        name: 'medium-snapshot',
                        description: 'a snapshot created in the middle'
                    })

                    await createDeviceSnapshot(TestObjects.deviceOne, {
                        name: 'latest-snapshot',
                        description: 'a snapshot created last'
                    })

                    // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.pipelineDevicesStageOne.hashid }, TestObjects.pipelineDevices)

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipelineDevices.hashid}/stages/${TestObjects.pipelineDevicesStageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()
                    body.should.have.property('status', 'importing')

                    // Wait for the deploy to complete
                    await waitForDeployToComplete(TestObjects.instanceTwo)

                    // No new snapshot should have been created in stage 1
                    const sourceDeviceSnapshots = await TestObjects.deviceOne.getProjectSnapshots()
                    sourceDeviceSnapshots.should.have.lengthOf(3)

                    // Get the snapshot for instance 2 post deploy
                    const snapshots = await TestObjects.instanceTwo.getProjectSnapshots()
                    snapshots.should.have.lengthOf(1)

                    const targetSnapshot = snapshots[0]

                    targetSnapshot.name.should.match(/latest-snapshot - Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
                    targetSnapshot.description.should.match(/Snapshot created for pipeline deployment from stage-one-devices to stage-two as part of pipeline new-pipeline-devices/)
                    targetSnapshot.description.should.match(/a snapshot created last/)

                    targetSnapshot.flows.should.have.property('flows')
                    targetSnapshot.flows.flows.should.match([{ custom: 'custom-flows' }])

                    targetSnapshot.flows.should.have.property('credentials')
                    targetSnapshot.flows.credentials.should.have.property('$')

                    targetSnapshot.settings.should.have.property('settings')
                    targetSnapshot.settings.modules.should.have.property('custom', 'custom-module')

                    // Verify the container driver was asked to restart the flows
                    app.log.info.calledWith(`[stub driver] Restarting flows ${TestObjects.instanceTwo.id}`).should.be.true()
                })
            })

            describe('For device=>device', function () {
                it('Copies the existing device snapshot to the next stages device', async function () {
                    await createDeviceSnapshot(TestObjects.deviceOne, {
                        name: 'old-snapshot',
                        description: 'a snapshot created first'
                    })

                    const latestSnapshot = await createDeviceSnapshot(TestObjects.deviceOne, {
                        name: 'latest-snapshot',
                        description: 'a snapshot crated last'
                    })

                    // 1 device -> 2 device
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceId: TestObjects.deviceTwo.id, source: TestObjects.pipelineDevicesStageOne.hashid, action: 'use_active_snapshot' }, TestObjects.pipelineDevices)

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipelineDevices.hashid}/stages/${TestObjects.pipelineDevicesStageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()
                    body.should.have.property('status', 'importing')

                    // No new snapshot should have been created in stage 1
                    const sourceDeviceSnapshots = await TestObjects.deviceOne.getProjectSnapshots()
                    sourceDeviceSnapshots.should.have.lengthOf(2)

                    // No snapshot created on the target device
                    const snapshots = await TestObjects.deviceTwo.getProjectSnapshots()
                    snapshots.should.have.lengthOf(0)

                    // Wait for the deploy to complete & check the target snapshot has been set
                    const targetSnapshotHashid = await waitForDeviceDeployGetTargetSnapshot(TestObjects.deviceTwo)
                    latestSnapshot.hashid.should.equal(targetSnapshotHashid)
                })
            })

            describe('For instance=>device group', function () {
                it('Copies the existing instance snapshot to the next stages device group', async function () {
                    // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceGroupId: TestObjects.deviceGroupTwo.id, source: TestObjects.stageOne.hashid, action: 'use_active_snapshot' }, TestObjects.pipeline)

                    // add device to TestObjects.deviceGroupTwo
                    // this way we can test that the group and a device within it are all updated
                    await TestObjects.deviceGroupTwo.addDevice(TestObjects.deviceTwo)

                    const snapshot = await createSnapshot(app, TestObjects.instanceOne, TestObjects.user, {
                        name: 'Existing Snapshot Created In Test',
                        description: 'This was the second snapshot created as part of the test process',
                        setAsTarget: false // no need to deploy to devices of the source
                    })

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()
                    body.should.have.property('status', 'importing')

                    // call the GET pipelines and check the status of the device group is deploying
                    const responseGetPipelines = await app.inject({
                        method: 'GET',
                        url: `/api/v1/applications/${TestObjects.application.hashid}/pipelines`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const bodyGetPipelines = await responseGetPipelines.json()
                    const thisPipeline = bodyGetPipelines.pipelines.find(p => p.id === TestObjects.pipeline.hashid)
                    const deviceGroups = thisPipeline.stages[1].deviceGroups
                    deviceGroups.should.be.an.Array().and.have.lengthOf(1)
                    deviceGroups[0].should.have.property('isDeploying', true)
                    deviceGroups[0].should.have.property('hasTargetSnapshot', true)
                    deviceGroups[0].should.have.property('targetMatchCount', 1)
                    const deviceData = await app.db.models.Device.getAll({}, { id: TestObjects.deviceTwo.id })
                    const device = deviceData.devices[0]
                    const deviceGroupData = await app.db.models.DeviceGroup.getAll({}, { id: TestObjects.deviceGroupTwo.id })
                    const deviceGroup = deviceGroupData.groups[0]
                    device.should.have.property('targetSnapshotId', snapshot.id)
                    deviceGroup.should.have.property('targetSnapshotId', snapshot.id)
                })
            })

            describe('For instance=>device', function () {
                it('Copies the existing instance snapshot to the next stages device', async function () {
                    // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceId: TestObjects.deviceTwo.id, source: TestObjects.stageOne.hashid, action: 'use_active_snapshot' }, TestObjects.pipeline)

                    const existingSnapshot = await createSnapshot(app, TestObjects.instanceOne, TestObjects.user, {
                        name: 'Existing Snapshot Created In Test',
                        description: 'This was the second snapshot created as part of the test process',
                        setAsTarget: false // no need to deploy to devices of the source
                    })

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()
                    body.should.have.property('status', 'importing')

                    // No new snapshot should have been created in stage 1
                    const sourceInstanceSnapshots = await TestObjects.instanceOne.getProjectSnapshots()
                    sourceInstanceSnapshots.should.have.lengthOf(1)

                    // No snapshot created on the target device
                    const snapshots = await TestObjects.deviceTwo.getProjectSnapshots()
                    snapshots.should.have.lengthOf(0)

                    // Wait for the deploy to complete & check the target snapshot has been set
                    const targetSnapshotHashid = await waitForDeviceDeployGetTargetSnapshot(TestObjects.deviceTwo)
                    existingSnapshot.hashid.should.equal(targetSnapshotHashid)
                })
            })

            it('Fails gracefully if the source instance has no snapshots', async function () {
                // 1 -> 2
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'invalid_source_instance')
                response.statusCode.should.equal(400)
            })

            it('Fails gracefully if the source device has no snapshots', async function () {
                // 1 -> 2
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceId: TestObjects.deviceTwo.id, source: TestObjects.pipelineDevicesStageOne.hashid, action: 'use_active_snapshot' }, TestObjects.pipelineDevices)

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipelineDevices.hashid}/stages/${TestObjects.pipelineDevicesStageOne.hashid}/deploy`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'invalid_source_device')
                response.statusCode.should.equal(400)
            })
        })

        describe('With action=use_active_snapshot', function () {
            beforeEach(async function () {
                await TestObjects.pipelineDevicesStageOne.update({ action: 'use_active_snapshot' })
            })

            afterEach(async function () {
                await app.db.models.ProjectSnapshot.destroy({
                    where: {
                        [Op.or]: [
                            { ProjectId: TestObjects.instanceOne.id },
                            { DeviceId: TestObjects.deviceOne.id }
                        ]
                    }
                })
            })

            describe('For instance=>instance', function () {
                it('Fails validation', async function () {
                    await TestObjects.stageOne.update({ action: 'use_active_snapshot' }).should.be.rejectedWith(/Validation error/)
                })
            })

            describe('For device=>instance', function () {
                it('Copies the target device snapshot to the next stages instance', async function () {
                    const activeSnapshot = await createDeviceSnapshot(TestObjects.deviceOne, {
                        name: 'active-snapshot',
                        description: 'the active snapshot of the device'
                    })

                    await createDeviceSnapshot(TestObjects.deviceOne, {
                        name: 'latest-snapshot',
                        description: 'a snapshot created last'
                    })

                    await TestObjects.deviceOne.update({ targetSnapshotId: activeSnapshot.id, activeSnapshotId: activeSnapshot.id })

                    // 1 -> 2
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.pipelineDevicesStageOne.hashid }, TestObjects.pipelineDevices)

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipelineDevices.hashid}/stages/${TestObjects.pipelineDevicesStageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()
                    body.should.have.property('status', 'importing')

                    // Wait for the deploy to complete
                    await waitForDeployToComplete(TestObjects.instanceTwo)

                    // No new snapshot should have been created in stage 1
                    const sourceDeviceSnapshots = await TestObjects.deviceOne.getProjectSnapshots()
                    sourceDeviceSnapshots.should.have.lengthOf(2)

                    // Get the snapshot for instance 2 post deploy
                    const snapshots = await TestObjects.instanceTwo.getProjectSnapshots()
                    snapshots.should.have.lengthOf(1)

                    const targetSnapshot = snapshots[0]

                    targetSnapshot.name.should.match(/active-snapshot - Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
                    targetSnapshot.description.should.match(/Snapshot created for pipeline deployment from stage-one-devices to stage-two as part of pipeline new-pipeline-devices/)
                    targetSnapshot.description.should.match(/the active snapshot of the device/)

                    // Verify the container driver was asked to restart the flows
                    app.log.info.calledWith(`[stub driver] Restarting flows ${TestObjects.instanceTwo.id}`).should.be.true()
                })
            })

            describe('For device=>device', function () {
                it('Copies the existing device snapshot to the next stages device', async function () {
                    const activeSnapshot = await createDeviceSnapshot(TestObjects.deviceOne, {
                        name: 'active-snapshot',
                        description: 'the active snapshot of the device'
                    })

                    await createDeviceSnapshot(TestObjects.deviceOne, {
                        name: 'latest-snapshot',
                        description: 'a snapshot created last'
                    })

                    await TestObjects.deviceOne.update({ targetSnapshotId: activeSnapshot.id, activeSnapshotId: activeSnapshot.id })

                    // 1 device -> 2 device
                    TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', deviceId: TestObjects.deviceTwo.id, source: TestObjects.pipelineDevicesStageOne.hashid, action: 'use_active_snapshot' }, TestObjects.pipelineDevices)

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/pipelines/${TestObjects.pipelineDevices.hashid}/stages/${TestObjects.pipelineDevicesStageOne.hashid}/deploy`,
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    const body = await response.json()
                    body.should.have.property('status', 'importing')

                    // Wait for the deploy to complete
                    await waitForDeployToComplete(TestObjects.instanceTwo)

                    // No new snapshot should have been created in stage 1
                    const sourceDeviceSnapshots = await TestObjects.deviceOne.getProjectSnapshots()
                    sourceDeviceSnapshots.should.have.lengthOf(2)

                    // No snapshot created on the target device
                    const snapshots = await TestObjects.deviceTwo.getProjectSnapshots()
                    snapshots.should.have.lengthOf(0)

                    await TestObjects.deviceTwo.reload()
                    TestObjects.deviceTwo.targetSnapshotId.should.equal(activeSnapshot.id)
                })
            })

            describe('For instance=>device', function () {
                it('Fails validation', async function () {
                    await TestObjects.stageOne.update({ action: 'use_active_snapshot' }).should.be.rejectedWith(/Validation error/)
                })
            })

            it('Fails gracefully if the source device does not have an active snapshot', async function () {
                // 1 -> 2
                TestObjects.stageTwo = await TestObjects.factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.pipelineDevicesStageOne.hashid }, TestObjects.pipelineDevices)

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/pipelines/${TestObjects.pipelineDevices.hashid}/stages/${TestObjects.pipelineDevicesStageOne.hashid}/deploy`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const body = await response.json()

                body.should.have.property('code', 'invalid_source_device')
                body.error.should.match(/No active snapshot found/)

                response.statusCode.should.equal(400)
            })
        })
    })

    describe('Work with Protected Instances', function () {
        async function isDeployComplete (instance) {
            const instanceStatusResponse = (await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${instance.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })).json()

            return instanceStatusResponse?.meta?.isDeploying === false
        }

        function waitForDeployToComplete (instance) {
            return new Promise((resolve, reject) => {
                const refreshIntervalId = setInterval(async () => {
                    if (await isDeployComplete(instance)) {
                        clearInterval(refreshIntervalId)
                        resolve()
                    }
                }, 250)
            })
        }

        beforeEach(async function () {
            const factory = app.factory

            await TestObjects.instanceTwo.updateProtectedInstanceState({ enabled: true })
            TestObjects.stageTwo = await factory.createPipelineStage({ name: 'stage-two', instanceId: TestObjects.instanceTwo.id, source: TestObjects.stageOne.hashid }, TestObjects.pipeline)
        })

        after(async function () {
            await TestObjects.instanceTwo.updateProtectedInstanceState({ enabled: false })
        })

        it('should allow Owner to deploy to Protected Instance', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)

            await waitForDeployToComplete(TestObjects.instanceTwo)
        })

        it('should not allow Member to deploy to Protected Instance', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/pipelines/${TestObjects.pipeline.hashid}/stages/${TestObjects.stageOne.hashid}/deploy`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })
    })

    describe('List Application Pipelines', function () {
        it('should list all the pipelines within an application including stages, instances, devices and device groups', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${TestObjects.application.hashid}/pipelines`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const body = await response.json()

            body.should.have.property('count', 3)
            body.pipelines.should.have.length(3)

            body.pipelines[0].should.have.property('name', 'new-pipeline')
            body.pipelines[0].should.have.property('stages')

            body.pipelines[0].stages.should.have.length(1)
            body.pipelines[0].stages[0].should.have.property('name', 'stage-one')

            body.pipelines[0].stages[0].instances.should.have.length(1)
            body.pipelines[0].stages[0].instances[0].should.have.property('name', 'project1')

            body.pipelines[1].should.have.property('name', 'new-pipeline-devices')

            body.pipelines[1].stages.should.have.length(1)
            body.pipelines[1].stages[0].should.have.property('name', 'stage-one-devices')

            body.pipelines[1].stages[0].devices.should.have.length(1)
            body.pipelines[1].stages[0].devices[0].should.have.property('name', 'device-a')

            body.pipelines[2].should.have.property('name', 'new-pipeline-device-groups')

            body.pipelines[2].stages.should.have.length(2)
            body.pipelines[2].stages[0].should.have.property('name', 'stage-one-instance') // first stage is an instance
            body.pipelines[2].stages[1].should.have.property('name', 'stage-two-device-group') // second stage is a device group

            body.pipelines[2].stages[0].instances.should.have.length(1)
            body.pipelines[2].stages[0].instances[0].should.have.property('name', 'project1')

            body.pipelines[2].stages[1].deviceGroups.should.have.length(1)
            body.pipelines[2].stages[1].deviceGroups[0].should.have.property('name', 'device-group-a')

            response.statusCode.should.equal(200)
        })
    })
})
