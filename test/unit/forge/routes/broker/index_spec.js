const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Broker Auth API', async function () {
    let app
    const TestObjects = {}

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
    before(async function () {
        app = await setup({})

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
    })

    after(async function () {
        await app.close()
    })

    describe('Auth Client', async function () {
        // POST /api/broker/auth-client

        it('rejects if request missing required values', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/broker/auth-client',
                body: { }
            })
            response.statusCode.should.equal(400)
        })

        it('accepts valid credentials', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/broker/auth-client',
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
                url: '/api/broker/auth-client',
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
        const ACC = {
            READ: 1,
            WRITE: 2,
            SUBSCRIBE: 4
        }
        async function post (opts) {
            opts.clientid = opts.username
            return await app.inject({
                method: 'POST',
                url: '/api/broker/auth-acl',
                body: opts
            })
        }
        async function allowWrite (opts) {
            opts.acc = ACC.WRITE
            const response = await post(opts)
            response.statusCode.should.equal(200)
        }
        async function allowRead (opts) {
            // Due to the way mosquitto auth checks work, we need to check
            // both READ and SUBSCRIBE access
            opts.acc = ACC.READ
            const response = await post(opts)
            response.statusCode.should.equal(200)

            opts.acc = ACC.SUBSCRIBE
            const response2 = await post(opts)
            response2.statusCode.should.equal(200)
        }
        async function denyWrite (opts) {
            opts.acc = ACC.WRITE
            const response = await post(opts)
            response.statusCode.should.equal(401)
        }
        async function denyRead (opts) {
            // Due to the way mosquitto auth checks work, we need to check
            // both READ and SUBSCRIBE access
            opts.acc = ACC.READ
            const response = await post(opts)
            response.statusCode.should.equal(401)

            opts.acc = ACC.SUBSCRIBE
            const response2 = await post(opts)
            response2.statusCode.should.equal(401)
        }
        describe('Platform Client', async function () {
            it('allows project to subscribe to project status topic', async function () {
                await allowRead({
                    username: 'forge_platform',
                    topic: 'ff/v1/+/p/+/status'
                })
            })
            it('allows project to subscribe to device status topic', async function () {
                await allowRead({
                    username: 'forge_platform',
                    topic: 'ff/v1/+/d/+/status'
                })
            })
            it('allows project to publish to project command topic', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: 'ff/v1/abc/p/xyz/command'
                })
            })
            it('allows project to publish to device command topic', async function () {
                await allowWrite({
                    username: 'forge_platform',
                    topic: 'ff/v1/abc/d/ghi/command'
                })
            })
        })

        describe('Project', async function () {
            // Status Topic
            it('allows project to publish to own status topic', async function () {
                await allowWrite({
                    username: 'project:abc:xyz',
                    topic: 'ff/v1/abc/p/xyz/status'
                })
            })
            it('prevents project from publishing to other status topic', async function () {
                await denyWrite({
                    username: 'project:abc:xyz',
                    topic: 'ff/v1/abc/p/other-project/status'
                })
                await denyWrite({
                    username: 'project:abc:xyz',
                    topic: 'ff/v1/other-team/p/xyz/status'
                })
            })
            it('prevents project from subscribing to status topic', async function () {
                await denyRead({
                    username: 'project:abc:xyz',
                    topic: 'ff/v1/abc/p/xyz/status'
                })
                await denyRead({
                    username: 'project:abc:xyz',
                    topic: 'ff/v1/abc/p/other-project/status'
                })
            })

            // Command topic
            it('allows project to subscribe to own command topic', async function () {
                allowRead({
                    username: 'project:abc:xyz',
                    topic: 'ff/v1/abc/p/xyz/command'
                })
            })
            it('prevents project from subscribing to other command topic', async function () {
                await denyRead({
                    username: 'project:abc:xyz',
                    topic: 'ff/v1/abc/p/other-project/command'
                })
                await denyRead({
                    username: 'project:abc:xyz',
                    topic: 'ff/v1/other-team/p/xyz/command'
                })
            })
            it('prevents project from publishing to command topic', async function () {
                await denyWrite({
                    username: 'project:abc:xyz',
                    topic: 'ff/v1/abc/p/xyz/command'
                })
                await denyWrite({
                    username: 'project:abc:xyz',
                    topic: 'ff/v1/abc/p/other-project/command'
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
            it('allows project to susbcribe to another projects broadcast', async function () {
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

        describe('Device', async function () {
            let deviceUsername
            let deviceCommandTopic
            let deviceStatusTopic
            before(async function () {
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
            describe('unassigned', async function () {
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
