const should = require('should') // eslint-disable-line
const setup = require('../routes/setup')

describe('Broker Auth API', async function () {
    let app
    const TestObjects = {}

    const ACC = {
        READ: 1,
        WRITE: 2,
        SUBSCRIBE: 4
    }
    async function setupCE () {
        app = await setup({}, {
            broker: {
                url: ':test:'
            }
        })
        await setupTestObjects()
    }
    async function setupEE () {
        app = await setup({}, {
            broker: {
                url: ':test:'
            },
            license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkJlbiBIYXJkaWxsIiwibmJmIjoxNjQ4MTY2NDAwLCJleHAiOjE2Nzk3ODg3OTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsImRldiI6dHJ1ZSwiaWF0IjoxNjQ4MjA1MDA3fQ.2swXs50ZJgiQLA9MeoKIepN6BJGGnDqIUQ0FuKUadVjTcUzFekId5RaTpedi14f2iA7qC1w50Ym2egaBFSg1JA'
        })
        await setupTestObjects()
    }
    async function sendACLPost (opts) {
        opts.clientid = opts.username
        return await app.inject({
            method: 'POST',
            url: '/api/comms/auth/acl',
            body: opts
        })
    }
    async function allowWrite (opts) {
        opts.acc = ACC.WRITE
        const response = await sendACLPost(opts)
        response.statusCode.should.equal(200)
    }
    async function allowRead (opts) {
        // Due to the way mosquitto auth checks work, we need to check
        // both READ and SUBSCRIBE access
        opts.acc = ACC.READ
        const response = await sendACLPost(opts)
        response.statusCode.should.equal(200)

        opts.acc = ACC.SUBSCRIBE
        const response2 = await sendACLPost(opts)
        response2.statusCode.should.equal(200)
    }
    async function denyWrite (opts) {
        opts.acc = ACC.WRITE
        const response = await sendACLPost(opts)
        response.statusCode.should.equal(401)
    }
    async function denyRead (opts) {
        // Due to the way mosquitto auth checks work, we need to check
        // both READ and SUBSCRIBE access
        opts.acc = ACC.READ
        const response = await sendACLPost(opts)
        response.statusCode.should.equal(401)

        opts.acc = ACC.SUBSCRIBE
        const response2 = await sendACLPost(opts)
        response2.statusCode.should.equal(401)
    }
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

    async function setupTestObjects () {
        // alice : admin
        // ATeam ( alice  (owner) )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        // Alice set as ATeam owner in setup()

        TestObjects.ProjectA = app.project
        TestObjects.ProjectACredentials = await TestObjects.ProjectA.refreshAuthTokens()

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
                it('project canonot subscribe to own inbox', async function () {
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
            })

            describe('EE', async function () {
                before(async function () {
                    await setupEE()
                })

                after(async function () {
                    await app.close()
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
            })
        })

        describe('Device', async function () {
            let deviceUsername
            let deviceCommandTopic
            let deviceStatusTopic
            async function setupDeviceTestObjects () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/devices',
                    body: {
                        name: 'my device',
                        type: 'test device',
                        team: TestObjects.ATeam.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                TestObjects.DeviceA = response.json()
                deviceUsername = `device:${TestObjects.ATeam.hashid}:${TestObjects.DeviceA.id}`
                deviceCommandTopic = `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.DeviceA.id}/command`
                deviceStatusTopic = `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.DeviceA.id}/status`

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
                })
                describe('assigned', async function () {
                    before(async function () {
                        await app.inject({
                            method: 'PUT',
                            url: `/api/v1/devices/${TestObjects.DeviceA.id}`,
                            body: {
                                project: TestObjects.ProjectA.id
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
                    it('can publish to project inbox if assigned', async function () {
                        await allowWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectB.id}/in/foo`
                        })
                    })
                    it('can publish to project output if unassigned', async function () {
                        await allowWrite({
                            username: deviceUsername,
                            topic: `ff/v1/${TestObjects.ATeam.hashid}/p/${TestObjects.ProjectA.id}/out/foo`
                        })
                    })
                })
            })
        })
    })
})
