const should = require('should') // eslint-disable-line
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
        const TestObjects = { tokens: {} }

        before(async function () {
            // Dev-only Enterprise license that allows 6 MQTT Clients
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'
            app = await setup({ license })
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
        })
        describe('Test EMQX MQTT Broker user auth', function () {
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
        })
    })
})
