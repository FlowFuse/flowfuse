const { Op } = require('sequelize')
const should = require('should') // eslint-disable-line
const { Roles } = require('../../../../../forge/lib/roles')
const setup = require('../setup')

describe('Team Devices API', function () {
    let app
    /** @type {import('../../../../../forge/db/controllers/AccessToken') */
    let AccessTokenController
    const TestObjects = {}

    const queryDevices = async (url, expectedStatusCode = 200) => {
        // Match device on name
        const response = await app.inject({
            method: 'GET',
            url,
            cookies: { sid: TestObjects.tokens.alice }
        })

        const result = response.json()
        result.should.have.property('devices').and.be.an.Array()

        response.statusCode.should.equal(expectedStatusCode)

        return result.devices
    }

    before(async function () {
        const opts = { limits: { instances: 50 } }
        app = await setup(opts)
        AccessTokenController = app.db.controllers.AccessToken

        // Alice (created in setup()) is an admin of the platform
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        // non admin, not in any team
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', password: 'ddPassword', email_verified: true, password_expired: false })

        TestObjects.ATeam = app.team
        TestObjects.Project1 = app.project

        // set bob as an owner of ATeam
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        // set chris as a member of ATeam
        await TestObjects.ATeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })

        // create 1 device for ATeam
        TestObjects.Device1 = await app.factory.createDevice({ name: 'device 1', type: 'test device' }, TestObjects.ATeam, TestObjects.Project1)

        TestObjects.BTeam = await app.factory.createTeam({ name: 'BTeam' })
        await TestObjects.BTeam.addUser(TestObjects.alice, { through: { role: app.factory.Roles.Roles.Owner } })
        const BTeamApp = await app.factory.createApplication({ name: 'application-2' }, TestObjects.BTeam)

        TestObjects.BTeamInstance = await app.factory.createInstance(
            { name: 'project2' },
            BTeamApp,
            app.stack,
            app.template,
            app.projectType,
            { start: false }
        )

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
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

    beforeEach(async function () {
        TestObjects.provisioningTokens = {
            token1: await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token 1', TestObjects.ATeam),
            token2: await AccessTokenController.createTokenForTeamDeviceProvisioning('Provisioning Token 2', TestObjects.ATeam, TestObjects.Project1)
        }
    })
    afterEach(async function () {
        await app.db.models.AccessToken.destroy({
            where: {
                ownerType: 'team',
                scope: { [Op.substring]: 'device:provision' }
            }
        })
    })
    after(async function () {
        if (app) {
            await app.close()
            app = null
        }
    })
    describe('Team Devices', function () {
        // GET /api/v1/team/:teamId/devices
        // needsPermission('team:device:list')

        it('Get a list of devices owned by this team', async function () {
            // first ensure we have 1 device (added in beforeEach)
            const currentDeviceCount = await app.db.models.Device.count()
            should(currentDeviceCount).equal(1)

            // add 2 devices
            const device2 = await app.factory.createDevice({ name: 'device 2', type: 'test device' }, TestObjects.ATeam, TestObjects.Project1)
            const device3 = await app.factory.createDevice({ name: 'device 3', type: 'test device' }, TestObjects.ATeam, TestObjects.Project1)

            // check that we get 2 devices
            const devices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices`)
            devices.should.length(3)

            await device2.destroy()
            await device3.destroy()
        })

        it('Non member does not get a list of devices', async function () {
            // GET /api/v1/team/:teamId/devices
            await login('dave', 'ddPassword')
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices`,
                cookies: { sid: TestObjects.tokens.dave }
            })
            response.statusCode.should.equal(404) // not found
        })

        describe('Supports searching the devices', async function () {
            before(async function () {
                // Add 2 more devices
                await app.factory.createDevice({ name: 'device 2', type: 'it is another type of device' }, TestObjects.ATeam)
                await app.factory.createDevice({ name: 'device 3', type: 'it is another type of device numbered 3' }, TestObjects.ATeam)
            })

            after(async function () {
                await app.db.models.Device.destroy({
                    where: {
                        name: ['device 2', 'device 3']
                    }
                })
            })

            it('by name', async function () {
                const devices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?query=Device%202`)
                devices.map((device) => device.name).should.match(['device 2'])
                devices.should.have.length(1)
            })

            it('by type', async function () {
                // Match device on type
                const devices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?query=another%20type`)
                devices.should.have.length(2)
            })
        })

        describe('Supports sorting the devices', function () {
            before(async function () {
                const application2 = await app.factory.createApplication({ name: 'application-2' }, TestObjects.ATeam)

                const instance2 = await app.factory.createInstance(
                    { name: 'instance-2' },
                    application2,
                    app.stack,
                    app.template,
                    app.projectType,
                    { start: false }
                )

                // Add 3 more devices
                await app.factory.createDevice({ name: 'device 2' }, TestObjects.ATeam, TestObjects.Project1)
                await app.factory.createDevice({ name: 'device 3', type: 'it is another type of device' }, TestObjects.ATeam, instance2)
                await app.factory.createDevice({ name: 'device 4', type: 'it is another type of device, no instance' }, TestObjects.ATeam)
            })

            after(async function () {
                await app.db.models.Device.destroy({
                    where: {
                        name: ['device 2', 'device 3', 'device 4']
                    }
                })
            })

            it('by name', async function () {
                // Sort by name ASC (default)
                const resultName = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?sort=name`)
                resultName.map((device) => device.name).should.match(['device 1', 'device 2', 'device 3', 'device 4'])

                // Sort by name DESC (explicit)
                const resultNameDesc = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?sort=name&order=desc`)
                resultNameDesc.map((device) => device.name).should.match(['device 4', 'device 3', 'device 2', 'device 1'])

                // Sort by name ASC (explicit)
                const resultNameAsc = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?sort=name&order=asc`)
                resultNameAsc.map((device) => device.name).should.match(['device 1', 'device 2', 'device 3', 'device 4'])
            })

            it('by instance->application name', async function () {
                // Sort by application name ASC (default)
                const resultName = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?sort=application`)

                // SQLite puts undefined includes first ASC, Postgres has it last...
                const usingSQLite = app.db.sequelize.getDialect() === 'sqlite'
                const ascendingOrder = ['application-1', 'application-1', 'application-2']
                const descendingOrder = ['application-2', 'application-1', 'application-1']
                if (usingSQLite) {
                    ascendingOrder.unshift(undefined)
                    descendingOrder.push(undefined)
                } else {
                    ascendingOrder.push(undefined)
                    descendingOrder.unshift(undefined)
                }

                resultName.map((device) => device.application?.name).should.match(ascendingOrder)

                // Sort by application name DESC (explicit)
                const resultNameDesc = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?sort=application&order=desc`)
                resultNameDesc.map((device) => device.application?.name).should.match(descendingOrder)

                // Sort by application name ASC (explicit)
                const resultNameAsc = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?sort=application&order=asc`)
                resultNameAsc.map((device) => device.application?.name).should.match(ascendingOrder)
            })

            it('by instance name', async function () {
                // Sort by instance name ASC (default)
                const resultName = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?sort=instance`)

                // SQLite puts undefined includes first ASC, Postgres has it last...
                const usingSQLite = app.db.sequelize.getDialect() === 'sqlite'
                const ascendingOrder = ['instance-2', 'project1', 'project1']
                const descendingOrder = ['project1', 'project1', 'instance-2']
                if (usingSQLite) {
                    ascendingOrder.unshift(undefined)
                    descendingOrder.push(undefined)
                } else {
                    ascendingOrder.push(undefined)
                    descendingOrder.unshift(undefined)
                }

                resultName.map((device) => device.instance?.name).should.match(ascendingOrder)

                // Sort by instance name DESC (explicit)
                const resultNameDesc = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?sort=instance&order=desc`)
                resultNameDesc.map((device) => device.instance?.name).should.match(descendingOrder)

                // Sort by instance name ASC (explicit)
                const resultNameAsc = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?sort=instance&order=asc`)
                resultNameAsc.map((device) => device.instance?.name).should.match(ascendingOrder)
            })
        })

        describe('Supports filtering the devices', function () {
            before(async function () {
                await app.factory.createDevice({ name: 'device 2', state: 'running', lastSeenAt: new Date() }, TestObjects.ATeam, TestObjects.Project1)
                await app.factory.createDevice({ name: 'device 3', state: 'stopped', lastSeenAt: new Date(Date.now() - 5 * 60 * 1000) }, TestObjects.ATeam)
                await app.factory.createDevice({ name: 'device 4', state: 'offline', lastSeenAt: new Date(Date.now() - 2 * 60 * 1000) }, TestObjects.ATeam)
                await app.factory.createDevice({ name: 'device 5', state: 'running', lastSeenAt: new Date(Date.now() - 5 * 60 * 1000) }, TestObjects.ATeam, TestObjects.Project1)
            })

            after(async function () {
                await app.db.models.Device.destroy({
                    where: {
                        name: ['device 2', 'device 3', 'device 4', 'device 5']
                    }
                })
            })

            it('by state', async function () {
                // Running
                const runningDevices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?filters=status:running`)
                runningDevices.map((device) => device.name).should.match(['device 2', 'device 5'])

                // Error
                const errorDevices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?filters=status:stopped`)
                errorDevices.map((device) => device.name).should.match(['device 3'])

                // Stopped
                const stoppedDevices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?filters=status:offline`)
                stoppedDevices.map((device) => device.name).should.match(['device 4'])

                // Unknown
                const unknownDevices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?filters=status:unknown`)
                unknownDevices.map((device) => device.name).should.match(['device 1'])
            })

            it('by last seen', async function () {
                // Running
                const runningDevices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?filters=lastseen:never`)
                runningDevices.map((device) => device.name).should.match(['device 1'])

                // Error
                const errorDevices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?filters=lastseen:running`)
                errorDevices.map((device) => device.name).should.match(['device 2'])

                // Stopped
                const stoppedDevices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?filters=lastseen:safe`)
                stoppedDevices.map((device) => device.name).should.match(['device 4'])

                // Unknown
                const unknownDevices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?filters=lastseen:error`)
                unknownDevices.map((device) => device.name).should.match(['device 3', 'device 5'])
            })

            it('by both last seen and state', async function () {
                // Error but and not running
                const erroredDevices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?filters=lastseen:error,status:stopped`)
                erroredDevices.map((device) => device.name).should.match(['device 3'])

                // Running and seen
                const runningDevices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?filters=lastseen:running,status:running`)
                runningDevices.map((device) => device.name).should.match(['device 2'])

                // Running and not seen
                const runningUnseenDevices = await queryDevices(`/api/v1/teams/${TestObjects.ATeam.hashid}/devices?filters=lastseen:never,status:running`)
                runningUnseenDevices.should.have.length(0)
            })
        })
    })

    describe('Provisioning Tokens', function () {
        it('Get list of provisioning tokens for the team', async function () {
            // /api/v1/team/:teamId/devices/provisioning
            // needsPermission('team:device:provisioning-token:list')  (must be admin or team owner)
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('tokens').and.be.an.Array()
            result.tokens.should.have.length(2)
        })
        it('Non owner cannot get list of provisioning tokens', async function () {
            // /api/v1/team/:teamId/devices/provisioning
            // needsPermission('team:device:provisioning-token:list')  (must be admin or team owner)
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error', 'unauthorized')
        })
        it('Generate a provisioning token for the team', async function () {
            // POST /api/v1/team/:teamId/devices/provisioning
            // needsPermission('team:device:provisioning-token:create')  (must be admin or team owner)
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'Provisioning Token'
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.only.keys('token', 'id', 'name', 'expiresAt', 'team')
            result.should.have.property('id').and.be.a.String()
            result.should.have.property('name', 'Provisioning Token')
            result.should.have.property('team', TestObjects.ATeam.hashid)
            result.should.have.property('token').and.be.a.String()
        })
        it('Generate a provisioning token with assigned project', async function () {
            // POST /api/v1/team/:teamId/devices/provisioning
            // needsPermission('team:device:provisioning-token:create')  (must be admin or team owner)
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'Provisioning Token',
                    instance: TestObjects.Project1.id
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.only.keys('token', 'id', 'name', 'expiresAt', 'team', 'instance')
            result.should.have.property('token').and.be.a.String()
            result.should.have.property('id').and.be.a.String()
            result.should.have.property('name', 'Provisioning Token')
            result.should.have.property('team', TestObjects.ATeam.hashid)
            result.should.have.property('instance', TestObjects.Project1.id)
        })
        it('Cannot generate a provisioning token with invalid name', async function () {
            // POST /api/v1/team/:teamId/devices/provisioning
            // needsPermission('team:device:provisioning-token:create')  (must be admin or team owner)
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'token,name:scope:none' // invalid name (trying to inject a scope)
                }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('code', 'unexpected_error')
            result.should.have.property('error')
        })
        it('Non owner cannot generate a provisioning tokens', async function () {
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning`,
                cookies: { sid: TestObjects.tokens.chris },
                payload: {
                    name: 'Provisioning Token',
                    instance: TestObjects.Project1.id
                }
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error', 'unauthorized')
        })
        it('Cannot generate a provisioning token for instance in another team', async function () {
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'My Token',
                    instance: TestObjects.BTeamInstance.id
                }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('code', 'invalid_instance')
            result.should.have.property('error')
        })
        it('Edit a provisioning token to assign a project', async function () {
            // PUT /api/v1/team/:teamId/devices/provisioning/:tokenId
            // needsPermission('team:device:provisioning-token:edit')  (must be admin or team owner)
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token1.id}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    instance: TestObjects.Project1.id
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.only.keys('id', 'name', 'expiresAt', 'team', 'instance')
            result.should.have.property('id', TestObjects.provisioningTokens.token1.id)
            result.should.have.property('name', 'Provisioning Token 1')
            result.should.have.property('team', TestObjects.ATeam.hashid)
            result.should.have.property('instance', TestObjects.Project1.id)
        })
        it('Edit a provisioning token to unassign a project', async function () {
            // PUT /api/v1/team/:teamId/devices/provisioning/:tokenId
            // needsPermission('team:device:provisioning-token:edit')  (must be admin or team owner)
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token2.id}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    instance: null
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.only.keys('id', 'name', 'expiresAt', 'team')
            result.should.have.property('id', TestObjects.provisioningTokens.token2.id)
            result.should.have.property('name', 'Provisioning Token 2')
            result.should.have.property('team', TestObjects.ATeam.hashid)
        })
        it('Non Team Owner cannot edit a provisioning token', async function () {
            // PUT /api/v1/team/:teamId/devices/provisioning/:tokenId
            // needsPermission('team:device:provisioning-token:edit')  (must be admin or team owner)
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token2.id}`,
                cookies: { sid: TestObjects.tokens.chris },
                payload: {
                    instance: null
                }
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error', 'unauthorized')
        })
        it('Cannot edit a provisioning token to assign an instance that does not exist', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token2.id}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    instance: 'f4d62a8e-1e96-48d3-99c8-bbf5a763e7fa'
                }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('code', 'invalid_instance')
        })
        it('Cannot edit a provisioning token to assign an instance that is not in the team', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token2.id}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    instance: TestObjects.BTeamInstance.id
                }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('code', 'invalid_instance')
        })
        it('Cannot edit a provisioning token if team is incorrect', async function () {
            // Try editing an ATeam token under the BTeam url
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token2.id}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    instance: TestObjects.BTeamInstance.id
                }
            })
            response.statusCode.should.equal(404)
        })
        it('Delete a provisioning token', async function () {
            // DELETE /api/v1/team/:teamId/devices/provisioning/:tokenId
            // needsPermission('team:device:provisioning-token:delete')  (must be admin or team owner)
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token1.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('status', 'okay')
        })
        it('Cannot delete a provisioning token if team is incorrect', async function () {
            // Try deleting an ATeam token under the BTeam url
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.BTeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token1.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(404)
        })
        it('Non Team Owner cannot delete a provisioning token', async function () {
            // DELETE /api/v1/team/:teamId/devices/provisioning/:tokenId
            // needsPermission('team:device:provisioning-token:delete')  (must be admin or team owner)
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/provisioning/${TestObjects.provisioningTokens.token1.id}`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(401)
            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error', 'unauthorized')
        })
    })
})
