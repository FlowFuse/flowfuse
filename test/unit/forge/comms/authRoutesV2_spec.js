const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const { Roles } = require('../../../../forge/lib/roles')
const setup = require('../routes/setup')
const TestModelFactory = require('../../../lib/TestModelFactory') // eslint-disable-line

describe('Broker Auth v2 API', async function () {
    let app
    /** @type {TestModelFactory} */
    let factory = null
    const TestObjects = {
        tokens: {},
        ApplicationA: null,
        ProjectA: null,
        ProjectACredentials: null,
        DeviceA: null,
        ATeam: null,
        alice: null
    }

    async function setupCE () {
        app = await setup()
        await setupTestObjects()
    }
    async function setupEE () {
        app = await setup({
            license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg'
        })
        await setupTestObjects()
    }
    async function sendACLPost (opts) {
        opts.clientid = opts.username
        return await app.inject({
            method: 'POST',
            url: '/api/comms/v2/acls',
            body: opts
        })
    }
    async function allowWrite (opts) {
        opts.action = 'publish'
        const response = await sendACLPost(opts)
        response.statusCode.should.equal(200)
        const body = response.json()
        body.should.have.property('result', 'allow')
    }
    async function allowRead (opts) {
        // Due to the way mosquitto auth checks work, we need to check
        // both READ and SUBSCRIBE access
        opts.action = 'subscribe'
        const response = await sendACLPost(opts)
        response.statusCode.should.equal(200)
        const body = response.json()
        body.should.have.property('result', 'allow')
    }
    async function denyWrite (opts) {
        opts.action = 'publish'
        const response = await sendACLPost(opts)
        response.statusCode.should.equal(200)
        const body = response.json()
        body.should.have.property('result', 'deny')
    }
    async function denyRead (opts) {
        // Due to the way mosquitto auth checks work, we need to check
        // both READ and SUBSCRIBE access
        opts.action = 'subscribe'
        const response = await sendACLPost(opts)
        response.statusCode.should.equal(200)
        const body = response.json()
        body.should.have.property('result', 'deny')
    }
    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        const temp = { ...response.cookies[0] }
        temp.should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    async function setupTestObjects ({ createDeviceOptions = null } = {}) {
        // alice : admin
        // ATeam ( alice  (owner) )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        // Alice set as ATeam owner in setup()

        TestObjects.ProjectA = app.project
        TestObjects.ProjectACredentials = await TestObjects.ProjectA.refreshAuthTokens()

        TestObjects.ApplicationA = app.application

        factory = app.factory

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
    }

    describe('Auth Client', async function () {
        // POST /api/comms/auth/client
        before(async function () {
            await setupCE()
        })

        after(async function () {
            await app.close()
        })

        it('rejects if request missing required values', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/auth/client',
                body: { }
            })
            response.statusCode.should.equal(400)
        })

        it('accepts valid credentials', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/auth/client',
                body: {
                    clientid: TestObjects.ProjectACredentials.broker.username,
                    username: TestObjects.ProjectACredentials.broker.username,
                    password: TestObjects.ProjectACredentials.broker.password
                }
            })
            response.statusCode.should.equal(200)
        })

        it('rejects invalid password', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/comms/auth/client',
                body: {
                    clientid: TestObjects.ProjectACredentials.broker.username,
                    username: TestObjects.ProjectACredentials.broker.username,
                    password: 'wrong-password'
                }
            })
            response.statusCode.should.equal(401)
        })
    })

    describe('Auth ACL', async function () {
        describe('Platform Client', async function () {
            before(async function () {
                await setupCE()
            })

            after(async function () {
                await app.close()
            })
            it('allows platform to subscribe to launcher status topic', async function () {
                await allowRead({
                    username: 'forge_platform',
                    topic: 'ff/v1/+/l/+/status'
                })
            })
            it('allows platform to subscribe to device status topic', async function () {
                await allowRead({
                    username: 'forge_platform',
                    topic: 'ff/v1/+/d/+/status'
                })
            })
            it('allows platform to publish to project-device command topic', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: 'ff/v1/abc/p/xyz/command'
                })
            })
            it('allows platform to publish to launcher command topic', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: 'ff/v1/abc/l/xyz/command'
                })
            })
            it('allows platform to publish to device command topic', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: 'ff/v1/abc/d/ghi/command'
                })
            })
            it('allows plaform to publish to platform settings sync topic', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: 'ff/v1/platform/sync'
                })
            })
            it('allows plaform to subscribe to platform settings sync topic', async function () {
                await allowRead({
                    username: 'forge_platform',
                    topic: 'ff/v1/platform/sync'
                })
            })
        })

        describe('Project', async function () {
            describe('CE', async function () {
                before(async function () {
                    await setupCE()
                })

                after(async function () {
                    await app.close()
                })

                // Status Topic
                it('allows launcher to publish to own status topic', async function () {
                    await allowWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/l/xyz/status'
                    })
                })
                it('prevents launcher from publishing to other status topic', async function () {
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/l/other-project/status'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/other-team/l/xyz/status'
                    })
                })
                it('prevents launcher from subscribing to status topic', async function () {
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/l/xyz/status'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/l/other-project/status'
                    })
                })

                // Command topic
                it('allows launcher to subscribe to own command topic', async function () {
                    allowRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/l/xyz/command'
                    })
                })
                it('prevents project from subscribing to other command topic', async function () {
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/l/other-project/command'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/other-team/l/xyz/command'
                    })
                })
                it('prevents launcher from publishing to command topic', async function () {
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/l/xyz/command'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/l/other-project/command'
                    })
                })
                it('project cannot publish to own broadcast topic', async function () {
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/out'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/out/'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/out/foo'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/out/foo/'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/out/foo/bar'
                    })
                })
                it('project cannot subscribe to another projects broadcast', async function () {
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out/'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out/foo'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out/foo/'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out/foo/bar'
                    })
                })
                it('project cannot subscribe to own inbox', async function () {
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/in'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/in/'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/in/foo'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/in/foo/bar'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/in/#'
                    })
                })
                it('project cannot publish to another projects inbox', async function () {
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in/'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in/foo'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in/foo/'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in/foo/bar'
                    })
                })
                it('project cannot subscribe to own response topic', async function () {
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/res'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/res/'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/res/foo'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/res/foo/bar'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/res/#'
                    })
                })
                it('project cannot publish to another projects response topic', async function () {
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/res'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/res/'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/res/foo'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/res/foo/'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/res/foo/bar'
                    })
                })
            })

            describe('EE', async function () {
                before(async function () {
                    await setupEE()
                })

                after(async function () {
                    await app.close()
                })
                it('prevents project using incorrect shared subscription group', async function () {
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: '$share/wrong-project/ff/v1/abc/p/another-project/out/foo/bar'
                    })
                })
                // Inter-project comms
                it('allows project to publish to own broadcast topic', async function () {
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/out'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/out/'
                    })
                    await allowWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/out/foo'
                    })
                    await allowWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/out/foo/'
                    })
                    await allowWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/out/foo/bar'
                    })
                })
                it('allows project to subscribe to another projects broadcast', async function () {
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out/'
                    })
                    await allowRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out/foo'
                    })
                    await allowRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out/foo/'
                    })
                    await allowRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out/foo/bar'
                    })
                    await allowRead({
                        username: 'project:abc:xyz',
                        topic: '$share/xyz/ff/v1/abc/p/another-project/out/foo/bar'
                    })
                })
                it('prevents project from publishing to other broadcast topic', async function () {
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out/'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out/foo'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out/foo/'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/out/foo/bar'
                    })
                })
                it('allows project to subscribe to own inbox', async function () {
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/in'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/in/'
                    })
                    await allowRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/in/foo'
                    })
                    await allowRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/in/foo/bar'
                    })
                    await allowRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/in/#'
                    })
                    await allowRead({
                        username: 'project:abc:xyz',
                        topic: '$share/xyz/ff/v1/abc/p/xyz/in/foo/bar'
                    })
                })
                it('prevents project from subscribing to another projects inbox', async function () {
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in/'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in/foo'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in/foo/bar'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in/#'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: '$share/xyz/ff/v1/abc/p/another-project/in/#'
                    })
                })
                it('allows project to publish to another projects inbox', async function () {
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in/'
                    })
                    await allowWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in/foo'
                    })
                    await allowWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in/foo/'
                    })
                    await allowWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/in/foo/bar'
                    })
                })
                it('allows project to subscribe to own response topic', async function () {
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/res'
                    })
                    await denyRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/res/'
                    })
                    await allowRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/res/foo'
                    })
                    await allowRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/res/foo/bar'
                    })
                    await allowRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/res/#'
                    })
                    await allowRead({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/xyz/res-random/#'
                    })
                })
                it('allows project to publish to another projects response topic', async function () {
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/res'
                    })
                    await denyWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/res/'
                    })
                    await allowWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/res/foo'
                    })
                    await allowWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/res/foo/'
                    })
                    await allowWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/res/foo/bar'
                    })
                    await allowWrite({
                        username: 'project:abc:xyz',
                        topic: 'ff/v1/abc/p/another-project/res-random/foo/bar'
                    })
                })
                describe('Team Broker Topic Update Cache', async function () {
                    async function sleep (seconds) {
                        return new Promise((resolve) => {
                            setTimeout(resolve, (1000 * 3))
                        })
                    }
                    it('should not update if multiple calls to the same topic', async function () {
                        const topic = 'update/topic/timestamp'
                        await app.teamBroker.addUsedTopic(topic, TestObjects.ATeam.hashid)
                        const firstTopic = await app.db.models.MQTTTopicSchema.findAll({
                            where: {
                                topic,
                                TeamId: TestObjects.ATeam.id
                            }
                        })
                        await app.teamBroker.addUsedTopic(topic, TestObjects.ATeam.hashid)
                        const secondTopic = await app.db.models.MQTTTopicSchema.findAll({
                            where: {
                                topic,
                                TeamId: TestObjects.ATeam.id
                            }
                        })
                        secondTopic[0].updatedAt.toISOString().should.equal(firstTopic[0].updatedAt.toISOString())
                    })
                    it('should delete from cache', async function () {
                        const topic = 'update/topic/timestamp/2'
                        await app.teamBroker.addUsedTopic(topic, TestObjects.ATeam.hashid)
                        const firstTopic = await app.db.models.MQTTTopicSchema.findAll({
                            where: {
                                topic,
                                TeamId: TestObjects.ATeam.id
                            }
                        })
                        app.teamBroker.removeTopicFromCache(firstTopic[0], TestObjects.ATeam.hashid)
                        await sleep(3)
                        await app.teamBroker.addUsedTopic(topic, TestObjects.ATeam.hashid)
                        const secondTopic = await app.db.models.MQTTTopicSchema.findAll({
                            where: {
                                topic,
                                TeamId: TestObjects.ATeam.id
                            }
                        })
                        secondTopic[0].updatedAt.toISOString().should.not.equal(firstTopic[0].updatedAt.toISOString())
                    })
                })
            })
        })

        describe('Device', async function () {
            let deviceUsername
            let deviceCommandTopic
            let deviceStatusTopic
            let deviceLogTopic
            let frontendUsername
            let frontendTopic
            async function setupDeviceTestObjects () {
                TestObjects.DeviceA = await factory.createDevice({ name: 'my device', type: 'test device' }, TestObjects.ATeam, null, null)
                deviceUsername = `device:${TestObjects.ATeam.hashid}:${TestObjects.DeviceA.hashid}`
                deviceCommandTopic = `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.DeviceA.hashid}/command`
                deviceStatusTopic = `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.DeviceA.hashid}/status`
                deviceLogTopic = `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.DeviceA.hashid}/logs`

                TestObjects.DeviceB = await factory.createDevice({ name: 'my device b', type: 'test device' }, TestObjects.ATeam, null, null)
                const applicaiton = await factory.createApplication({
                    name: 'A-team Application',
                    description: 'A-team Application description'
                }, TestObjects.ATeam)
                await TestObjects.DeviceB.setApplication(applicaiton)

                frontendUsername = `frontend:${TestObjects.ATeam.hashid}:${TestObjects.DeviceB.hashid}`
                frontendTopic = `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.DeviceB.hashid}/logs`

                // Create a second project in the team
                TestObjects.ProjectB = await app.db.models.Project.create({ name: 'project2', type: '', url: '' })
                await TestObjects.ATeam.addProject(TestObjects.ProjectB)
            }
            describe('CE', async function () {
                before(async function () {
                    await setupCE()
                    await setupDeviceTestObjects()
                })
                after(async function () {
                    await app.close()
                })

                // Status Topic
                it('allows device to publish to own status topic', async function () {
                    await allowWrite({
                        username: deviceUsername,
                        topic: deviceStatusTopic
                    })
                })
                it('prevents device from publishing to other status topic', async function () {
                    await denyWrite({
                        username: deviceUsername,
                        topic: 'ff/v1/abc/d/other-device/status'
                    })
                    await denyWrite({
                        username: deviceUsername,
                        topic: 'ff/v1/other-team/d/xyz/status'
                    })
                })
                it('prevents device from subscribing to status topic', async function () {
                    await denyRead({
                        username: deviceUsername,
                        topic: deviceStatusTopic
                    })
                    await denyRead({
                        username: deviceUsername,
                        topic: 'ff/v1/abc/d/other-device/status'
                    })
                })

                // Command topic
                it('allows device to subscribe to own command topic', async function () {
                    allowRead({
                        username: deviceUsername,
                        topic: deviceCommandTopic
                    })
                })
                it('prevents device from subscribing to other command topic', async function () {
                    await denyRead({
                        username: deviceUsername,
                        topic: 'ff/v1/abc/d/other-device/command'
                    })
                    await denyRead({
                        username: deviceUsername,
                        topic: 'ff/v1/other-team/d/ghi/command'
                    })
                })
                it('prevents device from publishing to command topic', async function () {
                    await denyWrite({
                        username: deviceUsername,
                        topic: deviceCommandTopic
                    })
                    await denyWrite({
                        username: deviceUsername,
                        topic: 'ff/v1/abc/d/other-device/command'
                    })
                })
            })
            describe('EE', async function () {
                before(async function () {
                    await setupEE()
                    await setupDeviceTestObjects()
                })
                after(async function () {
                    await app.close()
                })
                describe('unassigned', async function () {
                    it('cannot subscribe to project command if unassigned', async function () {
                        await denyRead({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectA.id}/command`
                        })
                    })
                    it('cannot subscribe to project inbox if unassigned', async function () {
                        await denyRead({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectA.id}/in/foo`
                        })
                    })
                    it('cannot subscribe to project broadcast if unassigned', async function () {
                        await denyRead({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectB.id}/out/foo`
                        })
                    })
                    it('cannot subscribe to application broadcast if unassigned', async function () {
                        await denyRead({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/a/${TestObjects.ApplicationA.id}/out/foo`
                        })
                    })
                    it('cannot subscribe to all broadcast if unassigned', async function () {
                        await denyRead({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/+/out/foo`
                        })
                    })
                    it('cannot publish to project inbox if unassigned', async function () {
                        await denyWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectB.id}/in/foo`
                        })
                    })
                    it('cannot publish to project output if unassigned', async function () {
                        await denyWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectA.id}/out/foo`
                        })
                    })
                    it('cannot publish to project response if unassigned', async function () {
                        await denyWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectB.id}/res/foo`
                        })
                    })
                })
                describe('assigned to instance', async function () {
                    before(async function () {
                        await app.inject({
                            method: 'PUT',
                            url: `/api/v1/devices/${TestObjects.DeviceA.hashid}`,
                            body: {
                                instance: TestObjects.ProjectA.id
                            },
                            cookies: { sid: TestObjects.tokens.alice }
                        })
                    })
                    it('can subscribe to project command if assigned', async function () {
                        await allowRead({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectA.id}/command`
                        })
                    })
                    it('can subscribe to project inbox if assigned', async function () {
                        await allowRead({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectA.id}/in/foo`
                        })
                    })
                    it('can subscribe to project broadcast if assigned', async function () {
                        await allowRead({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectB.id}/out/foo`
                        })
                    })
                    it('can subscribe to all broadcast if assigned', async function () {
                        await allowRead({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/+/out/foo`
                        })
                    })
                    it('can publish to project inbox if assigned', async function () {
                        await allowWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectB.id}/in/foo`
                        })
                    })
                    it('can publish to project output if assigned', async function () {
                        await allowWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectA.id}/out/foo`
                        })
                    })
                    it('can publish to project response if assigned', async function () {
                        await allowWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectB.id}/res/foo`
                        })
                    })
                })
                describe('assigned to application', async function () {
                    before(async function () {
                        // Assign device to application
                        await app.inject({
                            method: 'PUT',
                            url: `/api/v1/devices/${TestObjects.DeviceA.hashid}`,
                            body: {
                                application: TestObjects.ApplicationA.hashid
                            },
                            cookies: { sid: TestObjects.tokens.alice }
                        })
                    })
                    it('can subscribe to application command', async function () {
                        await allowRead({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/a/${TestObjects.ApplicationA.hashid}/command`
                        })
                    })
                    it('can subscribe to project inbox', async function () {
                        await allowRead({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectA.id}/in/foo`
                        })
                    })
                    it('can subscribe to project broadcast', async function () {
                        await allowRead({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectB.id}/out/foo`
                        })
                    })
                    it('can subscribe to all broadcast', async function () {
                        await allowRead({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/+/out/foo`
                        })
                    })
                    it('can publish to project inbox', async function () {
                        await allowWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectB.id}/in/foo`
                        })
                    })
                    it('can not publish broadcast without `dev:` topic prefix', async function () {
                        await denyWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.DeviceA.hashid}/out/foo`
                        })
                    })
                    it('can not publish broadcast with missing device id `dev:`', async function () {
                        await denyWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/dev:/out/foo`
                        })
                    })
                    it('can not publish broadcast with bad device id `dev:invalid dev id `', async function () {
                        await denyWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/dev:invalid dev id/out/foo`
                        })
                    })
                    it('can publish broadcast with `dev:` topic prefix', async function () {
                        await allowWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/dev:${TestObjects.DeviceA.hashid}/out/foo`
                        })
                    })
                    it('can publish to project response', async function () {
                        await allowWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectB.id}/res/foo`
                        })
                    })
                })
                describe('device log topics', async function () {
                    it('can publish its logs', async function () {
                        await allowWrite({
                            username: deviceUsername,
                            topic: deviceLogTopic
                        })
                    })
                    it('frontend can subscribe to device logs', async function () {
                        await allowRead({
                            username: frontendUsername,
                            topic: frontendTopic
                        })
                    })
                    it('frontend can publish heartbeat', async function () {
                        await allowWrite({
                            username: frontendUsername,
                            topic: `${frontendTopic}/heartbeat`
                        })
                    })
                })
            })
        })

        describe('Expert Acls', async function () {
            before(async function () {
                await setupEE()
                app.config.features.register('ai', true, true)
                app.config.features.register('expertAssistant', true, true)
                TestObjects.DeviceA = await factory.createDevice({ name: 'my expert device', type: 'test device' }, TestObjects.ATeam, null, null)
                TestObjects.bob = await factory.createUser({ admin: false, username: 'bob', name: 'Bob Solo', email: 'bob@example.com', password: 'bbPassword' })
                await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
                await login('bob', 'bbPassword')
            })

            after(async function () {
                await app.close()
            })

            describe('Expert Client', async function () {
                // basic tests - cannot sub or pub to any topics outside of 'ff/v1/expert/#' e.g. cannot sub or pub to project/device topics
                it('denies subscription to project topics', async function () {
                    await denyRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectA.id}/res/#`
                    })
                })
                it('denies publish to project topics', async function () {
                    await denyWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectA.id}/in/foo`
                    })
                })
                it('denies subscription to device topics', async function () {
                    await denyRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.DeviceA.id}/res/#`
                    })
                })
                it('denies publish to device topics', async function () {
                    await denyWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.DeviceA.id}/in/foo`
                    })
                })
                it('denies publish/subscribe to platform topics', async function () {
                    await denyRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: 'ff/v1/platform/sync'
                    })
                    await denyWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: 'ff/v1/platform/sync'
                    })
                })

                // should be able to sub to ../support/chat/response and ../support/inflight/command/request topics
                // should not be able to pub to ../support/chat/response or ../support/inflight/command/request topics (they are done by the expert-agent, not the expert-client)
                it('allows subscription to chat response topics (instance)', async function () {
                    await allowRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/${TestObjects.ProjectA.id}/support/chat/response`
                    })
                })
                it('allows subscription to chat response topics (device)', async function () {
                    await allowRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/d/${TestObjects.DeviceA.hashid}/support/chat/response`
                    })
                })
                it('denies publish to chat response topics (instance)', async function () {
                    await denyWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/${TestObjects.ProjectA.id}/support/chat/response`
                    })
                })
                it('denies publish to chat response topics (device)', async function () {
                    await denyWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/d/${TestObjects.DeviceA.hashid}/support/chat/response`
                    })
                })
                // should not allow client 1 to sub to or pub to another client's topics
                it('denies subscription to another client\'s chat response topics', async function () {
                    await denyRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.bob.hashid}/session123/p/${TestObjects.ProjectA.id}/support/chat/response`
                    })
                })
                it('denies publish to another client\'s chat response topics', async function () {
                    await denyWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.bob.hashid}/session123/p/${TestObjects.ProjectA.id}/support/chat/response`
                    })
                })
                // check bad topics are denied to subscribe to and publish to
                it('denies subscription with mismatching session id', async function () {
                    await denyRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/BAD-SESSION/p/${TestObjects.ProjectA.id}/support/chat/response`
                    })
                })
                it('denies subscription with invalid entity type', async function () {
                    await denyRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/X/${TestObjects.ProjectA.id}/support/chat/response`
                    })
                })
                it('denies subscription with invalid entity id', async function () {
                    await denyRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/BAD-ENTITY-ID/support/chat/response`
                    })
                })
                // should be able to pub to ../support/chat/request and ../support/inflight/command/response topics
                // should not be able to sub to ../support/chat/request or ../support/inflight/command/response topics (they are done by the expert-agent)
                it('allows publish to chat request topics (instance)', async function () {
                    await allowWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/${TestObjects.ProjectA.id}/support/chat/request`
                    })
                })
                it('allows publish to chat request topics (device)', async function () {
                    await allowWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/d/${TestObjects.DeviceA.hashid}/support/chat/request`
                    })
                })
                it('denies subscription to chat request topics (instance)', async function () {
                    await denyRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/${TestObjects.ProjectA.id}/support/chat/request`
                    })
                })
                it('denies subscription to chat request topics (device)', async function () {
                    await denyRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/d/${TestObjects.DeviceA.hashid}/support/chat/request`
                    })
                })

                it('denies publish with invalid entity id', async function () {
                    await denyWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/BAD-ENTITY-ID/support/chat/request`
                    })
                })

                // inflight
                // should be able to sub to ../support/inflight/command/request and pub to ../support/inflight/command/response topics
                // should not be able to sub to ../support/inflight/command/response or pub to ../support/inflight/command/request topics (they are done by the expert-agent, not the expert-client)
                it('allows subscription to inflight request topics (instance)', async function () {
                    await allowRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/${TestObjects.ProjectA.id}/support/inflight/command/request`
                    })
                })
                it('allows subscription to inflight request topics (device)', async function () {
                    await allowRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/d/${TestObjects.DeviceA.hashid}/support/inflight/command/request`
                    })
                })
                it('denies publish to inflight request topics (instance)', async function () {
                    await denyWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/${TestObjects.ProjectA.id}/support/inflight/command/request`
                    })
                })
                it('denies publish to inflight request topics (device)', async function () {
                    await denyWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/d/${TestObjects.DeviceA.hashid}/support/inflight/command/request`
                    })
                })
                // should not allow client 1 to sub to or pub to another client's topics
                it('denies subscription to another client\'s chat response topics', async function () {
                    await denyRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.bob.hashid}/session123/p/${TestObjects.ProjectA.id}/support/inflight/command/request`
                    })
                })
                it('denies publish to another client\'s chat response topics', async function () {
                    await denyWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.bob.hashid}/session123/p/${TestObjects.ProjectA.id}/support/inflight/command/response`
                    })
                })

                it('denies subscription to inflight request with mismatching session id', async function () {
                    await denyRead({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/BAD-SESSION/p/${TestObjects.ProjectA.id}/support/inflight/command/request`
                    })
                })
                it('allows publish to inflight response topics (instance)', async function () {
                    await allowWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/${TestObjects.ProjectA.id}/support/inflight/command/response`
                    })
                })
                it('allows publish to inflight response topics (device)', async function () {
                    await allowWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/d/${TestObjects.DeviceA.hashid}/support/inflight/command/response`
                    })
                })
                it('denies publish to inflight response with mismatching session id', async function () {
                    await denyWrite({
                        username: `expert-client:${TestObjects.alice.hashid}:session123`,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/BAD-SESSION/p/${TestObjects.ProjectA.id}/support/inflight/command/response`
                    })
                })
            })

            describe('Expert Agent', async function () {
                // basic tests - cannot sub or pub to any topics outside of 'ff/v1/expert/#' e.g. cannot sub or pub to project/device topics
                it('denies subscription to project topics', async function () {
                    await denyRead({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectA.id}/res/#`
                    })
                })
                it('denies publish to project topics', async function () {
                    await denyWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectA.id}/in/foo`
                    })
                })
                it('denies subscription to device topics', async function () {
                    await denyRead({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.DeviceA.id}/res/#`
                    })
                })
                it('denies publish to device topics', async function () {
                    await denyWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.DeviceA.id}/in/foo`
                    })
                })
                it('denies publish/subscribe to platform topics', async function () {
                    await denyRead({
                        username: 'expert-agent:api:v1',
                        topic: 'ff/v1/platform/sync'
                    })
                    await denyWrite({
                        username: 'expert-agent:api:v1',
                        topic: 'ff/v1/platform/sync'
                    })
                })

                // should be able to sub to ../support/chat/request and ../support/inflight/command/response topics
                // should not be able to pub to ../support/chat/request or ../support/inflight/command/response topics (they are done by the expert-agent, not the expert-client)
                it('allows subscription to chat request topics', async function () {
                    await allowRead({
                        username: 'expert-agent:api:v1',
                        topic: 'ff/v1/expert/+/+/+/+/support/chat/request'
                    })
                })
                it('denies subscription to wildcard request topics', async function () {
                    await denyRead({
                        username: 'expert-agent:api:v1',
                        topic: 'ff/v1/expert/+/+/+/+/#'
                    })
                })
                it('denies publish to chat request topics (instance)', async function () {
                    await denyWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/${TestObjects.ProjectA.id}/support/chat/request`
                    })
                })
                it('denies publish to chat request topics (device)', async function () {
                    await denyWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/d/${TestObjects.DeviceA.hashid}/support/chat/request`
                    })
                })

                // should be able to pub to ../support/chat/response and ../support/inflight/command/request topics
                // should not be able to sub to ../support/chat/response or ../support/inflight/command/request topics (they are done by the expert-agent)
                it('allows publish to chat response topics (instance)', async function () {
                    await allowWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/${TestObjects.ProjectA.id}/support/chat/response`
                    })
                })
                it('allows publish to chat response topics (device)', async function () {
                    await allowWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/d/${TestObjects.DeviceA.hashid}/support/chat/response`
                    })
                })
                it('denies subscription to chat response topics', async function () {
                    await denyRead({
                        username: 'expert-agent:api:v1',
                        topic: 'ff/v1/expert/+/+/+/+/support/chat/response'
                    })
                })

                it('denies publish with invalid entity type', async function () {
                    await denyWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/X/${TestObjects.ProjectA.id}/support/chat/response`
                    })
                })
                it('denies publish with invalid entity id', async function () {
                    await denyWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/BAD-ENTITY-ID/support/chat/response`
                    })
                })

                // inflight
                // should be able to sub to ../support/inflight/command/response and pub to ../support/inflight/command/request topics
                // should not be able to sub to ../support/inflight/command/request or pub to ../support/inflight/command/response topics (they are done by the expert-agent, not the expert-client)
                it('allows subscription to inflight response topics', async function () {
                    await allowRead({
                        username: 'expert-agent:api:v1',
                        topic: 'ff/v1/expert/+/+/+/+/support/inflight/+/response'
                    })
                })
                it('denies publish to inflight response topics (instance)', async function () {
                    await denyWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/${TestObjects.ProjectA.id}/support/inflight/command/response`
                    })
                })
                it('denies publish to inflight response topics (device)', async function () {
                    await denyWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/d/${TestObjects.DeviceA.hashid}/support/inflight/command/response`
                    })
                })

                it('allows publish to inflight request topics (instance)', async function () {
                    await allowWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/${TestObjects.ProjectA.id}/support/inflight/command/request`
                    })
                })
                it('allows publish to inflight request topics (device)', async function () {
                    await allowWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/d/${TestObjects.DeviceA.hashid}/support/inflight/command/request`
                    })
                })
                it('denies publish to inflight request with bad entity type', async function () {
                    await denyWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/X/${TestObjects.ProjectA.id}/support/inflight/command/request`
                    })
                })
                it('denies publish to inflight request with bad entity id', async function () {
                    await denyWrite({
                        username: 'expert-agent:api:v1',
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/session123/p/BAD-ENTITY-ID/support/inflight/command/request`
                    })
                })

                // Bridge heartbeat topics - special-cased literal topics used to keep the
                // platform <-> Expert Broker bridge alive (see checkExpertPlatformTopic)
                it('allows subscription to the heartbeat response topic', async function () {
                    await allowRead({
                        username: 'expert-agent:api:v1',
                        topic: 'ff/v1/expert/expert-agent/bridge/platform/heartbeat/response'
                    })
                })
                it('denies publish to the heartbeat response topic', async function () {
                    await denyWrite({
                        username: 'expert-agent:api:v1',
                        topic: 'ff/v1/expert/expert-agent/bridge/platform/heartbeat/response'
                    })
                })
                it('allows publish to the heartbeat request topic', async function () {
                    await allowWrite({
                        username: 'expert-agent:api:v1',
                        topic: 'ff/v1/expert/expert-agent/bridge/platform/heartbeat/request'
                    })
                })
                it('denies subscription to the heartbeat request topic', async function () {
                    await denyRead({
                        username: 'expert-agent:api:v1',
                        topic: 'ff/v1/expert/expert-agent/bridge/platform/heartbeat/request'
                    })
                })
            })

            describe('Platform (forge_platform)', async function () {
                // Bridge heartbeat topics - special-cased literal topics used to keep the
                // platform <-> Expert Broker bridge alive (see checkExpertPlatformTopic)
                it('allows publish to the heartbeat response topic', async function () {
                    await allowWrite({
                        username: 'forge_platform',
                        topic: 'ff/v1/expert/forge_platform/bridge/platform/heartbeat/response'
                    })
                })
                it('denies subscription to the heartbeat response topic', async function () {
                    await denyRead({
                        username: 'forge_platform',
                        topic: 'ff/v1/expert/forge_platform/bridge/platform/heartbeat/response'
                    })
                })
                it('allows subscription to the heartbeat request topic', async function () {
                    await allowRead({
                        username: 'forge_platform',
                        topic: 'ff/v1/expert/forge_platform/bridge/platform/heartbeat/request'
                    })
                })
                it('denies publish to the heartbeat request topic', async function () {
                    await denyWrite({
                        username: 'forge_platform',
                        topic: 'ff/v1/expert/forge_platform/bridge/platform/heartbeat/request'
                    })
                })
            })

            // TODO: tests for Application RBACs (ensure project/device in an application with reduced permissions are suitably restricted in the ACLs)
        })

        describe('Team Frontend', async function () {
            // checkUserIsTeamMember verifier coverage — the security gate for the
            // browser team-channel subscriptions
            let teamFrontendUsername
            let teamUpdatedTopic
            let membershipTopic
            let otherTeam
            let bob

            before(async function () {
                await setupCE()
                bob = await factory.createUser({ username: 'bob', name: 'Bob', email: 'bob@example.com', password: 'bbPassword1!' })
                await TestObjects.ATeam.addUser(bob, { through: { role: Roles.Member } })
                otherTeam = await factory.createTeam({ name: 'BTeam' })
                teamFrontendUsername = `fe-team:${TestObjects.alice.hashid}:${TestObjects.ATeam.hashid}:session-1234567890`
                teamUpdatedTopic = `ff/v1/${TestObjects.ATeam.hashid}/t/updated`
                membershipTopic = `ff/v1/${TestObjects.ATeam.hashid}/u/${TestObjects.alice.hashid}/membership`
            })

            after(async function () {
                await app.close()
            })

            it('allows a team member to subscribe to their t/updated topic', async function () {
                await allowRead({
                    username: teamFrontendUsername,
                    topic: teamUpdatedTopic
                })
            })
            it('allows a team member to subscribe to their own membership topic', async function () {
                await allowRead({
                    username: teamFrontendUsername,
                    topic: membershipTopic
                })
            })
            it('denies subscribe when the topic team-hash mismatches the credential', async function () {
                await denyRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${otherTeam.hashid}/t/updated`
                })
            })
            it('denies subscribe to another user\'s membership topic', async function () {
                await denyRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/u/${bob.hashid}/membership`
                })
            })
            it('denies subscribe for a user who is not a member of the team', async function () {
                const charlie = await factory.createUser({ username: 'charlie', name: 'Charlie', email: 'charlie@example.com', password: 'ccPassword1!' })
                // charlie is not in ATeam; he holds a (theoretically) valid credential username
                const charlieUsername = `fe-team:${charlie.hashid}:${TestObjects.ATeam.hashid}:session-1234567890`
                await denyRead({
                    username: charlieUsername,
                    topic: teamUpdatedTopic
                })
            })
            it('allows a team member to subscribe to the team instance-state wildcard', async function () {
                await allowRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/p/+/state`
                })
            })
            it('allows a team member to subscribe to the team device-state wildcard', async function () {
                await allowRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/d/+/state`
                })
            })
            it('denies subscribe to another team\'s state wildcard', async function () {
                await denyRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${otherTeam.hashid}/p/+/state`
                })
                await denyRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${otherTeam.hashid}/d/+/state`
                })
            })
            it('denies state subscribe for a user who is not a member of the team', async function () {
                const dave = await factory.createUser({ username: 'dave', name: 'Dave', email: 'dave@example.com', password: 'ddPassword1!' })
                const daveUsername = `fe-team:${dave.hashid}:${TestObjects.ATeam.hashid}:session-1234567890`
                await denyRead({
                    username: daveUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/p/+/state`
                })
            })
            it('allows a team member to subscribe to the application lifecycle wildcards', async function () {
                await allowRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/a/+/created`
                })
                await allowRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/a/+/updated`
                })
                await allowRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/a/+/deleted`
                })
            })
            it('denies subscribe to another team\'s application lifecycle wildcard', async function () {
                await denyRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${otherTeam.hashid}/a/+/created`
                })
            })
            it('denies application lifecycle subscribe for a user who is not a member of the team', async function () {
                const erin = await factory.createUser({ username: 'erin', name: 'Erin', email: 'erin@example.com', password: 'eePassword1!' })
                const erinUsername = `fe-team:${erin.hashid}:${TestObjects.ATeam.hashid}:session-1234567890`
                await denyRead({
                    username: erinUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/a/+/created`
                })
            })
            it('denies fe-team from publishing application lifecycle topics (read-only client)', async function () {
                await denyWrite({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/a/+/created`
                })
            })
            it('allows forge_platform to publish application lifecycle topics', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/a/an-application/created`
                })
                await allowWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/a/an-application/updated`
                })
                await allowWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/a/an-application/deleted`
                })
            })
            it('allows a team member to subscribe to the instance lifecycle wildcards', async function () {
                await allowRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/p/+/created`
                })
                await allowRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/p/+/updated`
                })
                await allowRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/p/+/deleted`
                })
            })
            it('denies subscribe to another team\'s instance lifecycle wildcard', async function () {
                await denyRead({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${otherTeam.hashid}/p/+/created`
                })
            })
            it('denies fe-team from publishing instance lifecycle topics (read-only client)', async function () {
                await denyWrite({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/p/+/created`
                })
            })
            it('allows forge_platform to publish instance lifecycle topics', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/p/an-instance/created`
                })
                await allowWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/p/an-instance/updated`
                })
                await allowWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/p/an-instance/deleted`
                })
            })
            it('denies fe-team from publishing to state (read-only client)', async function () {
                await denyWrite({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/p/+/state`
                })
            })
            it('denies fe-team from publishing (read-only client)', async function () {
                await denyWrite({
                    username: teamFrontendUsername,
                    topic: teamUpdatedTopic
                })
            })
            it('allows forge_platform to publish team-channel topics', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: teamUpdatedTopic
                })
                await allowWrite({
                    username: 'forge_platform',
                    topic: membershipTopic
                })
            })
            it('allows forge_platform to publish the reshaped instance/device state topics', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/p/an-instance/state`
                })
                await allowWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/d/a-device/state`
                })
            })
            it('denies subscribe when the credential\'s team hash does not resolve to a team', async function () {
                const teamLookupStub = sinon.stub(app.db.models.Team, 'byId').resolves(null)
                try {
                    await denyRead({
                        username: teamFrontendUsername,
                        topic: teamUpdatedTopic
                    })
                } finally {
                    teamLookupStub.restore()
                }
            })
            it('denies subscribe when the credential\'s user hash does not resolve to a user', async function () {
                const userLookupStub = sinon.stub(app.db.models.User, 'byId').resolves(null)
                try {
                    await denyRead({
                        username: teamFrontendUsername,
                        topic: teamUpdatedTopic
                    })
                } finally {
                    userLookupStub.restore()
                }
            })
            it('denies subscribe when the membership lookup throws', async function () {
                const teamLookupStub = sinon.stub(app.db.models.Team, 'byId').rejects(new Error('boom'))
                try {
                    await denyRead({
                        username: teamFrontendUsername,
                        topic: teamUpdatedTopic
                    })
                } finally {
                    teamLookupStub.restore()
                }
            })

            // Browser session topics: ff/v1/<team>/u/<user>/s/<session>/<event>
            it('allows fe-team to publish a heartbeat on its own session topic', async function () {
                await allowWrite({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/u/${TestObjects.alice.hashid}/s/session-1234567890/heartbeat`
                })
            })
            it('allows fe-team to publish close on its own session topic', async function () {
                await allowWrite({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/u/${TestObjects.alice.hashid}/s/session-1234567890/close`
                })
            })
            it('allows fe-team to publish disconnected on its own session topic (the last will)', async function () {
                await allowWrite({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/u/${TestObjects.alice.hashid}/s/session-1234567890/disconnected`
                })
            })
            it('denies fe-team from publishing on another user\'s session topic', async function () {
                await denyWrite({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/u/${bob.hashid}/s/session-1234567890/heartbeat`
                })
            })
            it('denies fe-team from publishing on another tab\'s session topic', async function () {
                await denyWrite({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/u/${TestObjects.alice.hashid}/s/session-abc12345/heartbeat`
                })
            })
            it('denies fe-team from publishing on another team\'s session topic', async function () {
                await denyWrite({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${otherTeam.hashid}/u/${TestObjects.alice.hashid}/s/session-1234567890/heartbeat`
                })
            })
            it('denies fe-team from publishing an unknown session event', async function () {
                await denyWrite({
                    username: teamFrontendUsername,
                    topic: `ff/v1/${TestObjects.ATeam.hashid}/u/${TestObjects.alice.hashid}/s/session-1234567890/invalid`
                })
            })
            it('denies fe-team from publishing on the retired tab-presence topic', async function () {
                await denyWrite({
                    username: teamFrontendUsername,
                    topic: `ff/v1/browser/tab-presence/${TestObjects.alice.hashid}/session-abc12345/heartbeat`
                })
            })
            it('allows forge_platform to subscribe to session topics via shared subscription', async function () {
                await allowRead({
                    username: 'forge_platform',
                    topic: `$share/browser/ff/v1/${TestObjects.ATeam.hashid}/u/${TestObjects.alice.hashid}/s/session-1234567890/heartbeat`
                })
            })
        })

        describe('MCP In-flight (fe-team)', async function () {
            // checkMcpInflightTopic verifier coverage - third-party MCP requests are
            // delivered to the tab over its team-channel credential, not the expert client
            const SESSION = 'session-1234567890'
            let mcpUsername
            let subTopic

            before(async function () {
                await setupEE()
                app.config.features.register('ai', true, true)
                app.config.features.register('mcpThirdParty', true, true)
                TestObjects.bob = await factory.createUser({ admin: false, username: 'bob', name: 'Bob Solo', email: 'bob@example.com', password: 'bbPassword' })
                await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
                mcpUsername = `fe-team:${TestObjects.alice.hashid}:${TestObjects.ATeam.hashid}:${SESSION}`
                subTopic = `ff/v1/expert/${TestObjects.alice.hashid}/${SESSION}/+/+/mcp/inflight/+/request`
            })

            after(async function () {
                await app.close()
            })

            // subscribe: own session, wildcard entity
            it('allows fe-team to subscribe to mcp inflight requests for its own session', async function () {
                await allowRead({ username: mcpUsername, topic: subTopic })
            })
            it('denies fe-team from subscribing on another tab\'s session', async function () {
                await denyRead({
                    username: mcpUsername,
                    topic: `ff/v1/expert/${TestObjects.alice.hashid}/session-abc12345/+/+/mcp/inflight/+/request`
                })
            })
            it('denies fe-team from subscribing on another user\'s topic', async function () {
                await denyRead({
                    username: mcpUsername,
                    topic: `ff/v1/expert/${TestObjects.bob.hashid}/${SESSION}/+/+/mcp/inflight/+/request`
                })
            })
            it('denies a half-wildcarded entity pair', async function () {
                await denyRead({
                    username: mcpUsername,
                    topic: `ff/v1/expert/${TestObjects.alice.hashid}/${SESSION}/p/+/mcp/inflight/+/request`
                })
            })
            it('denies fe-team from subscribing to the expert support channel', async function () {
                await denyRead({
                    username: mcpUsername,
                    topic: `ff/v1/expert/${TestObjects.alice.hashid}/${SESSION}/+/+/support/inflight/+/request`
                })
            })
            it('denies fe-team from publishing an mcp inflight request (the agent does that)', async function () {
                await denyWrite({
                    username: mcpUsername,
                    topic: `ff/v1/expert/${TestObjects.alice.hashid}/${SESSION}/p/${TestObjects.ProjectA.id}/mcp/inflight/automation:get-nodes/request`
                })
            })

            // publish: own session, concrete entity
            it('allows fe-team to publish an mcp inflight response (instance)', async function () {
                await allowWrite({
                    username: mcpUsername,
                    topic: `ff/v1/expert/${TestObjects.alice.hashid}/${SESSION}/p/${TestObjects.ProjectA.id}/mcp/inflight/automation:get-nodes/response`
                })
            })
            it('denies an mcp inflight response on another tab\'s session', async function () {
                await denyWrite({
                    username: mcpUsername,
                    topic: `ff/v1/expert/${TestObjects.alice.hashid}/session-abc12345/p/${TestObjects.ProjectA.id}/mcp/inflight/automation:get-nodes/response`
                })
            })
            it('denies an mcp inflight response with a wildcard entity', async function () {
                await denyWrite({
                    username: mcpUsername,
                    topic: `ff/v1/expert/${TestObjects.alice.hashid}/${SESSION}/+/+/mcp/inflight/automation:get-nodes/response`
                })
            })
            it('denies an mcp inflight response when mcpThirdParty is disabled', async function () {
                app.config.features.register('mcpThirdParty', false, true)
                try {
                    await denyWrite({
                        username: mcpUsername,
                        topic: `ff/v1/expert/${TestObjects.alice.hashid}/${SESSION}/p/${TestObjects.ProjectA.id}/mcp/inflight/automation:get-nodes/response`
                    })
                } finally {
                    app.config.features.register('mcpThirdParty', true, true)
                }
            })
        })

        describe('MCP gateway channel (forge_platform)', async function () {
            // checkMcpTopic verifier coverage - the platform proxying third-party MCP
            // requests to the central gateway over ff/v1/mcp/... topics
            const MCP_SESSION = '7d292be0-d561-41c7-afc9-280a3c914284'
            // A valid replica id that is not this instance's own app.comms.id - in a
            // multi-replica deployment the ACL check can be served by any replica
            const OTHER_PLATFORM_ID = '3d7e858c-259f-4d17-b9c0-0d046509cc42'

            before(async function () {
                await setupEE()
                app.config.features.register('ai', true, true)
                app.config.features.register('mcpThirdParty', true, true)
            })

            after(async function () {
                await app.close()
            })

            it('allows forge_platform to publish an mcp request for another replica\'s platformId', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/mcp/${OTHER_PLATFORM_ID}/${TestObjects.alice.hashid}/${MCP_SESSION}/request`
                })
            })
            it('allows forge_platform to publish an mcp request for its own platformId', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/mcp/${app.comms.id}/${TestObjects.alice.hashid}/${MCP_SESSION}/request`
                })
            })
            it('allows forge_platform to subscribe to mcp responses for a platformId', async function () {
                await allowRead({
                    username: 'forge_platform',
                    topic: `ff/v1/mcp/${OTHER_PLATFORM_ID}/+/+/response`
                })
            })
            it('denies an mcp request with a non-uuid platformId', async function () {
                await denyWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/mcp/not-a-uuid/${TestObjects.alice.hashid}/${MCP_SESSION}/request`
                })
            })
            it('denies an mcp request with a wildcard platformId', async function () {
                await denyWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/mcp/+/${TestObjects.alice.hashid}/${MCP_SESSION}/request`
                })
            })
            it('denies an mcp response subscription with a wildcard platformId', async function () {
                await denyRead({
                    username: 'forge_platform',
                    topic: 'ff/v1/mcp/+/+/+/response'
                })
            })
            it('denies an mcp request with a short mcp session id', async function () {
                await denyWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/mcp/${OTHER_PLATFORM_ID}/${TestObjects.alice.hashid}/short/request`
                })
            })
            it('denies an mcp request for an unknown user', async function () {
                await denyWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/mcp/${OTHER_PLATFORM_ID}/nonExistentUser/${MCP_SESSION}/request`
                })
            })
            it('denies an mcp request when mcpThirdParty is disabled', async function () {
                app.config.features.register('mcpThirdParty', false, true)
                try {
                    await denyWrite({
                        username: 'forge_platform',
                        topic: `ff/v1/mcp/${OTHER_PLATFORM_ID}/${TestObjects.alice.hashid}/${MCP_SESSION}/request`
                    })
                } finally {
                    app.config.features.register('mcpThirdParty', true, true)
                }
            })
        })

        describe('MCP catalog channel (forge_platform)', async function () {
            // checkMcpCatalogTopic verifier coverage - the platform fetching the global,
            // session-less flow-building catalog over ff/v1/mcp/catalog/... topics
            const OTHER_PLATFORM_ID = '3d7e858c-259f-4d17-b9c0-0d046509cc42'

            before(async function () {
                await setupEE()
                app.config.features.register('ai', true, true)
            })

            after(async function () {
                await app.close()
            })

            it('allows forge_platform to publish a catalog request for its own platformId', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/mcp/catalog/${app.comms.id}/request`
                })
            })
            it('allows forge_platform to publish a catalog request for another replica\'s platformId', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: `ff/v1/mcp/catalog/${OTHER_PLATFORM_ID}/request`
                })
            })
            it('allows forge_platform to subscribe to a catalog response for a platformId', async function () {
                await allowRead({
                    username: 'forge_platform',
                    topic: `ff/v1/mcp/catalog/${OTHER_PLATFORM_ID}/response`
                })
            })
            it('allows a catalog request when mcpThirdParty is disabled (first-party, not gated)', async function () {
                app.config.features.register('mcpThirdParty', false, true)
                try {
                    await allowWrite({
                        username: 'forge_platform',
                        topic: `ff/v1/mcp/catalog/${OTHER_PLATFORM_ID}/request`
                    })
                } finally {
                    app.config.features.register('mcpThirdParty', true, true)
                }
            })
            it('denies a catalog request with a non-uuid platformId', async function () {
                await denyWrite({
                    username: 'forge_platform',
                    topic: 'ff/v1/mcp/catalog/not-a-uuid/request'
                })
            })
            it('denies a catalog request with a wildcard platformId', async function () {
                await denyWrite({
                    username: 'forge_platform',
                    topic: 'ff/v1/mcp/catalog/+/request'
                })
            })
        })
    })
})
