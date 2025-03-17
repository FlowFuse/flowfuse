const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../../setup.js')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Application Device Groups API', function () {
    let app
    /** @type {import('../../../../../../forge/ee/db/controllers/DeviceGroup.js')} */
    let controller
    const TestObjects = {
        /** admin - owns ateam */
        alice: {},
        /** owner of bteam */
        bob: {},
        /** member of b team */
        chris: {},
        /** not connected to any teams */
        dave: {},
        ATeam: {},
        BTeam: {},
        /** B-team Application */
        application: {},
        /** B-team Instance */
        instance: {}

    }
    /** @type {import('../../../../../lib/TestModelFactory')} */
    let factory = null
    let objectCount = 0
    const generateName = (root = 'object') => `${root}-${objectCount++}`
    /**
     * Check the device update call args include the expected values (ownerType, application, snapshot, settings, mode, licensed)
     * @param {Array} calls - the calls array from sinon
     * @param {Object} device - the device model object
     * @param {*} snapshotId - the snapshot id to check for in the call
     */
    const checkDeviceUpdateCall = (calls, device, snapshotId) => {
        const args = calls.find(e => e.args[1] === device.hashid).args
        args[0].should.equal(device.Team.hashid)
        args[1].should.equal(device.hashid)
        args[2].should.equal('update')
        const payload = args[3]
        payload.should.have.property('ownerType', 'application')
        payload.should.have.property('application', device.Application.hashid)
        if (typeof snapshotId !== 'undefined') {
            payload.should.have.property('snapshot', snapshotId)
        } else {
            payload.should.have.property('snapshot')
        }
        payload.should.have.property('settings')
        payload.should.have.property('mode', 'autonomous')
        payload.should.have.property('licensed')
    }
    before(async function () {
        app = await setup()
        controller = app.db.controllers.DeviceGroup
        factory = app.factory

        // ATeam ( alice  (owner), bob )
        // BTeam ( bob (owner), chris )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Crackers', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'Dave Smith', email: 'dave@example.com', email_verified: true, password: 'ddPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')

        // Need to give the default TeamType permission to use DeviceGroup feature
        const defaultTeamTypeProperties = app.defaultTeamType.properties
        defaultTeamTypeProperties.features.deviceGroups = true
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })

        // alice : admin - owns ateam (setup)
        // bob - owner of bteam
        // chris - member of b team
        // dave - not connected to any teams
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })

        TestObjects.application = await app.db.models.Application.create({
            name: 'B-team Application',
            description: 'B-team Application description',
            TeamId: TestObjects.BTeam.id
        })
        TestObjects.instance = await app.factory.createInstance({ name: 'B-team-instance' }, TestObjects.application, app.stack, app.template, app.projectType, { start: false })
    })

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        return response.cookies[0].value
    }

    after(async function () {
        await app.close()
    })

    beforeEach(async function () {
        sinon.stub(app.comms.devices, 'sendCommand').resolves()
    })

    afterEach(async function () {
        app.comms.devices.sendCommand.restore()
    })

    describe('Create Device Group', async function () {
        it('Owner can create a device group', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/applications/${application.hashid}/device-groups`,
                cookies: { sid },
                payload: {
                    name: 'my device group',
                    description: 'my device group description'
                }
            })

            response.statusCode.should.equal(201)

            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'my device group')
            result.should.have.property('description', 'my device group description')
        })

        it('Cannot create a device group with empty name', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/applications/${application.hashid}/device-groups`,
                cookies: { sid },
                payload: {
                    name: '',
                    description: 'my device group description'
                }
            })

            response.statusCode.should.equal(400)

            const result = response.json()
            result.should.have.property('code', 'invalid_name')
            result.should.have.property('error')
        })

        it('Non Owner can not create a device group', async function () {
            const sid = await login('chris', 'ccPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/applications/${application.hashid}/device-groups`,
                cookies: { sid },
                payload: {
                    name: 'my device group',
                    description: 'my device group description'
                }
            })

            response.statusCode.should.equal(403)

            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error')
        })

        it('Non Member can not create a device group', async function () {
            const sid = await login('dave', 'ddPassword')
            const application = TestObjects.application

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/applications/${application.hashid}/device-groups`,
                cookies: { sid },
                payload: {
                    name: 'my device group',
                    description: 'my device group description'
                }
            })
            response.statusCode.should.be.oneOf([400, 403, 404])
        })
    })

    describe('Read Device Groups', async function () {
        it('Owner can read device groups', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group'), description: 'a description' }, application)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${application.hashid}/device-groups`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            result.should.have.property('groups')
            result.groups.should.have.length(1)
            result.groups[0].should.have.property('id', deviceGroup.hashid)
            result.groups[0].should.have.property('name', deviceGroup.name)
            result.groups[0].should.have.property('description', deviceGroup.description)
            result.groups[0].should.have.property('targetSnapshot')
        })

        it('Paginates device groups', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            await factory.createApplicationDeviceGroup({ name: generateName('device-group'), description: 'a description' }, application)
            await factory.createApplicationDeviceGroup({ name: generateName('device-group'), description: 'a description' }, application)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${application.hashid}/device-groups?limit=1`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            const result = response.json()
            result.should.have.property('groups')
            result.groups.should.have.length(1)
        })

        it('Non Owner can read device groups', async function () {
            const sid = await login('chris', 'ccPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${application.hashid}/device-groups`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)
        })

        it('Can get a specific group and associated devices', async function () {
            const sid = await login('chris', 'ccPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const device1 = await factory.createDevice({ name: generateName('device-1') }, TestObjects.BTeam, null, application)
            const device2 = await factory.createDevice({ name: generateName('device-2') }, TestObjects.BTeam, null, application)
            await app.db.controllers.DeviceGroup.updateDeviceGroupMembership(deviceGroup, { addDevices: [device1, device2] })

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            // check the response
            const result = response.json()
            result.should.have.property('id', deviceGroup.hashid)
            result.should.have.property('name', deviceGroup.name)
            result.should.have.property('description', deviceGroup.description)
            result.should.have.property('devices')
            result.devices.should.have.length(2)
            // ensure one of the 2 devices matches device1.hashid
            const device1Result = result.devices.find((device) => device.id === device1.hashid)
            should(device1Result).be.an.Object().and.not.be.null()
            // ensure one of the 2 devices matches device2.hashid
            const device2Result = result.devices.find((device) => device.id === device2.hashid)
            should(device2Result).be.an.Object().and.not.be.null()
        })

        it('404s when getting a specific group that does not exist', async function () {
            const sid = await login('chris', 'ccPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${application.hashid}/device-groups/doesNotExist`,
                cookies: { sid }
            })

            response.statusCode.should.equal(404)
            const result = response.json()
            result.should.have.property('error')
            result.should.have.property('code', 'not_found')
        })

        it('Non Member can not read device groups', async function () {
            const sid = await login('dave', 'ddPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${application.hashid}/device-groups`,
                cookies: { sid }
            })

            response.statusCode.should.be.oneOf([400, 403, 404])
        })
    })

    describe('Update Device Group', async function () {
        async function prepare () {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') + ' original name', description: 'original desc' }, application)
            deviceGroup.should.have.property('name').and.endWith('original name')
            deviceGroup.should.have.property('description', 'original desc')
            const originalId = deviceGroup.id

            const instance = TestObjects.instance
            const device1of2 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
            const device2of2 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)

            // add the devices to the group
            await controller.updateDeviceGroupMembership(deviceGroup, { addDevices: [device1of2.id, device2of2.id] })

            // create snapshot
            const snapshot = await factory.createSnapshot({ name: generateName('snapshot') }, instance, TestObjects.bob)

            // manually set the snapshot on the group and the devices (we are not testing the snapshot API here)
            deviceGroup.set('targetSnapshotId', snapshot.id)
            await deviceGroup.save()
            await device1of2.set('targetSnapshotId', snapshot.id)
            await device1of2.save()
            await device2of2.set('targetSnapshotId', snapshot.id)
            await device2of2.save()

            // reset the mock call history
            app.comms.devices.sendCommand.resetHistory()

            return { sid, application, deviceGroup, device1of2, device2of2, snapshot, originalId }
        }
        async function callUpdate (sid, application, deviceGroup, payload) {
            return app.inject({
                method: 'PUT',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid },
                payload
            })
        }
        it('Owner can update a device group', async function () {
            const { sid, application, deviceGroup, device1of2, device2of2, snapshot, originalId } = await prepare()

            // now call the API to update name and desc
            const response = await callUpdate(sid, application, deviceGroup, {
                name: 'updated name',
                description: 'updated description'
            })

            // ensure success
            response.statusCode.should.equal(200)

            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            const updatedDevice1 = await app.db.models.Device.byId(device1of2.hashid)
            const updatedDevice2 = await app.db.models.Device.byId(device2of2.hashid)

            // check group name and description are updated
            updatedDeviceGroup.should.have.property('name', 'updated name')
            updatedDeviceGroup.should.have.property('description', 'updated description')

            // check other properties are unchanged
            updatedDeviceGroup.should.have.property('id', originalId)
            updatedDeviceGroup.should.have.property('targetSnapshotId', snapshot.id)
            updatedDevice1.should.have.property('targetSnapshotId', snapshot.id)
            updatedDevice2.should.have.property('targetSnapshotId', snapshot.id)
        })

        it('Updates name only', async function () {
            const { sid, application, deviceGroup, device1of2, device2of2, snapshot, originalId } = await prepare()

            // now call the API to update name only
            const response = await callUpdate(sid, application, deviceGroup, {
                name: 'updated name'
            })

            // ensure success
            response.statusCode.should.equal(200)

            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            const updatedDevice1 = await app.db.models.Device.byId(device1of2.hashid)
            const updatedDevice2 = await app.db.models.Device.byId(device2of2.hashid)

            // check group name is updated
            updatedDeviceGroup.should.have.property('name', 'updated name')

            // check other properties are unchanged
            updatedDeviceGroup.should.have.property('id', originalId)
            updatedDeviceGroup.should.have.property('description', 'original desc')
            updatedDeviceGroup.should.have.property('targetSnapshotId', snapshot.id)
            updatedDevice1.should.have.property('targetSnapshotId', snapshot.id)
            updatedDevice2.should.have.property('targetSnapshotId', snapshot.id)
        })

        it('Updates description only', async function () {
            const { sid, application, deviceGroup, device1of2, device2of2, snapshot, originalId } = await prepare()

            // now call the API to update description only
            const response = await callUpdate(sid, application, deviceGroup, {
                description: 'updated description'
            })

            // ensure success
            response.statusCode.should.equal(200)

            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            const updatedDevice1 = await app.db.models.Device.byId(device1of2.hashid)
            const updatedDevice2 = await app.db.models.Device.byId(device2of2.hashid)

            // check group description is updated
            updatedDeviceGroup.should.have.property('description', 'updated description')

            // check other properties are unchanged
            updatedDeviceGroup.should.have.property('id', originalId)
            updatedDeviceGroup.should.have.property('name', deviceGroup.name)
            updatedDeviceGroup.should.have.property('targetSnapshotId', snapshot.id)
            updatedDevice1.should.have.property('targetSnapshotId', snapshot.id)
            updatedDevice2.should.have.property('targetSnapshotId', snapshot.id)
        })

        it('Updates targetSnapshot for group and devices', async function () {
            const { sid, application, deviceGroup, device1of2, device2of2, snapshot } = await prepare()

            // first lets verify the devices have the snapshot set as target
            device1of2.should.have.property('targetSnapshotId', snapshot.id)
            device1of2.should.have.property('targetSnapshotId', snapshot.id)

            // create a new snapshot
            const newSnapshot = await factory.createSnapshot({ name: generateName('snapshot') }, TestObjects.instance, TestObjects.bob)

            // now call the API to update targetSnapshot only
            const response = await callUpdate(sid, application, deviceGroup, {
                targetSnapshotId: newSnapshot.hashid
            })

            // should succeed
            response.statusCode.should.equal(200)

            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            const updatedDevice1 = await app.db.models.Device.byId(device1of2.hashid)
            const updatedDevice2 = await app.db.models.Device.byId(device2of2.hashid)

            // check the DeviceGroup and devices `targetSnapshotId` were updated
            updatedDeviceGroup.should.have.property('targetSnapshotId', newSnapshot.id)
            updatedDevice1.should.have.property('targetSnapshotId', newSnapshot.id)
            updatedDevice2.should.have.property('targetSnapshotId', newSnapshot.id)

            // check both devices got an update command
            app.comms.devices.sendCommand.callCount.should.equal(2) // both devices got an update request
            const calls = app.comms.devices.sendCommand.getCalls()
            checkDeviceUpdateCall(calls, updatedDevice1, newSnapshot.hashid) // both devices should have been sent an update with the new snapshot
            checkDeviceUpdateCall(calls, updatedDevice2, newSnapshot.hashid) // both devices sh
        })

        it('Clears targetSnapshot for group and devices', async function () {
            const { sid, application, deviceGroup, device1of2, device2of2, snapshot } = await prepare()

            // first lets verify the devices have the snapshot set as target
            device1of2.should.have.property('targetSnapshotId', snapshot.id)
            device1of2.should.have.property('targetSnapshotId', snapshot.id)

            // now call the API to update description only
            const response = await callUpdate(sid, application, deviceGroup, {
                targetSnapshotId: null
            })

            // should succeed
            response.statusCode.should.equal(200)

            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            const updatedDevice1 = await app.db.models.Device.byId(device1of2.hashid)
            const updatedDevice2 = await app.db.models.Device.byId(device2of2.hashid)

            // check the DeviceGroup and devices `targetSnapshotId` were updated
            updatedDeviceGroup.should.have.property('targetSnapshotId', null)
            updatedDevice1.should.have.property('targetSnapshotId', null)
            updatedDevice2.should.have.property('targetSnapshotId', null)

            // check both devices got an update command
            app.comms.devices.sendCommand.callCount.should.equal(2) // both devices got an update request
            const calls = app.comms.devices.sendCommand.getCalls()
            checkDeviceUpdateCall(calls, updatedDevice1, '0') // '0' signifies starter snapshot (default snapshot for application devices)
            checkDeviceUpdateCall(calls, updatedDevice2, '0') // '0' signifies starter snapshot (default snapshot for application devices)
        })

        it('Fails when invalid targetSnapshotId is provided', async function () {
            const { sid, application, deviceGroup, device1of2, device2of2, snapshot } = await prepare()

            // now call the API to update targetSnapshot only
            const response = await callUpdate(sid, application, deviceGroup, {
                targetSnapshotId: 'invalid'
            })

            // should fail
            response.statusCode.should.equal(400)

            const result = response.json()
            result.should.have.property('code', 'invalid_input')

            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            const updatedDevice1 = await app.db.models.Device.byId(device1of2.hashid)
            const updatedDevice2 = await app.db.models.Device.byId(device2of2.hashid)

            // should not have updated the group or devices
            updatedDeviceGroup.should.have.property('targetSnapshotId', snapshot.id)
            updatedDevice1.should.have.property('targetSnapshotId', snapshot.id)
            updatedDevice2.should.have.property('targetSnapshotId', snapshot.id)

            // check no devices got an update command
            app.comms.devices.sendCommand.callCount.should.equal(0) // no devices should have been sent an update
        })

        it('Cannot update a device group with empty name', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') + ' original name', description: 'original desc' }, application)
            deviceGroup.should.have.property('name').and.endWith('original name')
            deviceGroup.should.have.property('description', 'original desc')

            // now call the API to update name and desc
            const response = await callUpdate(sid, application, deviceGroup, {
                name: '',
                description: 'updated description',
                targetSnapshotId: null
            })

            response.statusCode.should.equal(400)

            const result = response.json()
            result.should.have.property('code', 'invalid_name')
            result.should.have.property('error')
        })

        it('Non Owner can not update a device group', async function () {
            const sid = await login('chris', 'ccPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const response = await callUpdate(sid, application, deviceGroup, {
                name: 'updated name',
                description: 'updated description',
                targetSnapshotId: null
            })

            response.statusCode.should.equal(403)

            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error')
        })

        it('Non Member can not update a device group', async function () {
            const sid = await login('dave', 'ddPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const response = await callUpdate(sid, application, deviceGroup, {
                name: 'updated name',
                description: 'updated description',
                targetSnapshotId: null
            })

            response.statusCode.should.be.oneOf([400, 403, 404])
        })
    })

    describe('Update Device Settings', async function () {
        async function prepare () {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') + ' original name', description: 'original desc' }, application)
            deviceGroup.should.have.property('name').and.endWith('original name')
            deviceGroup.should.have.property('description', 'original desc')

            const device1of2 = await factory.createDevice({ name: generateName('device 1') }, TestObjects.BTeam, null, application)
            const device2of2 = await factory.createDevice({ name: generateName('device 2') }, TestObjects.BTeam, null, application)

            // add the devices to the group
            await controller.updateDeviceGroupMembership(deviceGroup, { addDevices: [device1of2.id, device2of2.id] })
            await device1of2.reload({ include: [app.db.models.Team, app.db.models.Application] })
            await device2of2.reload({ include: [app.db.models.Team, app.db.models.Application] })

            // manually set some env-vars on the group
            deviceGroup.settings = {
                env: [{ name: 'ENV1', value: 'group value' }, { name: 'ENV2', value: 'group value' }, { name: 'ENV3', value: 'group value' }]
            }
            await deviceGroup.save()

            // set some env-vars on the devices
            await device1of2.updateSettings({ env: [{ name: 'ENV1', value: 'device 1 value 1' }, { name: 'ENV2', value: 'device 1 value 2' }] })
            await device2of2.updateSettings({ env: [{ name: 'ENV1', value: 'device 2 value 2' }, { name: 'ENV2', value: '' }] })

            const tokens = {
                device1: await device1of2.refreshAuthTokens({ refreshOTC: false }),
                device2: await device2of2.refreshAuthTokens({ refreshOTC: false })
            }

            // reset the mock call history
            app.comms.devices.sendCommand.resetHistory()

            return { sid, tokens, application, deviceGroup, device1of2, device2of2, device1SettingsHash: device1of2.settingsHash, device2SettingsHash: device2of2.settingsHash }
        }
        /**
         * Call the API to update the device group settings
         * e.g http://xxxxx/api/v1/applications/ZdEbXMg9mD/device-groups/50z9ynpNdO/settings
         * @param {*} sid - session id
         * @param {Object} application - application object
         * @param {Object} deviceGroup - device group object
         * @param {{ env: [{name: String, value: String}]}} settings - settings to update
         * @returns {Promise} - the response object
         */
        async function callSettingsUpdate (sid, application, deviceGroup, settings) {
            return app.inject({
                method: 'PUT',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}/settings`,
                cookies: { sid },
                payload: settings
            })
        }
        /** /api/v1/devices/:deviceId/live/settings */
        async function callDeviceAgentLiveSettingsAPI (token, device) {
            return app.inject({
                method: 'GET',
                url: `/api/v1/devices/${device.hashid}/live/settings`,
                headers: {
                    authorization: `Bearer ${token}`,
                    'content-type': 'application/json'
                }
            })
        }

        it('Owner can update a device group settings', async function () {
            const { sid, tokens, application, deviceGroup, device1of2, device2of2, device1SettingsHash, device2SettingsHash } = await prepare()

            const groupEnv = deviceGroup.settings.env.map(e => ({ ...e })) // clone the group env vars before modifying
            groupEnv.find(e => e.name === 'ENV3').value = 'group value updated' // update the value of ENV3

            // reset the mock call history
            app.comms.devices.sendCommand.resetHistory()

            // update an env var that is not overridden by the devices
            const response = await callSettingsUpdate(sid, application, deviceGroup, {
                env: groupEnv
            })
            response.statusCode.should.equal(200) // ensure success

            // check the group env is updated
            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            updatedDeviceGroup.should.have.property('settings').and.be.an.Object()
            updatedDeviceGroup.settings.should.have.property('env').and.be.an.Array()
            const gEnv3 = updatedDeviceGroup.settings.env.find(e => e.name === 'ENV3')
            gEnv3.should.have.property('value', 'group value updated')

            // check device settings hash has changed
            const updatedDevice1 = await app.db.models.Device.byId(device1of2.hashid)
            const updatedDevice2 = await app.db.models.Device.byId(device2of2.hashid)
            updatedDevice1.should.have.property('settingsHash').and.not.equal(device1SettingsHash) // device 1 should have a new settings hash
            updatedDevice2.should.have.property('settingsHash').and.not.equal(device2SettingsHash) // device 2 should have a new settings hash

            // check the settings.env delivered to the devices are merged with the group settings
            const d1SettingsResponse = await callDeviceAgentLiveSettingsAPI(tokens.device1.token, updatedDevice1)
            const d1Settings = d1SettingsResponse.json()
            d1Settings.should.have.property('hash', updatedDevice1.settingsHash)
            d1Settings.should.have.property('env').and.be.an.Object()
            d1Settings.env.should.have.property('ENV1', 'device 1 value 1') // device value should not be changed
            d1Settings.env.should.have.property('ENV2', 'device 1 value 2') // device value should not be changed
            d1Settings.env.should.have.property('ENV3', 'group value updated') // device value should be overridden by the updated group value since ENV3 is not set on the device

            const d2SettingsResponse = await callDeviceAgentLiveSettingsAPI(tokens.device2.token, updatedDevice2)
            const d2Settings = d2SettingsResponse.json()
            d2Settings.should.have.property('hash', updatedDevice2.settingsHash)
            d2Settings.should.have.property('env').and.be.an.Object()
            d2Settings.env.should.have.property('ENV1', 'device 2 value 2') // device value should not be changed
            d2Settings.env.should.have.property('ENV2', 'group value') // device value should be overridden by original group value (since it is empty on the device)
            d2Settings.env.should.have.property('ENV3', 'group value updated') // device value should be overridden by the updated group value since ENV3 is not set on the device

            // check devices got an update request
            app.comms.devices.sendCommand.callCount.should.equal(2)
            const calls = app.comms.devices.sendCommand.getCalls()
            checkDeviceUpdateCall(calls, device1of2)
            checkDeviceUpdateCall(calls, device2of2)
        })

        it('Merges new Group Env Var', async function () {
            const { sid, tokens, application, deviceGroup, device1of2, device2of2, device1SettingsHash, device2SettingsHash } = await prepare()

            const groupEnv = deviceGroup.settings.env.map(e => ({ ...e })) // clone the group env vars before modifying
            groupEnv.push({ name: 'ENV4', value: 'group value 4' }) // add a new env var

            // update an env var that is not overridden by the devices
            const response = await callSettingsUpdate(sid, application, deviceGroup, {
                env: groupEnv
            })
            response.statusCode.should.equal(200) // ensure success

            // check the group env is updated
            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            updatedDeviceGroup.should.have.property('settings').and.be.an.Object()
            updatedDeviceGroup.settings.should.have.property('env').and.be.an.Array()
            updatedDeviceGroup.settings.env.length.should.equal(4)
            const gEnv4 = updatedDeviceGroup.settings.env.find(e => e.name === 'ENV4')
            gEnv4.should.have.property('value', 'group value 4')

            // check device settings hash has changed
            const updatedDevice1 = await app.db.models.Device.byId(device1of2.hashid)
            const updatedDevice2 = await app.db.models.Device.byId(device2of2.hashid)
            updatedDevice1.should.have.property('settingsHash').and.not.equal(device1SettingsHash)
            updatedDevice2.should.have.property('settingsHash').and.not.equal(device2SettingsHash)

            // check the settings.env delivered to the devices are merged with the group settings
            const d1SettingsResponse = await callDeviceAgentLiveSettingsAPI(tokens.device1.token, updatedDevice1)
            const d1Settings = d1SettingsResponse.json()
            d1Settings.should.have.property('hash', updatedDevice1.settingsHash)
            d1Settings.env.should.have.keys('ENV1', 'ENV2', 'ENV3', 'ENV4')
            d1Settings.env.should.have.property('ENV4', 'group value 4') // device should inherit the new group value

            const d2SettingsResponse = await callDeviceAgentLiveSettingsAPI(tokens.device2.token, updatedDevice2)
            const d2Settings = d2SettingsResponse.json()
            d2Settings.should.have.property('hash', updatedDevice2.settingsHash)
            d2Settings.env.should.have.keys('ENV1', 'ENV2', 'ENV3', 'ENV4')
            d2Settings.env.should.have.property('ENV4', 'group value 4') // device should inherit the new group value
        })

        it('Only updates a device settings hash if the group env var change affects the merged settings env', async function () {
            const { sid, application, deviceGroup, device1of2, device2of2, device1SettingsHash, device2SettingsHash } = await prepare()

            // reset the mock call history
            app.comms.devices.sendCommand.resetHistory()

            const groupEnv = deviceGroup.settings.env.map(e => ({ ...e })) // clone the group env vars before modifying
            groupEnv.find(e => e.name === 'ENV2').value = 'device 1 value 2' // set the value of ENV2 to the same as the device 1s current value
            const response = await callSettingsUpdate(sid, application, deviceGroup, {
                env: groupEnv
            })
            response.statusCode.should.equal(200) // ensure success

            // check the group env is updated
            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            updatedDeviceGroup.should.have.property('settings').and.be.an.Object()
            updatedDeviceGroup.settings.should.have.property('env').and.be.an.Array()
            const gEnv2 = updatedDeviceGroup.settings.env.find(e => e.name === 'ENV2')
            gEnv2.should.have.property('value', 'device 1 value 2') // the group value should now be the same as the device 1 value

            // check device 1 settings hash has NOT changed but device 2 has!
            const updatedDevice1 = await app.db.models.Device.byId(device1of2.hashid)
            const updatedDevice2 = await app.db.models.Device.byId(device2of2.hashid)
            updatedDevice1.should.have.property('settingsHash').and.equal(device1SettingsHash)
            updatedDevice2.should.have.property('settingsHash').and.not.equal(device2SettingsHash)

            // check devices got an update request
            app.comms.devices.sendCommand.callCount.should.equal(2)
            const calls = app.comms.devices.sendCommand.getCalls()
            checkDeviceUpdateCall(calls, device1of2)
            checkDeviceUpdateCall(calls, device2of2)
        })

        it('Member can not update a device group settings (403)', async function () {
            const sid = await login('chris', 'ccPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const response = await callSettingsUpdate(sid, application, deviceGroup, {
                env: [{ name: 'ENV1', value: 'new group value' }]
            })

            response.statusCode.should.equal(403)

            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error')
        })

        it('Non Member can not update a device group settings (404)', async function () {
            const sid = await login('dave', 'ddPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const response = await callSettingsUpdate(sid, application, deviceGroup, {
                name: 'updated name',
                description: 'updated description',
                targetSnapshotId: null
            })

            response.statusCode.should.be.equal(404)
        })
    })

    describe('Delete Device Group', async function () {
        it('Owner can delete a device group', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)
        })
        it('Non Owner can not delete a device group', async function () {
            const sid = await login('chris', 'ccPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.equal(403)

            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error')
        })
        it('Non Member can not delete a device group', async function () {
            const sid = await login('dave', 'ddPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid }
            })

            response.statusCode.should.be.oneOf([400, 403, 404])
        })
    })

    describe('Update Device Group Membership', async function () {
        it('Owner can add a device to a new group', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const device = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid },
                payload: {
                    add: [device.hashid]
                }
            })

            response.statusCode.should.equal(200)

            // call the various db accessors and verify the group contains 1 device
            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            updatedDeviceGroup.should.have.property('Devices').and.have.length(1)
            const deviceCount = await updatedDeviceGroup.deviceCount()
            deviceCount.should.equal(1)
            const devices = await updatedDeviceGroup.getDevices()
            devices.should.have.length(1)
        })
        it('Owner can add a device to an existing group', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const device1 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
            const device2 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
            await app.db.controllers.DeviceGroup.updateDeviceGroupMembership(deviceGroup, { addDevices: [device1] })
            // verify the group contains 1 device
            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            updatedDeviceGroup.should.have.property('Devices').and.have.length(1)

            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid },
                payload: {
                    add: [device2.hashid]
                }
            })

            response.statusCode.should.equal(200)
            updatedDeviceGroup.reload()
            const deviceCount = await updatedDeviceGroup.deviceCount()
            deviceCount.should.equal(2)
            const devices = await updatedDeviceGroup.getDevices()
            devices.should.have.length(2)
            const updatedDeviceGroup2 = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            updatedDeviceGroup2.should.have.property('Devices').and.have.length(2)
        })
        it('Owner can remove a device from an existing group', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const device1 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
            const device2 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
            await app.db.controllers.DeviceGroup.updateDeviceGroupMembership(deviceGroup, { addDevices: [device1, device2] })
            // verify the group contains 2 devices
            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            updatedDeviceGroup.should.have.property('Devices').and.have.length(2)

            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid },
                payload: {
                    remove: [device2.hashid]
                }
            })

            response.statusCode.should.equal(200)

            // get the group from DB and verify it contains 1 device (device1)
            const updatedDeviceGroup2 = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            updatedDeviceGroup2.should.have.property('Devices').and.have.length(1)
            updatedDeviceGroup2.Devices[0].should.have.property('id', device1.id)
        })
        it('Owner can add and remove devices from an existing group', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const device1 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
            const device2 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
            const device3 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
            await app.db.controllers.DeviceGroup.updateDeviceGroupMembership(deviceGroup, { addDevices: [device1, device2] })
            // verify the group contains 2 devices
            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            updatedDeviceGroup.should.have.property('Devices').and.have.length(2)

            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid },
                payload: {
                    add: [device3.hashid],
                    remove: [device2.hashid]
                }
            })

            response.statusCode.should.equal(200)

            // get the group from DB and verify it contains 2 devices (device1, device3)
            const updatedDeviceGroup2 = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            updatedDeviceGroup2.should.have.property('Devices').and.have.length(2)
            updatedDeviceGroup2.Devices[0].should.have.property('id', device1.id)
            updatedDeviceGroup2.Devices[1].should.have.property('id', device3.id)
        })

        it('Owner can set the list of devices in existing group', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const device1 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
            const device2 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
            const device3 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
            await app.db.controllers.DeviceGroup.updateDeviceGroupMembership(deviceGroup, { addDevices: [device1, device2] })
            // verify the group contains 2 devices
            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            await updatedDeviceGroup.should.have.property('Devices').and.have.length(2)

            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid },
                payload: {
                    set: [device3.hashid]
                }
            })

            response.statusCode.should.equal(200)

            // get the group from DB and verify it contains 1 device (device3)
            const updatedDeviceGroup2 = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            updatedDeviceGroup2.should.have.property('Devices').and.have.length(1)
            updatedDeviceGroup2.Devices[0].should.have.property('id', device3.id)
        })

        it('Can not add a device to a group in a different team', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = TestObjects.application // BTeam application
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const device = await factory.createDevice({ name: generateName('device') }, TestObjects.ATeam, null, application)

            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid },
                payload: {
                    add: [device.hashid]
                }
            })

            response.statusCode.should.equal(400)
            response.json().should.have.property('code', 'invalid_input')
            // double check the device did not get added to the group
            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            updatedDeviceGroup.should.have.property('Devices').and.have.length(0)
        })
        it('Can not add a device to a group if they belong to different applications', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = TestObjects.application // BTeam application
            const application2 = await factory.createApplication({ name: generateName('application') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const device = await factory.createDevice({ name: generateName('device') }, TestObjects.ATeam, null, application2)

            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid },
                payload: {
                    add: [device.hashid]
                }
            })

            response.statusCode.should.equal(400)
            response.json().should.have.property('code', 'invalid_input')
            // double check the device did not get added to the group
            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup.hashid)
            updatedDeviceGroup.should.have.property('Devices').and.have.length(0)
        })

        it('Can not add a device to a group if already in a group', async function () {
            const sid = await login('bob', 'bbPassword')
            const application = TestObjects.application // BTeam application
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const deviceGroup2 = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const device = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
            await app.db.controllers.DeviceGroup.updateDeviceGroupMembership(deviceGroup, { addDevices: [device] })

            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup2.hashid}`,
                cookies: { sid },
                payload: {
                    add: [device.hashid]
                }
            })

            response.statusCode.should.equal(400)
            response.json().should.have.property('code', 'invalid_input')
            // double check the device did not get added to the group
            const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroup2.hashid)
            updatedDeviceGroup.should.have.property('Devices').and.have.length(0)
        })

        it('Non Owner can not update a device group membership', async function () {
            const sid = await login('chris', 'ccPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const device = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)

            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid },
                payload: {
                    set: [device.hashid]
                }
            })

            response.statusCode.should.equal(403)

            const result = response.json()
            result.should.have.property('code', 'unauthorized')
            result.should.have.property('error')
        })
        it('Non Member can not update a device group membership', async function () {
            const sid = await login('dave', 'ddPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)
            const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
            const device = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)

            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                cookies: { sid },
                payload: {
                    set: [device.hashid]
                }
            })

            response.statusCode.should.be.oneOf([400, 403, 404])
        })
        describe('Update', async function () {
            afterEach(async function () {
                await app.db.models.PipelineStage.destroy({ where: {} })
                await app.db.models.Pipeline.destroy({ where: {} })
                await app.db.models.ProjectSnapshot.destroy({ where: {} })
            })

            it('Add and Remove Devices get an update request', async function () {
                // Premise:
                // Create 4 devices, 1 is unused, 2 of them to be added to the group initially, 1 is added and another is removed
                // Check the 3 devices involved get an update request
                const sid = await login('bob', 'bbPassword')
                const application = TestObjects.application // BTeam application
                const deviceGroup = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)
                const device1of3 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
                const device2of3 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
                const device3of3 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
                // eslint-disable-next-line no-unused-vars
                const nonGroupedDevice = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)

                // add 2 of the devices to the group
                await app.db.controllers.DeviceGroup.updateDeviceGroupMembership(deviceGroup, { addDevices: [device1of3.id, device2of3.id] })

                // reset the mock call history
                app.comms.devices.sendCommand.resetHistory()

                // now add 1 and remove 1
                const response = await app.inject({
                    method: 'PATCH',
                    url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroup.hashid}`,
                    cookies: { sid },
                    payload: {
                        remove: [device1of3.hashid],
                        add: [device3of3.hashid]
                    }
                })

                // should succeed
                response.statusCode.should.equal(200)

                // check 3 devices got an update request
                app.comms.devices.sendCommand.callCount.should.equal(3)
                const devices = await app.db.models.Device.getAll({}, { id: [device1of3.id, device2of3.id, device3of3.id] })
                const d1 = devices.devices.find(d => d.id === device1of3.id)
                const d2 = devices.devices.find(d => d.id === device2of3.id)
                const d3 = devices.devices.find(d => d.id === device3of3.id)
                const calls = app.comms.devices.sendCommand.getCalls()
                checkDeviceUpdateCall(calls, d1)
                checkDeviceUpdateCall(calls, d2)
                checkDeviceUpdateCall(calls, d3)
            })
            it('All Devices removed get an update request and clears DeviceGroup.targetSnapshotId', async function () {
                // Premise:
                // Create 2 devices in a group, add group to a pipeline and deploy a snapshot
                //   (direct db ops: set the targetSnapshotId on the group and the targetSnapshotId on the device group pipeline stage)
                // Test the API by removing both devices leaving the group empty
                // Check the 2 devices involved get an update request
                // Check the DeviceGroup `targetSnapshotId` is cleared (this is cleared because the group is empty)
                const sid = await login('bob', 'bbPassword')
                const application = TestObjects.application // BTeam application
                const instance = TestObjects.instance
                const deviceGroupOne = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)

                const device1of2 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)
                const device2of2 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)

                // add the devices to the group
                await app.db.controllers.DeviceGroup.updateDeviceGroupMembership(deviceGroupOne, { addDevices: [device1of2.id, device2of2.id] })

                // create a pipeline and snapshot
                const pipelineDeviceGroups = await factory.createPipeline({ name: 'new-pipeline-device-groups' }, TestObjects.application)
                const pipelineDeviceGroupsStageOne = await factory.createPipelineStage({ name: 'stage-one-instance', instanceId: instance.id, action: 'use_latest_snapshot' }, pipelineDeviceGroups)
                const pipelineDeviceGroupsStageTwo = await factory.createPipelineStage({ name: 'stage-two-device-group', deviceGroupId: deviceGroupOne.id, source: pipelineDeviceGroupsStageOne.hashid, action: 'use_latest_snapshot' }, pipelineDeviceGroups)
                const snapshot = await factory.createSnapshot({ name: generateName('snapshot') }, instance, TestObjects.bob)

                // deploy the snapshot to the group
                deviceGroupOne.set('targetSnapshotId', snapshot.id)
                await deviceGroupOne.save()
                await app.db.models.PipelineStageDeviceGroup.update({ targetSnapshotId: snapshot.id }, { where: { PipelineStageId: pipelineDeviceGroupsStageTwo.id } })

                // reset the mock call history
                app.comms.devices.sendCommand.resetHistory()

                // now remove both
                const response = await app.inject({
                    method: 'PATCH',
                    url: `/api/v1/applications/${application.hashid}/device-groups/${deviceGroupOne.hashid}`,
                    cookies: { sid },
                    payload: {
                        remove: [device1of2.hashid, device2of2.hashid]
                    }
                })

                // should succeed
                response.statusCode.should.equal(200)

                // check both devices got an update request
                app.comms.devices.sendCommand.callCount.should.equal(2)
                const devices = await app.db.models.Device.getAll({}, { id: [device1of2.id, device2of2.id] })
                const d1 = devices.devices.find(d => d.id === device1of2.id)
                const d2 = devices.devices.find(d => d.id === device2of2.id)
                const calls = app.comms.devices.sendCommand.getCalls()
                checkDeviceUpdateCall(calls, d1)
                checkDeviceUpdateCall(calls, d2)

                // check the DeviceGroup `targetSnapshotId` is cleared
                const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroupOne.hashid)
                updatedDeviceGroup.should.have.property('targetSnapshotId', null)
            })
        })
        describe('Changing a device owner removes the device from the group', function () {
            it('Changing a device owner application removes the device from the group', async function () {
                // Premise:
                // Create a device in a group
                // Change device owner to a different application
                // Check the DeviceGroupId is null
                const sid = await login('bob', 'bbPassword')
                const application = TestObjects.application // BTeam application
                const deviceGroupOne = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)

                const device = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)

                // add the device to the group
                await app.db.controllers.DeviceGroup.updateDeviceGroupMembership(deviceGroupOne, { addDevices: [device.id] })

                // ensure the device is in the group
                const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroupOne.hashid)
                const devices = await updatedDeviceGroup.getDevices()
                devices.should.have.length(1)

                // set the device owner to a different application
                const application2 = await factory.createApplication({ name: generateName('application') }, TestObjects.BTeam)
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.hashid}`,
                    body: {
                        application: application2.hashid
                    },
                    cookies: { sid }
                })

                // should succeed
                response.statusCode.should.equal(200)

                // ensure the device is not in the group
                const updatedDeviceGroup2 = await app.db.models.DeviceGroup.byId(deviceGroupOne.hashid)
                const devices2 = await updatedDeviceGroup2.getDevices()
                devices2.should.have.length(0)

                await device.reload()
                device.should.have.property('DeviceGroupId', null)
            })
            it('Clearing device owner removes the device from the group', async function () {
                // Premise:
                // Create a device in a group
                // Change device owner to a different application
                // Check the DeviceGroupId is null
                const sid = await login('bob', 'bbPassword')
                const application = TestObjects.application // BTeam application
                const deviceGroupOne = await factory.createApplicationDeviceGroup({ name: generateName('device-group') }, application)

                const device = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, application)

                // add the device to the group
                await app.db.controllers.DeviceGroup.updateDeviceGroupMembership(deviceGroupOne, { addDevices: [device.id] })

                // ensure the device is in the group
                const updatedDeviceGroup = await app.db.models.DeviceGroup.byId(deviceGroupOne.hashid)
                const devices = await updatedDeviceGroup.getDevices()
                devices.should.have.length(1)

                await device.reload()
                device.should.have.property('DeviceGroupId', updatedDeviceGroup.id)

                // clear the device owner
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.hashid}`,
                    body: {
                        application: null
                    },
                    cookies: { sid }
                })

                // should succeed
                response.statusCode.should.equal(200)

                // ensure the device is not in the group
                const updatedDeviceGroup2 = await app.db.models.DeviceGroup.byId(deviceGroupOne.hashid)
                const devices2 = await updatedDeviceGroup2.getDevices()
                devices2.should.have.length(0)

                await device.reload()
                device.should.have.property('DeviceGroupId', null)
            })
        })
    })
})
