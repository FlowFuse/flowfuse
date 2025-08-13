const { Op } = require('sequelize')
const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

const MAX_BROKER_USERS_PER_TEAM = 5

describe('Team Broker API', function () {
    describe('unlicensed', function () {
        let app
        it('client limit set to 0 for unlicensed', async function () {
            app = await setup({ license: undefined })
            const clientCount = app.license.get('mqttClients')
            clientCount.should.equal(0)
        })
        after(async function () {
            await app.close()
        })
    })
    describe('old license', function () {
        let app
        it('client limit set to 20 for old license format', async function () {
            // Pre MQTT enterprise license which contains no claims on MQTT
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg'
            app = await setup({ license })
            const clientCount = app.license.get('mqttClients')
            // Default Enterprise license count
            clientCount.should.equal(20)
        })
        after(async function () {
            await app.close()
        })
    })
    describe('licensed', function () {
        let app
        /** @type {import('../../../../../lib/TestModelFactory')} */
        let factory
        const TestObjects = { tokens: {} }

        before(async function () {
            // Dev-only Enterprise license that allows 6 MQTT Clients
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'
            app = await setup({ license })
            factory = app.factory
            await login('alice', 'aaPassword')

            const userBob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
            await app.team.addUser(userBob, { through: { role: Roles.Owner } })
            // Run all the tests with bob - non-admin Team Owner
            await login('bob', 'bbPassword')

            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const defaultTeamTypeProperties = defaultTeamType.properties

            if (defaultTeamTypeProperties.features) {
                defaultTeamTypeProperties.features.teamBroker = true
            } else {
                defaultTeamTypeProperties.features = {
                    teamBroker: true
                }
            }
            if (defaultTeamTypeProperties.teamBroker) {
                defaultTeamTypeProperties.teamBroker.clients.limit = MAX_BROKER_USERS_PER_TEAM
            } else {
                defaultTeamTypeProperties.teamBroker = {
                    clients: {
                        limit: MAX_BROKER_USERS_PER_TEAM
                    }
                }
            }
            app.defaultTeamType.properties = defaultTeamTypeProperties
            await app.defaultTeamType.save()
        })

        after(async function () {
            await app.close()
        })

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

        describe('Work with MQTT Broker Users', function () {
            it('Create MQTT Broker User', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client`,
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: 'bob',
                        password: 'bbPassword',
                        acls: [
                            {
                                pattern: 'foo/#',
                                action: 'both'
                            }
                        ]
                    }
                })
                response.statusCode.should.equal(201)
                const result = response.json()
                result.should.have.property('id')
                result.should.have.property('username', 'bob')
                result.should.have.property('acls')
                result.acls.should.have.a.lengthOf(1)
                result.acls[0].should.have.property('action', 'both')
            })

            it('Get all MQTT broker users for a team', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${app.team.hashid}/broker/clients`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.clients.should.have.a.lengthOf(1)
                result.clients[0].should.have.property('username', 'bob')
            })

            it('Get specific MQTT broker user for a team', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client/bob`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('username', 'bob')
            })

            it('Modify an existing MQTT broker user for a team', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client/bob`,
                    body: {
                        acls: [
                            { pattern: 'foo/#', action: 'both' },
                            { pattern: 'bar/test', action: 'publish' }
                        ]
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(201)
                const result = response.json()
                result.should.have.property('username', 'bob')
                result.should.have.property('acls')
                result.acls.should.have.lengthOf(2)
                result.acls[1].should.have.property('pattern', 'bar/test')
            })

            it('Get specific MQTT broker user for a team who doesn\'t exist', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client/doesNotExist`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(404)
            })

            it('Limit number of MQTT broker users allowed in a team', async function () {
                let response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${app.team.hashid}/broker/clients`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(200)
                let result = response.json()
                result.clients.should.have.a.lengthOf(1)
                const start = result.clients.length
                for (let i = start; i < MAX_BROKER_USERS_PER_TEAM; i++) {
                    const create = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client`,
                        cookies: { sid: TestObjects.tokens.bob },
                        body: {
                            username: `bob-${i}`,
                            password: 'bbPassword',
                            acls: [
                                {
                                    pattern: 'foo/#',
                                    action: 'both'
                                }
                            ]
                        }
                    })
                    create.statusCode.should.equal(201)
                }
                response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${app.team.hashid}/broker/clients`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                result = response.json()
                result.clients.should.have.a.lengthOf(MAX_BROKER_USERS_PER_TEAM)

                response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client`,
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: 'bob-5',
                        password: 'bbPassword',
                        acls: [
                            {
                                pattern: 'foo/#',
                                action: 'both'
                            }
                        ]
                    }
                })
                response.statusCode.should.equal(400)
                result = response.json()
                result.should.have.property('code', 'broker_client_limit_reached')
            })

            it('logs overage when platform license limit exceeded', async function () {
                // Note: this test assumes previous tests have been run to create
                // extra clients. It will fail if run with `.only`
                async function getAuditLog () {
                    return (await app.inject({ method: 'GET', url: '/api/v1/admin/audit-log', cookies: { sid: TestObjects.tokens.alice } })).json()
                }

                const startLog = await getAuditLog()

                // Create a second team
                const team2 = await app.factory.createTeam({ name: 'SecondMQTTTeam' })
                await team2.addUser(app.user, { through: { role: Roles.Owner } })

                let createRequest = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${team2.hashid}/broker/client`,
                    cookies: { sid: TestObjects.tokens.alice },
                    body: {
                        username: 'alice-1',
                        password: 'aaPassword',
                        acls: [
                            {
                                pattern: 'foo/#',
                                action: 'both'
                            }
                        ]
                    }
                })
                createRequest.statusCode.should.equal(201)
                // No new audit logs yet
                ;(await getAuditLog()).should.have.property('count', startLog.count)

                // This should put the total over the license limit.
                // As we have a license, the request should succeed and also result in
                // an audit log overage entry
                createRequest = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${team2.hashid}/broker/client`,
                    cookies: { sid: TestObjects.tokens.alice },
                    body: {
                        username: 'alice-2',
                        password: 'aaPassword',
                        acls: [
                            {
                                pattern: 'foo/#',
                                action: 'both'
                            }
                        ]
                    }
                })
                createRequest.statusCode.should.equal(201)

                const endLog = await getAuditLog()
                endLog.should.have.property('count', 3)
                const overageLogEntry = endLog.log[0]
                overageLogEntry.should.have.property('event', 'platform.license.overage')
                overageLogEntry.body.should.have.property('info')
                overageLogEntry.body.info.should.have.property('resource', 'mqttClients')
                overageLogEntry.body.info.should.have.property('count', 7)
                overageLogEntry.body.info.should.have.property('limit', 6)
            })

            it('Fail to Create existing MQTT Broker User', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client`,
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: 'bob',
                        password: 'bbPassword',
                        acls: [
                            {
                                pattern: 'foo/#',
                                action: 'both'
                            }
                        ]
                    }
                })
                response.statusCode.should.equal(409)
                const result = response.json()
                result.should.have.property('error')
                result.should.have.property('code', 'client_already_exists')
            })

            it('Delete MQTT Broker User', async function () {
                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client/bob`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('status', 'okay')
            })

            it('Delete MQTT Broker User who doesn\'t exist', async function () {
                const response = await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client/bob`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(404)
            })

            describe('Links MQTT Broker Clients from an instance or device for nr-mqtt-nodes', function () {
                const device1Name = 'LinkTestDevice1'
                const device2Name = 'LinkTestDevice2'
                const instance1Name = 'LinkTestInstance1'
                const instance2Name = 'LinkTestInstance2'
                const user1Name = 'LinkTestUser1'
                const user2Name = 'LinkTestUser2'
                let team2

                async function createDevice (name, { team, application } = {}) {
                    team = team || app.team
                    application = application || app.application
                    const device = await app.factory.createDevice({ name }, team, null, application)
                    const deviceToken = await app.db.controllers.AccessToken.createTokenForDevice(device)
                    // reload with team for the refreshAuthTokens call (creates a new broker client and that needs the team)
                    await device.reload({
                        include: [{
                            model: app.db.models.Team,
                            attributes: ['hashid', 'id', 'name', 'slug', 'links']
                        }]
                    })
                    return { device, deviceToken }
                }

                async function createProject (name, { application } = {}) {
                    application = application || app.application
                    const project = await factory.createInstance({ name }, application, app.stack, app.template, app.projectType, { start: false })
                    const projectToken = await project.refreshAuthTokens()
                    return { project, projectToken }
                }

                before(async function () {
                    // delete ALL broker clients for the team (avoid hitting license limits)
                    await app.db.models.TeamBrokerClient.destroy({
                        where: {
                            TeamId: app.team.id
                        }
                    })
                    const _team2 = await factory.createTeam({ name: 'otherTeam' })
                    await _team2.addUser(app.user, { through: { role: Roles.Owner } })
                    team2 = _team2
                })

                beforeEach(async function () {
                    // Create broker clients
                    const response1 = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client`,
                        cookies: { sid: TestObjects.tokens.bob },
                        body: {
                            username: user1Name,
                            password: `${user1Name}Password`,
                            acls: [{ pattern: 'foo/#', action: 'both' }]
                        }
                    })
                    response1.statusCode.should.equal(201)
                    const response2 = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client`,
                        cookies: { sid: TestObjects.tokens.bob },
                        body: {
                            username: user2Name,
                            password: `${user2Name}Password`,
                            acls: [{ pattern: 'foo/#', action: 'both' }]
                        }
                    })
                    response2.statusCode.should.equal(201)
                })

                afterEach(async function () {
                    sinon.restore()
                    // Delete any broker client created in the beforeEach
                    await app.db.models.TeamBrokerClient.destroy({
                        where: {
                            username: { [Op.in]: [user1Name, user2Name] },
                            TeamId: app.team.id
                        }
                    })
                    // Delete any broker client created for a device
                    await app.db.models.TeamBrokerClient.destroy({
                        where: {
                            username: { [Op.like]: 'device:%' },
                            TeamId: app.team.id
                        }
                    })
                    // Delete any broker client created for a project
                    await app.db.models.TeamBrokerClient.destroy({
                        where: {
                            username: { [Op.like]: 'instance:%' },
                            TeamId: app.team.id
                        }
                    })
                    // delete devices created for the tests
                    await app.db.models.Device.destroy({
                        where: {
                            name: { [Op.in]: [device1Name, device2Name] },
                            TeamId: app.team.id
                        }
                    })
                    // delete projects created for the tests
                    await app.db.models.Project.destroy({
                        where: {
                            name: { [Op.in]: [instance1Name, instance2Name] },
                            TeamId: app.team.id
                        }
                    })
                })

                after(async function () {
                    // revert the team to have the default number of clients
                    const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
                    const defaultTeamTypeProperties = defaultTeamType.properties
                    if (defaultTeamTypeProperties.teamBroker) {
                        defaultTeamTypeProperties.teamBroker.clients.limit = MAX_BROKER_USERS_PER_TEAM
                    }
                    app.defaultTeamType.properties = defaultTeamTypeProperties
                    await app.defaultTeamType.save()
                })

                it('Create & link a client for a device using a device token', async function () {
                    // add a broker client to the team
                    const { device, deviceToken } = await createDevice(device1Name)
                    const userName = `device:${device.hashid}`

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client/${userName}/link`,
                        headers: {
                            Authorization: `Bearer ${deviceToken.token}`
                        },
                        body: {
                            password: 'abc123'
                        }
                    })
                    response.statusCode.should.equal(201)
                    const result = response.json()
                    result.should.have.property('id')
                    result.should.have.property('username', userName)
                    result.should.have.property('acls').which.is.an.Array()
                    result.acls.should.have.a.lengthOf(1)
                    result.acls[0].should.have.property('id')
                    result.acls[0].should.have.property('action', 'subscribe')
                    result.acls[0].should.have.property('pattern', '#')
                    result.should.have.property('owner').which.is.an.Object()
                    result.owner.should.have.property('instanceType', 'device')
                    result.owner.should.have.property('id', device.hashid)
                    result.owner.should.have.property('name', device.name)
                })
                it('Create & link a client for a project using a project token', async function () {
                    // add a broker client to the team
                    const { project, projectToken } = await createProject(instance1Name)
                    const userName = `instance:${project.id}`

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client/${userName}/link`,
                        headers: {
                            Authorization: `Bearer ${projectToken.token}`
                        },
                        body: {
                            password: 'abc123'
                        }
                    })
                    response.statusCode.should.equal(201)
                    const result = response.json()
                    result.should.have.property('id')
                    result.should.have.property('username', userName)
                    result.should.have.property('acls').which.is.an.Array()
                    result.acls.should.have.a.lengthOf(1)
                    result.acls[0].should.have.property('id')
                    result.acls[0].should.have.property('action', 'subscribe')
                    result.acls[0].should.have.property('pattern', '#')
                    result.should.have.property('owner').which.is.an.Object()
                    result.owner.should.have.property('instanceType', 'instance')
                    result.owner.should.have.property('id', project.id)
                    result.owner.should.have.property('name', project.name)
                })
                it('Fails to link a client without password', async function () {
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client/${user1Name}/link`,
                        headers: {
                            Authorization: 'Bearer token'
                        },
                        body: { }
                    })
                    response.statusCode.should.equal(400)
                })
                it('Returns 400 for invalid username', async function () {
                    const { project, projectToken } = await createProject(instance1Name)
                    const userName = `instance@${project.id}` // should be instance|device:id

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client/${userName}/link`,
                        headers: {
                            Authorization: `Bearer ${projectToken.token}`
                        },
                        body: {
                            password: 'abc123'
                        }
                    })
                    const result = response.json()
                    result.should.have.property('code', 'invalid_username')
                    response.statusCode.should.equal(400)
                })
                it('Returns 400 for invalid password', async function () {
                    const { project, projectToken } = await createProject(instance1Name)
                    const userName = `instance:${project.id}` // should be instance|device:id

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client/${userName}/link`,
                        headers: {
                            Authorization: `Bearer ${projectToken.token}`
                        },
                        body: {
                            password: 'a'.repeat(129) // too long
                        }
                    })
                    response.statusCode.should.equal(400)
                    const result = response.json()
                    result.should.have.property('code', 'invalid_password')
                })
                it('Returns 404 for mismatched instance username / device token', async function () {
                    const { deviceToken: deviceToken1 } = await createDevice(device1Name)
                    const { project: project1 } = await createProject(instance1Name)
                    const userName = `instance:${project1.id}`

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client/${userName}/link`,
                        headers: {
                            Authorization: `Bearer ${deviceToken1.token}`
                        },
                        body: {
                            password: 'abc123'
                        }
                    })
                    response.statusCode.should.equal(404)
                })
                it('Returns 404 for mismatched device username / instance token', async function () {
                    const { device: device1 } = await createDevice(device1Name)
                    const { projectToken: projectToken1 } = await createProject(instance1Name)
                    const userName = `device:${device1.hashid}`

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client/${userName}/link`,
                        headers: {
                            Authorization: `Bearer ${projectToken1.token}`
                        },
                        body: {
                            password: 'abc123'
                        }
                    })
                    response.statusCode.should.equal(404)
                })
                it('Returns 404 for mismatched team / device token', async function () {
                    const otherTeamApplication = await factory.createApplication({ name: 'otherTeamApplication' }, team2)
                    const { deviceToken: device1Token } = await createDevice(device1Name)
                    const { device: device2 } = await createDevice(device2Name, { team: team2, application: otherTeamApplication })
                    const userName = `device:${device2.hashid}`

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${team2.hashid}/broker/client/${userName}/link`, // team2 info
                        headers: {
                            Authorization: `Bearer ${device1Token.token}` // team 1 token
                        },
                        body: {
                            password: 'abc123'
                        }
                    })
                    response.statusCode.should.equal(404)
                })
                it('Returns 404 for mismatched team / device link url', async function () {
                    const { device, deviceToken: device1Token } = await createDevice(device1Name)
                    const userName = `device:${device.hashid}`

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${team2.hashid}/broker/client/${userName}/link`, // team2 hash + device from team 1
                        headers: {
                            Authorization: `Bearer ${device1Token.token}` // team 1 device token
                        },
                        body: {
                            password: 'abc123'
                        }
                    })
                    response.statusCode.should.equal(404)
                })
                it('Returns 404 for mismatched team / instance token', async function () {
                    const otherTeamApplication = await factory.createApplication({ name: 'otherTeamApplication' }, team2)
                    const { projectToken: instance1Token } = await createProject(instance1Name)
                    const { project: instance2 } = await createProject(instance2Name, { application: otherTeamApplication })
                    const userName = `instance:${instance2.id}`

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${team2.hashid}/broker/client/${userName}/link`, // team2 info
                        headers: {
                            Authorization: `Bearer ${instance1Token.token}` // team 1 token
                        },
                        body: {
                            password: 'abc123'
                        }
                    })
                    response.statusCode.should.equal(404)
                })
                it('Returns 404 for mismatched team / instance link url', async function () {
                    const { project: instance, projectToken: instance1Token } = await createProject(instance1Name)
                    const userName = `instance:${instance.id}`

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${team2.hashid}/broker/client/${userName}/link`, // team2 hash + instance from team 1
                        headers: {
                            Authorization: `Bearer ${instance1Token.token}` // team 1 instance token
                        },
                        body: {
                            password: 'abc123'
                        }
                    })
                    response.statusCode.should.equal(404)
                })
                it('Fails to link a client using an invalid token', async function () {
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client/instance:111222333444/link`,
                        headers: {
                            Authorization: 'Bearer invalid-token'
                        },
                        body: {
                            password: 'abc123'
                        }
                    })
                    response.statusCode.should.equal(401)
                    const result = response.json()
                    result.should.have.property('code', 'unauthorized')
                })
                it('Updates team broker client password when instance AuthTokens are refreshed', async function () {
                    const { project, projectToken } = await createProject(instance1Name)
                    const userName = `instance:${project.id}`

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client/${userName}/link`,
                        headers: {
                            Authorization: `Bearer ${projectToken.token}`
                        },
                        body: {
                            password: 'abc123'
                        }
                    })
                    response.statusCode.should.equal(201)

                    const teamBrokerClient = await app.db.models.TeamBrokerClient.byUsername(userName, app.team.hashid)
                    const pw = teamBrokerClient.password
                    // spy on Controllers.TeamBrokerClient.updateNtMqttNodeUserPassword
                    const updatePasswordSpy = sinon.spy(app.db.controllers.TeamBrokerClient, 'updateNtMqttNodeUserPassword')
                    // Simulate refreshing the AuthTokens
                    const details = await project.refreshAuthTokens(project.id)
                    updatePasswordSpy.calledOnce.should.be.true()
                    // should be called with this.TeamId, 'project', this.id, broker.password
                    updatePasswordSpy.calledWith(app.team.id, 'project', project.id, details.broker.password).should.be.true()

                    const teamBrokerClientUpdated = await app.db.models.TeamBrokerClient.byUsername(userName, app.team.hashid)
                    const pwUpdated = teamBrokerClientUpdated.password
                    pwUpdated.should.not.equal(pw)
                })
                it('Updates team broker client password when device AuthTokens are refreshed', async function () {
                    const { device: device1, deviceToken: deviceToken1 } = await createDevice(device1Name)
                    const username1 = `device:${device1.hashid}`

                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client/${username1}/link`,
                        headers: {
                            Authorization: `Bearer ${deviceToken1.token}`
                        },
                        body: {
                            password: 'abc123'
                        }
                    })
                    response.statusCode.should.equal(201)

                    const teamBrokerClient = await app.db.models.TeamBrokerClient.byUsername(username1, app.team.hashid)
                    const pw = teamBrokerClient.password
                    // spy on Controllers.TeamBrokerClient.updateNtMqttNodeUserPassword
                    const updatePasswordSpy = sinon.spy(app.db.controllers.TeamBrokerClient, 'updateNtMqttNodeUserPassword')
                    // Simulate refreshing the AuthTokens
                    const details = await device1.refreshAuthTokens(device1.hashid)
                    updatePasswordSpy.calledOnce.should.be.true()
                    // should be called with this.TeamId, 'device', this.hashid, broker.password
                    updatePasswordSpy.calledWith(app.team.id, 'device', device1.hashid, details.broker.password).should.be.true()

                    const teamBrokerClientUpdated = await app.db.models.TeamBrokerClient.byUsername(username1, app.team.hashid)
                    const pwUpdated = teamBrokerClientUpdated.password
                    pwUpdated.should.not.equal(pw)
                })
                it('Returns a 403 when no more licenses are available', async function () {
                    const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
                    const defaultTeamTypeProperties = defaultTeamType.properties
                    const originalLimit = defaultTeamTypeProperties.teamBroker.clients.limit
                    if (defaultTeamTypeProperties.teamBroker) {
                        defaultTeamTypeProperties.teamBroker.clients.limit = 1
                    }
                    app.defaultTeamType.properties = defaultTeamTypeProperties
                    await app.defaultTeamType.save()
                    const { device: device1, deviceToken: deviceToken1 } = await createDevice(device1Name)
                    const username1 = `device:${device1.hashid}`

                    // Attempt to create & link a new client
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client/${username1}/link`,
                        headers: {
                            Authorization: `Bearer ${deviceToken1.token}`
                        },
                        body: {
                            password: 'abc123'
                        }
                    })
                    response.statusCode.should.equal(403)
                    const result = response.json()
                    result.should.have.property('code', 'broker_client_limit_reached')
                    // restore original limit
                    defaultTeamTypeProperties.teamBroker.clients.limit = originalLimit
                    await app.defaultTeamType.save()
                })
            })
        })
        describe('Test EMQX MQTT Broker user auth', function () {
            const testProjects = []

            async function createProjectAndUser (name = null, { acls = [] } = {}) {
                const uniqueName = `${name || 'project'}-${testProjects.length + 1}`
                const project = await factory.createInstance({ name: uniqueName }, app.application, app.stack, app.template, app.projectType, { start: false })
                const projectToken = await project.refreshAuthTokens()
                const username = `instance:${project.id}`
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client/${username}/link`,
                    headers: {
                        authorization: `Bearer ${projectToken.token}`
                    },
                    body: {
                        password: projectToken.broker.password
                    }
                })
                response.statusCode.should.equal(201)
                const result = response.json()
                result.should.have.property('acls').and.be.an.Array()
                result.acls.should.have.lengthOf(1)
                result.acls[0].should.have.property('id').and.be.a.String()
                result.acls[0].should.have.property('action', 'subscribe')
                result.acls[0].should.have.property('pattern', '#') // by default, newly linked broker clients for nr-mqtt nodes get acls of "subscribe" "#"
                result.should.have.property('owner').and.be.an.Object()
                result.owner.should.have.property('instanceType', 'instance')
                result.owner.should.have.property('id', project.id)

                if (acls.length > 0) {
                    const teamBrokerClient = await app.db.models.TeamBrokerClient.byUsername(username, app.team.hashid)
                    teamBrokerClient.should.have.property('acls').and.be.a.String()
                    const newAcls = []
                    for (let id = 0; id < acls.length; id++) {
                        const acl = acls[id]
                        newAcls.push({ id, ...acl })
                    }
                    teamBrokerClient.acls = JSON.stringify(newAcls)
                    await teamBrokerClient.save()
                }

                testProjects.push(project)
                return { project, projectToken }
            }

            before(async function () {
                await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client`,
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: 'bob',
                        password: 'bbPassword',
                        acls: [
                            {
                                pattern: 'foo/#',
                                action: 'both'
                            }
                        ]
                    }
                })
            })
            after(async function () {
                await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client/bob`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
            })
            afterEach(async function () {
                for (const project of testProjects) {
                    await app.inject({
                        method: 'DELETE',
                        url: `/api/v1/teams/${app.team.hashid}/broker/client/instance:${project.id}`,
                        cookies: { sid: TestObjects.tokens.bob }
                    })
                    await project.destroy()
                }
            })
            it('Test Authentication pass', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/auth',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: `bob@${app.team.hashid}`,
                        password: 'bbPassword',
                        clientId: `bob@${app.team.hashid}`
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'allow')
                result.should.have.property('is_superuser', false)
                result.should.have.property('client_attrs')
                result.client_attrs.should.have.property('team')
            })
            it('Test Authentication fail', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/auth',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: `bob@${app.team.hashid}`,
                        password: 'wrongPassword',
                        clientId: `bob@${app.team.hashid}`
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'deny')
            })
            it('Test Authentication pass after password change', async function () {
                let response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client/bob`,
                    body: {
                        password: 'ccPassword'
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(201)
                response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/auth',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: `bob@${app.team.hashid}`,
                        password: 'ccPassword',
                        clientId: `bob@${app.team.hashid}`
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'allow')
                result.should.have.property('is_superuser', false)
                result.should.have.property('client_attrs')
                result.client_attrs.should.have.property('team')
            })
            it('Test Authentication fail none existent user', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/auth',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: `bob@${app.team.hashid}-foo`,
                        password: 'bbPassword',
                        clientId: `bob@${app.team.hashid}`
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'deny')
            })
            it('Test Authentication fail no password', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/auth',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: `bob@${app.team.hashid}`,
                        password: '',
                        clientId: `bob@${app.team.hashid}`
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'deny')
            })
            it('Test Authentication fail suspended team', async function () {
                app.team.suspended = true
                await app.team.save()

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/auth',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: `bob@${app.team.hashid}`,
                        password: 'bbPassword',
                        clientId: `bob@${app.team.hashid}`
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'deny')

                app.team.suspended = false
                await app.team.save()
            })
            it('Test subscribe allowed', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/acls',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: `bob@${app.team.hashid}`,
                        topic: 'foo/bar',
                        action: 'subscribe'
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'allow')
            })
            it('Test subscribe not allowed', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/acls',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: `bob@${app.team.hashid}`,
                        topic: 'bar/foo',
                        action: 'subscribe'
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'deny')
            })
            it('Test publish allowed', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/acls',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: `bob@${app.team.hashid}`,
                        topic: 'foo/foo',
                        action: 'publish'
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'allow')
            })
            it('Test publish not allowed', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/acls',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: `bob@${app.team.hashid}`,
                        topic: 'bar/foo',
                        action: 'publish'
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'deny')
            })
            it('Test Authentication forge_platform pass', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/auth',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: 'forge_platform',
                        password: await app.settings.get('commsToken'),
                        clientId: 'bob'
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'allow')
                result.should.have.property('is_superuser', false)
                result.should.have.property('client_attrs')
                result.client_attrs.should.have.property('team', '')
            })
            it('Test Authentication forge_platform fail', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/auth',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: 'forge_platform',
                        password: 'fooo',
                        clientId: 'forge_platform'
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'deny')
            })
            it('Test Authorization forge_platform subscribe', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/acls',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: 'forge_platform',
                        topic: 'ff/v1/+/l/+/status',
                        action: 'subscribe'
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'allow')
            })
            it('Test Authorization forge_platform publish deny', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/acls',
                    cookies: { sid: TestObjects.tokens.bob },
                    body: {
                        username: 'forge_platform',
                        topic: 'ff/v1/+/l/+/status',
                        action: 'publish'
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'deny')
            })
            describe('for nr-mqtt-nodes', function () {
                it('Test Authentication pass', async function () {
                    const { project, projectToken } = await createProjectAndUser('TestProjectForMQTTAuth') // this also generates the broker client user via /link
                    const response = await app.inject({
                        method: 'POST',
                        url: '/api/comms/v2/auth',
                        cookies: { sid: TestObjects.tokens.bob },
                        body: {
                            username: `mq:hosted:${app.team.hashid}:${project.id}`,
                            password: projectToken.broker.password,
                            clientId: `mq:hosted:${app.team.hashid}:${project.id}`
                        }
                    })
                    response.statusCode.should.equal(200)
                    const result = response.json()
                    result.should.have.property('result', 'allow')
                    result.should.have.property('is_superuser', false)
                    result.should.have.property('client_attrs')
                    result.client_attrs.should.have.property('team')
                })
                it('Test Authentication fail', async function () {
                    const { project } = await createProjectAndUser('TestProjectForMQTTAuth') // this also generates the broker client user via /link
                    const response = await app.inject({
                        method: 'POST',
                        url: '/api/comms/v2/auth',
                        cookies: { sid: TestObjects.tokens.bob },
                        body: {
                            username: `mq:hosted:${app.team.hashid}:${project.id}`,
                            password: 'wrong=password',
                            clientId: `mq:hosted:${app.team.hashid}:${project.id}`
                        }
                    })
                    response.statusCode.should.equal(200)
                    const result = response.json()
                    result.should.have.property('result', 'deny')
                })
                it('Test subscribe allowed', async function () {
                    const { project } = await createProjectAndUser('TestProjectForMQTTAuth') // by default, a newly linked project will have subscribe only access to '#'
                    const response = await app.inject({
                        method: 'POST',
                        url: '/api/comms/v2/acls',
                        cookies: { sid: TestObjects.tokens.bob },
                        body: {
                            username: `mq:hosted:${app.team.hashid}:${project.id}`,
                            topic: 'foo/bar',
                            action: 'subscribe'
                        }
                    })
                    response.statusCode.should.equal(200)
                    const result = response.json()
                    result.should.have.property('result', 'allow')
                })
                it('Test subscribe not allowed', async function () {
                    const { project } = await createProjectAndUser('TestProjectForMQTTAuth', { acls: [{ pattern: 'allowed/#', action: 'subscribe' }] })
                    const response = await app.inject({
                        method: 'POST',
                        url: '/api/comms/v2/acls',
                        cookies: { sid: TestObjects.tokens.bob },
                        body: {
                            username: `mq:hosted:${app.team.hashid}:${project.id}`,
                            topic: 'not-allowed/bar',
                            action: 'subscribe'
                        }
                    })
                    response.statusCode.should.equal(200)
                    const result = response.json()
                    result.should.have.property('result', 'deny')
                })
                it('Test publish allowed', async function () {
                    const { project } = await createProjectAndUser('TestProjectForMQTTAuth', { acls: [{ pattern: 'allowed/#', action: 'publish' }] })
                    const response = await app.inject({
                        method: 'POST',
                        url: '/api/comms/v2/acls',
                        cookies: { sid: TestObjects.tokens.bob },
                        body: {
                            username: `mq:hosted:${app.team.hashid}:${project.id}`,
                            topic: 'allowed/foo',
                            action: 'publish'
                        }
                    })
                    response.statusCode.should.equal(200)
                    const result = response.json()
                    result.should.have.property('result', 'allow')
                })
                it('Test publish not allowed', async function () {
                    const { project } = await createProjectAndUser('TestProjectForMQTTAuth') // by default, a newly linked project will have subscribe only access to '#'
                    const response = await app.inject({
                        method: 'POST',
                        url: '/api/comms/v2/acls',
                        cookies: { sid: TestObjects.tokens.bob },
                        body: {
                            username: `mq:hosted:${app.team.hashid}:${project.id}`,
                            topic: 'foo', // since the by default, an nr-mqtt client has no publish access, this should be denied
                            action: 'publish'
                        }
                    })
                    response.statusCode.should.equal(200)
                    const result = response.json()
                    result.should.have.property('result', 'deny')
                })
            })
        })
        describe('Test Topic listing by Team', function () {
            before(async function () {
                await app.inject({
                    method: 'POST',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client`,
                    cookies: { sid: TestObjects.tokens.alice },
                    body: {
                        username: 'alice',
                        password: 'aaPassword',
                        acls: [
                            {
                                pattern: 'foo/#',
                                action: 'both'
                            }
                        ]
                    }
                })
            })
            after(async function () {
                await app.inject({
                    method: 'DELETE',
                    url: `/api/v1/teams/${app.team.hashid}/broker/client/alice`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
            })
            it('Add topics to list', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/acls',
                    body: {
                        username: `alice@${app.team.hashid}`,
                        topic: 'foo/bar',
                        action: 'publish'
                    }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('result', 'allow')

                const response2 = await app.inject({
                    method: 'POST',
                    url: '/api/comms/v2/acls',
                    body: {
                        username: `alice@${app.team.hashid}`,
                        topic: 'foo/sub',
                        action: 'subscribe'
                    }
                })
                response2.statusCode.should.equal(200)
                const result2 = response2.json()
                result2.should.have.property('result', 'allow')

                const topicsResponse = await app.inject({
                    method: 'GET',
                    url: `/api/v1/teams/${app.team.hashid}/brokers/team-broker/topics`,
                    cookies: { sid: TestObjects.tokens.bob }
                })

                topicsResponse.statusCode.should.equal(200)
                const topics = topicsResponse.json()
                // topics.topics[] should have 'foo/bar'
                topics.topics.some(t => t.topic === 'foo/bar').should.be.true()
                // topics.topics[] should not have 'foo/sub'
                topics.topics.some(t => t.topic === 'foo/sub').should.be.false()
            })
        })
    })
})
