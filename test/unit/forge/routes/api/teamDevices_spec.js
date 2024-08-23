const { Op } = require('sequelize')
const should = require('should') // eslint-disable-line
const sinon = require('sinon')
const { v4: uuidv4 } = require('uuid')

const { Roles } = require('../../../../../forge/lib/roles')

// eslint-disable-next-line no-unused-vars
const TestModelFactory = require('../../../../lib/TestModelFactory.js')
const setup = require('../setup')

describe('Team Devices API', function () {
    let app
    /** @type {TestModelFactory} */ let factory
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
        factory = app.factory
        AccessTokenController = app.db.controllers.AccessToken

        // Alice (created in setup()) is an admin of the platform
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        // non admin, not in any team
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', password: 'ddPassword', email_verified: true, password_expired: false })

        TestObjects.ATeam = app.team
        TestObjects.application = app.application
        TestObjects.Project1 = app.project
        TestObjects.Project2 = await factory.createInstance(
            { name: 'ateam-project2' },
            TestObjects.application,
            app.stack,
            app.template,
            app.projectType,
            { start: false }
        )

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
        await login('chris', 'ccPassword')
        await login('dave', 'ddPassword')
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
        sinon.restore()
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
        describe('Supports bulk operations', function () {
            describe('delete', function () {
                const aTeamDevices = {
                    device1: null,
                    device2: null
                }
                const bTeamDevices = {
                    device1: null
                }
                beforeEach(async function () {
                    // Add 2 sacrificial devices to this team
                    aTeamDevices.device1 = await app.factory.createDevice({ name: 'lamb device 1' }, TestObjects.ATeam, TestObjects.Project1)
                    aTeamDevices.device2 = await app.factory.createDevice({ name: 'lamb device 2' }, TestObjects.ATeam, TestObjects.Project1)
                    // Add 1 device to another team
                    bTeamDevices.device1 = await app.factory.createDevice({ name: 'goat device 1' }, TestObjects.BTeam, TestObjects.BTeamInstance)
                })
                afterEach(async function () {
                    await app.db.models.Device.destroy({
                        where: {
                            name: ['lamb device 1', 'lamb device 2', 'goat device 1']
                        }
                    })
                })
                it('Non owner cannot delete devices', async function () {
                    const response = await app.inject({
                        method: 'DELETE',
                        url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/bulk`,
                        cookies: { sid: TestObjects.tokens.chris },
                        payload: {
                            devices: [aTeamDevices.device1.hashid]
                        }
                    })
                    response.statusCode.should.equal(403)
                    const result = response.json()
                    result.should.have.property('code', 'unauthorized')
                    result.should.have.property('error', 'unauthorized')
                })
                it('Delete a single device', async function () {
                    const response = await app.inject({
                        method: 'DELETE',
                        url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/bulk`,
                        cookies: { sid: TestObjects.tokens.alice },
                        payload: {
                            devices: [aTeamDevices.device1.hashid]
                        }
                    })
                    response.statusCode.should.equal(200)
                    const result = response.json()
                    result.should.have.property('status', 'okay')

                    // ensure devices
                    const devices = await app.db.models.Device.findAll()
                    devices.filter((device) => device.name === 'lamb device 1').should.have.length(0) // gone
                    devices.filter((device) => device.name === 'lamb device 2').should.have.length(1) // still there
                    devices.filter((device) => device.name === 'goat device 1').should.have.length(1) // still there
                })
                it('Delete multiple devices', async function () {
                    const response = await app.inject({
                        method: 'DELETE',
                        url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/bulk`,
                        cookies: { sid: TestObjects.tokens.alice },
                        payload: {
                            devices: [aTeamDevices.device1.hashid, aTeamDevices.device2.hashid]
                        }
                    })
                    response.statusCode.should.equal(200)
                    const result = response.json()
                    result.should.have.property('status', 'okay')

                    // ensure devices
                    const devices = await app.db.models.Device.findAll()
                    devices.filter((device) => device.name === 'lamb device 1').should.have.length(0) // gone
                    devices.filter((device) => device.name === 'lamb device 2').should.have.length(0) // gone
                    devices.filter((device) => device.name === 'goat device 1').should.have.length(1) // still there
                })
                it('Cannot delete device belonging to a different team', async function () {
                    const response = await app.inject({
                        method: 'DELETE',
                        url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/bulk`,
                        cookies: { sid: TestObjects.tokens.alice },
                        payload: {
                            devices: [bTeamDevices.device1.hashid]
                        }
                    })
                    response.statusCode.should.equal(400)
                    const result = response.json()
                    result.should.have.property('code', 'invalid_input')
                    result.should.have.property('error')

                    // ensure no devices were deleted
                    const devices = await app.db.models.Device.findAll()
                    devices.filter((device) => device.name === 'lamb device 1').should.have.length(1) // still there
                    devices.filter((device) => device.name === 'lamb device 2').should.have.length(1) // still there
                    devices.filter((device) => device.name === 'goat device 1').should.have.length(1) // still there
                })
                it('Prevents deleting any devices mixed in with other team devices', async function () {
                    const response = await app.inject({
                        method: 'DELETE',
                        url: `/api/v1/teams/${TestObjects.ATeam.hashid}/devices/bulk`,
                        cookies: { sid: TestObjects.tokens.alice },
                        payload: {
                            devices: [aTeamDevices.device1.hashid, bTeamDevices.device1.hashid, aTeamDevices.device2.hashid]
                        }
                    })
                    response.statusCode.should.equal(400)
                    const result = response.json()
                    result.should.have.property('code', 'invalid_input')
                    result.should.have.property('error')

                    // ensure no devices were deleted
                    const devices = await app.db.models.Device.findAll()
                    devices.filter((device) => device.name === 'lamb device 1').should.have.length(1) // still there
                    devices.filter((device) => device.name === 'lamb device 2').should.have.length(1) // still there
                    devices.filter((device) => device.name === 'goat device 1').should.have.length(1) // still there
                })
            })
            describe('update', function () {
                const aTeamDevices = {
                    device1: null,
                    device2: null,
                    device3: null
                }
                let snapshot1
                let snapshot2
                let group1
                let oldHandler

                const bTeamDevices = {
                    device1: null
                }

                beforeEach(async function () {
                    oldHandler = app.comms.devices
                    app.comms.devices = sinon.stub({
                        sendCommand: () => {}
                    })
                    // create application 2
                    TestObjects.application2 = await factory.createApplication({ name: 'application-2' }, TestObjects.ATeam)
                    // Add 3 devices to A team
                    aTeamDevices.device1 = await factory.createDevice({ name: 'move-test-device-a1' }, TestObjects.ATeam, TestObjects.Project1)
                    aTeamDevices.device2 = await factory.createDevice({ name: 'move-test-device-a2' }, TestObjects.ATeam, null, TestObjects.application)
                    aTeamDevices.device3 = await factory.createDevice({ name: 'move-test-device-a3' }, TestObjects.ATeam, null, null)
                    // Add 1 device to another team
                    bTeamDevices.device1 = await factory.createDevice({ name: 'move-test-device-b1' }, TestObjects.BTeam, TestObjects.BTeamInstance)

                    // create a snapshot for project 1 and set it as the target snapshot for devices
                    snapshot1 = await factory.createSnapshot({ name: 'snapshot 1' }, TestObjects.Project1, TestObjects.alice)
                    await aTeamDevices.device1.update({ targetSnapshotId: snapshot1.id })
                    TestObjects.Project1.updateSettings({ targetSnapshotId: snapshot1.id })
                    await TestObjects.Project1.updateSetting('deviceSettings', {
                        targetSnapshot: snapshot1.id
                    })
                    snapshot2 = await factory.createSnapshot({ name: 'snapshot 2' }, TestObjects.Project1, TestObjects.alice)

                    // Create a device group and add device 2 to it
                    group1 = await factory.createApplicationDeviceGroup({ name: 'group 1' }, TestObjects.application)
                    await aTeamDevices.device2.update({ DeviceGroupId: group1.id, targetSnapshotId: snapshot2.id })
                })

                afterEach(async function () {
                    app.comms.devices = oldHandler
                    await app.db.models.Device.destroy({
                        where: {
                            name: ['move-test-device-a1', 'move-test-device-a2', 'move-test-device-a3', 'move-test-device-b1']
                        }
                    })
                    await app.db.models.DeviceGroup.destroy({ where: { id: group1.id } })
                    await app.db.models.ProjectSnapshot.destroy({ where: { id: [snapshot1.id, snapshot2.id] } })
                    await app.db.models.Application.destroy({ where: { id: TestObjects.application2.id } })
                    delete TestObjects.application2
                })

                async function bulkUpdate (teamId, userToken, data) {
                    const payload = {}
                    const hasProperty = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
                    if (hasProperty(data, 'devices')) { payload.devices = data.devices }
                    if (hasProperty(data, 'application')) { payload.application = data.application }
                    if (hasProperty(data, 'instance')) { payload.instance = data.instance }
                    return await app.inject({
                        method: 'PUT',
                        url: `/api/v1/teams/${teamId}/devices/bulk`,
                        cookies: { sid: userToken },
                        payload
                    })
                }

                describe('move devices', function () {
                    it('Rejects invalid application (404)', async function () {
                        const response = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.alice, {
                            devices: [aTeamDevices.device1.hashid],
                            application: 'invalid'
                        })
                        response.statusCode.should.equal(404)
                        const result = response.json()
                        result.should.have.property('code', 'not_found')
                        result.should.have.property('error')
                    })

                    it('Rejects invalid instance (404)', async function () {
                        const response = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.alice, {
                            devices: [aTeamDevices.device1.hashid],
                            instance: uuidv4()
                        })
                        response.statusCode.should.equal(404)
                        const result = response.json()
                        result.should.have.property('code', 'not_found')
                        result.should.have.property('error')
                    })

                    it('Rejects moving a device to another team application (400)', async function () {
                        const response = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.alice, {
                            devices: [bTeamDevices.device1.hashid],
                            application: TestObjects.application.hashid
                        })
                        response.statusCode.should.equal(400)
                        const result = response.json()
                        result.should.have.property('code', 'invalid_application')
                        result.should.have.property('error').and.match(/same team/)
                    })

                    it('Rejects moving a device to another team instance (400)', async function () {
                        const response = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.alice, {
                            devices: [bTeamDevices.device1.hashid],
                            instance: TestObjects.Project1.id
                        })
                        response.statusCode.should.equal(400)
                        const result = response.json()
                        result.should.have.property('code', 'invalid_instance')
                        result.should.have.property('error').and.match(/same team/)
                    })

                    it('Rejects invalid input', async function () {
                        const response1 = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.alice, {})
                        response1.statusCode.should.equal(400)

                        const response2 = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.alice, {
                            devices: [aTeamDevices.device1.hashid],
                            application: TestObjects.application.hashid,
                            instance: TestObjects.Project1.id
                        })
                        response2.statusCode.should.equal(400)

                        const response3 = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.alice, {
                            devices: { invalid: 'invalid' },
                            application: TestObjects.application.hashid
                        })
                        response3.statusCode.should.equal(400)

                        const response4 = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.alice, {
                            devices: null,
                            application: TestObjects.application.hashid
                        })

                        response4.statusCode.should.equal(400)
                    })

                    it('Member cannot move devices (403)', async function () {
                        const response = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.chris, {
                            devices: [aTeamDevices.device1.hashid],
                            application: TestObjects.application2.hashid
                        })
                        response.statusCode.should.equal(403)
                        const result = response.json()
                        result.should.have.property('code', 'unauthorized')
                        result.should.have.property('error', 'unauthorized')
                    })

                    it('Non team member cannot move devices (404)', async function () {
                        const response = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.dave, {
                            devices: [aTeamDevices.device1.hashid],
                            application: TestObjects.application2.hashid
                        })
                        response.statusCode.should.equal(404)
                        const result = response.json()
                        result.should.have.property('code', 'not_found')
                        result.should.have.property('error')
                    })

                    it('Move all to Application 2', async function () {
                        const response = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.alice, {
                            devices: [aTeamDevices.device1.hashid, aTeamDevices.device2.hashid, aTeamDevices.device3.hashid],
                            application: TestObjects.application2.hashid
                        })
                        response.statusCode.should.equal(200)
                        const result = response.json()
                        result.should.have.property('count', 3)
                        result.should.have.property('devices').and.be.an.Array()

                        // ensure API devices are updated
                        result.devices.forEach((device) => {
                            device.should.have.property('application').and.be.an.Object()
                            device.application.should.have.property('id', TestObjects.application2.hashid)
                            device.should.have.property('targetSnapshot').and.be.null()
                        })

                        // ensure DB devices are updated
                        const aTeamDeviceIds = [
                            aTeamDevices.device1.id,
                            aTeamDevices.device2.id,
                            aTeamDevices.device3.id
                        ]
                        const devicesData = await app.db.models.Device.getAll({}, { id: aTeamDeviceIds }, { includeInstanceApplication: true })
                        devicesData.devices.should.have.length(3)
                        devicesData.devices.forEach((device) => {
                            device.should.have.property('ApplicationId', TestObjects.application2.id)
                            device.should.have.property('ProjectId', null)
                            device.should.have.property('targetSnapshotId', null)
                            device.should.have.property('DeviceGroupId', null)
                        })

                        // ensure sendCommand was called 3 times
                        should(app.comms.devices.sendCommand.callCount).equal(3)
                        const calls = app.comms.devices.sendCommand.getCalls()
                        for (const call of calls) {
                            call.args.should.have.length(4)
                            call.args[0].should.equal(TestObjects.ATeam.hashid) // arg 0 is the teamId
                            devicesData.devices.find((d) => d.hashid === call.args[1]).should.be.an.Object() // arg 1 is the device hashid
                            call.args[2].should.equal('update') // arg 2 is the command
                            const payload = call.args[3] // arg 3 is the payload
                            payload.should.have.property('application', TestObjects.application2.hashid)
                            payload.should.have.property('ownerType', 'application')
                            payload.should.not.have.property('project')
                            payload.should.have.property('snapshot', '0') // '0' is the default starter snapshot an app device gets
                        }
                    })
                    it('Move all to Project 2', async function () {
                        const response = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.alice, {
                            devices: [aTeamDevices.device1.hashid, aTeamDevices.device2.hashid, aTeamDevices.device3.hashid],
                            instance: TestObjects.Project2.id
                        })
                        response.statusCode.should.equal(200)
                        const result = response.json()
                        result.should.have.property('count', 3)
                        result.should.have.property('devices').and.be.an.Array()

                        // ensure API devices are updated
                        result.devices.forEach((device) => {
                            device.should.have.property('instance').and.be.an.Object()
                            device.instance.should.have.property('id', TestObjects.Project2.id)
                            device.should.have.property('targetSnapshot').and.be.null()
                        })

                        // ensure DB devices are updated
                        const aTeamDeviceIds = [
                            aTeamDevices.device1.id,
                            aTeamDevices.device2.id,
                            aTeamDevices.device3.id
                        ]
                        const devicesData = await app.db.models.Device.getAll({}, { id: aTeamDeviceIds }, { includeInstanceApplication: true })
                        devicesData.devices.should.have.length(3)
                        devicesData.devices.forEach((device) => {
                            device.should.have.property('ProjectId', TestObjects.Project2.id)
                            device.should.have.property('targetSnapshotId', null)
                            device.should.have.property('DeviceGroupId', null)
                        })

                        // ensure sendCommand was called 3 times
                        should(app.comms.devices.sendCommand.callCount).equal(3)
                        const calls = app.comms.devices.sendCommand.getCalls()
                        for (const call of calls) {
                            call.args.should.have.length(4)
                            call.args[0].should.equal(TestObjects.ATeam.hashid) // arg 0 is the teamId
                            devicesData.devices.find((d) => d.hashid === call.args[1]).should.be.an.Object() // arg 1 is the device hashid
                            call.args[2].should.equal('update') // arg 2 is the command
                            const payload = call.args[3] // arg 3 is the payload
                            payload.should.have.property('project', TestObjects.Project2.id)
                            payload.should.have.property('ownerType', 'instance')
                            payload.should.not.have.property('application')
                            payload.should.have.property('snapshot', null)
                        }
                    })
                    it('Only updates devices not already assigned to the target application', async function () {
                        const response = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.alice, {
                            devices: [aTeamDevices.device1.hashid, aTeamDevices.device2.hashid, aTeamDevices.device3.hashid],
                            application: TestObjects.application.hashid
                        })
                        response.statusCode.should.equal(200)
                        const result = response.json()
                        result.should.have.property('count', 2)
                        result.should.have.property('devices').and.be.an.Array()

                        // ensure API devices are updated
                        result.devices.forEach((device) => {
                            device.should.have.property('application').and.be.an.Object()
                            device.application.should.have.property('id', TestObjects.application.hashid)
                            device.should.have.property('targetSnapshot').and.be.null()
                        })

                        // ensure DB devices are updated
                        const affectedDeviceIds = [
                            aTeamDevices.device2.id // this one should be assigned to application 1
                        ]
                        const allDeviceIds = [
                            ...affectedDeviceIds,
                            aTeamDevices.device1.id, // this was assigned to project 1
                            aTeamDevices.device3.id // this was unassigned
                        ]

                        const devicesData = await app.db.models.Device.getAll({}, { id: allDeviceIds }, { includeInstanceApplication: true })
                        const dbd1 = devicesData.devices.find((d) => d.id === aTeamDevices.device1.id)
                        const dbd2 = devicesData.devices.find((d) => d.id === aTeamDevices.device2.id)
                        const dbd3 = devicesData.devices.find((d) => d.id === aTeamDevices.device3.id)

                        // device 1 should be assigned to application 1 and its target snapshot should be cleared
                        dbd1.should.have.property('ApplicationId', TestObjects.application.id)
                        dbd1.should.have.property('ProjectId', null)
                        dbd1.should.have.property('targetSnapshotId', null)
                        dbd1.should.have.property('DeviceGroupId', null)

                        // device 2 was already assigned to application 1 and its target snapshot should be unchanged
                        dbd2.should.have.property('ApplicationId', TestObjects.application.id)
                        dbd2.should.have.property('ProjectId', null)
                        dbd2.should.have.property('targetSnapshotId', snapshot2.id) // unchanged as this device was already in assigned to the application
                        dbd2.should.have.property('DeviceGroupId', group1.id) // unchanged as this device was already in assigned to the application

                        // device 3 should be assigned to application 1 and its target snapshot should be cleared
                        dbd3.should.have.property('ApplicationId', TestObjects.application.id)
                        dbd3.should.have.property('ProjectId', null)
                        dbd3.should.have.property('targetSnapshotId', null)
                        dbd3.should.have.property('DeviceGroupId', null)

                        // ensure sendCommand was called 2 times for the affected devices
                        should(app.comms.devices.sendCommand.callCount).equal(2)
                        const affectedDevices = [dbd1, dbd3]
                        const calls = app.comms.devices.sendCommand.getCalls()
                        for (const call of calls) {
                            call.args.should.have.length(4)
                            call.args[0].should.equal(TestObjects.ATeam.hashid) // arg 0 is the teamId
                            affectedDevices.find((d) => d.hashid === call.args[1]).should.be.an.Object() // arg 1 is the device hashid
                            call.args[2].should.equal('update') // arg 2 is the command
                            const payload = call.args[3] // arg 3 is the payload
                            payload.should.have.property('application', TestObjects.application.hashid)
                            payload.should.have.property('ownerType', 'application')
                            payload.should.not.have.property('project')
                            payload.should.have.property('snapshot', '0') // '0' is the default starter snapshot an app device gets
                        }
                    })

                    it('Only updates devices not already assigned to the target project', async function () {
                        const response = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.alice, {
                            devices: [aTeamDevices.device1.hashid, aTeamDevices.device2.hashid, aTeamDevices.device3.hashid],
                            instance: TestObjects.Project1.id
                        })
                        response.statusCode.should.equal(200)
                        const result = response.json()
                        result.should.have.property('count', 2)
                        result.should.have.property('devices').and.be.an.Array()

                        // ensure API devices are updated
                        result.devices.forEach((device) => {
                            device.should.have.property('instance').and.be.an.Object()
                            device.instance.should.have.property('id', TestObjects.Project1.id)
                            device.should.have.property('targetSnapshot').and.be.an.Object()
                            device.targetSnapshot.should.have.property('id', snapshot1.hashid)
                        })

                        // ensure DB devices are updated
                        const affectedDeviceIds = [
                            aTeamDevices.device2.id, // this one should now be assigned to project 1
                            aTeamDevices.device3.id // this one should now be assigned to project 1
                        ]
                        const allDeviceIds = [
                            ...affectedDeviceIds,
                            aTeamDevices.device1.id // this one should be untouched
                        ]

                        const devicesData = await app.db.models.Device.getAll({}, { id: allDeviceIds }, { includeInstanceApplication: true })
                        const dbd1 = devicesData.devices.find((d) => d.id === aTeamDevices.device1.id)
                        const dbd2 = devicesData.devices.find((d) => d.id === aTeamDevices.device2.id)
                        const dbd3 = devicesData.devices.find((d) => d.id === aTeamDevices.device3.id)

                        // device 1 should be untouched
                        dbd1.should.have.property('ownerType', 'instance')
                        dbd1.should.have.property('ProjectId', TestObjects.Project1.id)
                        dbd1.should.have.property('targetSnapshotId', snapshot1.id)
                        dbd1.should.have.property('DeviceGroupId', null)

                        // device 2 should be assigned to project 1 and its target snapshot should be set to the project's target snapshot
                        dbd2.should.have.property('ownerType', 'instance')
                        dbd2.should.have.property('ProjectId', TestObjects.Project1.id)
                        dbd2.should.have.property('targetSnapshotId', snapshot1.id)
                        dbd2.should.have.property('DeviceGroupId', null)

                        // device 3 should be assigned to project 1 and its target snapshot should be set to the project's target snapshot
                        dbd3.should.have.property('ownerType', 'instance')
                        dbd3.should.have.property('ProjectId', TestObjects.Project1.id)
                        dbd3.should.have.property('targetSnapshotId', snapshot1.id)
                        dbd3.should.have.property('DeviceGroupId', null)

                        // ensure sendCommand was called 2 times for the affected devices
                        should(app.comms.devices.sendCommand.callCount).equal(2)
                        const affectedDevices = [dbd2, dbd3]
                        const calls = app.comms.devices.sendCommand.getCalls()
                        for (const call of calls) {
                            call.args.should.have.length(4)
                            call.args[0].should.equal(TestObjects.ATeam.hashid) // arg 0 is the teamId
                            affectedDevices.find((d) => d.hashid === call.args[1]).should.be.an.Object() // arg 1 is the device hashid
                            call.args[2].should.equal('update') // arg 2 is the command
                            const payload = call.args[3] // arg 3 is the payload
                            payload.should.have.property('project', TestObjects.Project1.id)
                            payload.should.have.property('ownerType', 'instance')
                            payload.should.not.have.property('application')
                            payload.should.have.property('snapshot', snapshot1.hashid) // should be set to the project's target snapshot
                        }
                    })

                    it('Only unassigns devices not already unassigned', async function () {
                        // Premise: device 3 is already unassigned so only device 1 and 2 should be changed and updated
                        const response = await bulkUpdate(TestObjects.ATeam.hashid, TestObjects.tokens.alice, {
                            devices: [aTeamDevices.device1.hashid, aTeamDevices.device2.hashid, aTeamDevices.device3.hashid],
                            instance: null,
                            application: null
                        })
                        response.statusCode.should.equal(200)
                        const result = response.json()
                        result.should.have.property('count', 2)
                        result.should.have.property('devices').and.be.an.Array()

                        // ensure API devices are updated
                        result.devices.forEach((device) => {
                            device.should.not.have.property('application')
                            device.should.not.have.property('instance')
                            device.should.have.property('targetSnapshot').and.be.null()
                        })

                        // ensure DB devices are updated
                        const affectedDeviceIds = [
                            aTeamDevices.device1.id, // this one should be unassigned (originally assigned to project 1)
                            aTeamDevices.device2.id // this one should be unassigned (originally assigned to application 1)
                        ]
                        const allDeviceIds = [
                            ...affectedDeviceIds,
                            aTeamDevices.device3.id // this one should be untouched
                        ]
                        const devicesData = await app.db.models.Device.getAll({}, { id: allDeviceIds }, { includeInstanceApplication: true })
                        devicesData.devices.forEach((device) => {
                            device.should.have.property('ApplicationId', null)
                            device.should.have.property('ProjectId', null)
                            device.should.have.property('targetSnapshotId', null)
                            device.should.have.property('DeviceGroupId', null)
                        })

                        // ensure sendCommand was called 2 times
                        should(app.comms.devices.sendCommand.callCount).equal(2)
                        const affectedDevices = devicesData.devices.filter((device) => affectedDeviceIds.includes(device.id))
                        const calls = app.comms.devices.sendCommand.getCalls()
                        for (const call of calls) {
                            call.args.should.have.length(4)
                            call.args[0].should.equal(TestObjects.ATeam.hashid) // arg 0 is the teamId
                            affectedDevices.find((d) => d.hashid === call.args[1]).should.be.an.Object() // arg 1 is the device hashid
                            call.args[2].should.equal('update') // arg 2 is the command
                            const payload = call.args[3] // arg 3 is the payload
                            payload.should.have.property('project', null)
                            payload.should.have.property('ownerType').and.be.null()
                            payload.should.have.property('snapshot', null)
                        }
                    })
                })
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
            response.statusCode.should.equal(403)
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
            response.statusCode.should.equal(403)
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
            response.statusCode.should.equal(403)
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
            response.statusCode.should.equal(403)
            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error', 'unauthorized')
        })
    })
})
