const crypto = require('crypto')

const sinon = require('sinon')
const should = require('should') // eslint-disable-line
const { encryptCreds, decryptCreds } = require('../../../../lib/credentials')
const setup = require('../setup')

describe('ProjectSnapshot controller', function () {
    // Use standard test data.
    let app
    let projectInstanceCount = 0
    /** @type {import('../../../../lib/TestModelFactory')} */
    let factory

    before(async function () {
        app = await setup({
            limits: {
                instances: 50
            }
        })
        factory = app.factory
        app.TestObjects.application1 = await factory.createApplication({ name: 'application-1' }, app.TestObjects.team1)
    })

    after(async function () {
        await app.close()
    })
    afterEach(async function () {
        await app.db.models.ProjectSnapshot.destroy({ where: {} })
    })
    describe('createSnapshot (instance)', function () {
        async function createProject (application = null, team = null) {
            const options = { name: 'project-' + (projectInstanceCount++), type: '', url: '' }
            if (application) {
                options.ApplicationId = application.id
            }
            if (team) {
                options.TeamId = team.id
            }
            let project = await app.db.models.Project.create(options)
            await project.updateSetting('credentialSecret', crypto.randomBytes(32).toString('hex'))
            // Reload to ensure all models are attached
            project = await app.db.models.Project.byId(project.id)
            await app.db.models.StorageFlow.create({
                flow: JSON.stringify([{ id: '123', type: 'node' }]),
                ProjectId: project.id
            })
            await app.db.models.StorageCredentials.create({
                credentials: JSON.stringify({}),
                ProjectId: project.id
            })
            await app.db.models.StorageSettings.create({
                settings: JSON.stringify({}),
                ProjectId: project.id
            })
            await app.db.models.StorageSession.create({
                sessions: JSON.stringify({}),
                ProjectId: project.id
            })
            return project
        }
        it('creates a snapshot of the current project state', async function () {
            const project = await createProject()
            const user = await app.db.models.User.byUsername('alice')
            const options = {
                name: 'snapshot1',
                description: 'a snapshot'
            }
            const snapshot = await app.db.controllers.ProjectSnapshot.createSnapshot(project, user, options)
            snapshot.should.have.property('name', 'snapshot1')
            snapshot.should.have.property('description', 'a snapshot')
            snapshot.should.have.property('settings')
            // Ensure modules is empty as none has been provided
            snapshot.settings.should.have.only.keys('settings', 'env', 'modules')
            snapshot.settings.modules.should.have.only.keys()
            snapshot.should.have.property('flows')
            snapshot.flows.should.have.only.keys('flows', 'credentials')
            snapshot.flows.flows.should.have.length(1)
            snapshot.flows.flows[0].should.have.property('id', '123')
        })

        it('creates a snapshot using the provided flows/creds/modules', async function () {
            const project = await createProject()
            const credSecret = await project.getCredentialSecret()
            const user = await app.db.models.User.byUsername('alice')
            const options = {
                name: 'snapshot1',
                description: 'a snapshot',
                flows: [{ id: '456', type: 'newNode' }],
                credentials: { 456: { a: 'b' } },
                settings: {
                    modules: {
                        foo: '1.2.3'
                    }
                }
            }
            const snapshot = await app.db.controllers.ProjectSnapshot.createSnapshot(project, user, options)
            snapshot.should.have.property('name', 'snapshot1')
            snapshot.should.have.property('description', 'a snapshot')
            snapshot.should.have.property('description', 'a snapshot')
            snapshot.should.have.property('settings')
            // Ensure modules includes those provided
            snapshot.settings.should.have.only.keys('settings', 'env', 'modules')
            snapshot.settings.modules.should.have.only.keys('foo')

            snapshot.should.have.property('flows')
            snapshot.flows.should.have.only.keys('flows', 'credentials')
            snapshot.flows.flows.should.have.length(1)
            snapshot.flows.flows[0].should.have.property('id', '456')
            snapshot.flows.credentials.should.have.only.keys('$')
            const keyHash = crypto.createHash('sha256').update(credSecret).digest()
            const creds = decryptCreds(keyHash, snapshot.flows.credentials)
            creds.should.have.only.keys('456')
        })

        describe('auto snapshots', function () {
            it('throws an error when instanceAutoSnapshot feature is not enabled', async function () {
                const meta = { user: { id: null } } // simulate node-red situation (i.e. user is null)
                const options = { setAsTarget: false }
                const auditEventType = 'full' // simulate node-red audit event
                await app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot({}, auditEventType, options, meta).should.be.rejectedWith('Instance auto snapshot feature is not available')
            })
            it('throws an error when team type feature flag instanceAutoSnapshot is not enabled', async function () {
                app.config.features.register('instanceAutoSnapshot', true, true)
                const project = { Team: app.TestObjects.team1 }
                const meta = { user: { id: null } } // simulate node-red situation (i.e. user is null)
                const options = { setAsTarget: false }
                const auditEventType = 'full' // simulate node-red audit event
                await app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot(project, auditEventType, options, meta).should.be.rejectedWith('Instance auto snapshot is not enabled for the team')
            })

            describe('with instanceAutoSnapshot feature enabled', function () {
                before(async function () {
                    app.config.features.register('instanceAutoSnapshot', true, true)
                    // Enable instanceAutoSnapshot feature for default team type
                    const teamType = await app.db.models.TeamType.findOne({ where: { id: app.TestObjects.team1.TeamTypeId } })
                    const teamTypeProperties = teamType.properties
                    teamTypeProperties.features.instanceAutoSnapshot = true
                    teamType.properties = teamTypeProperties
                    await teamType.save()
                    app.TestObjects.project1 = await createProject(app.TestObjects.application1, app.TestObjects.team1)
                })

                after(async function () {
                    await app.TestObjects.project1.destroy()
                })

                it('creates an autoSnapshot for a device following a \'full\' deploy', async function () {
                    const project = app.TestObjects.project1
                    const meta = { user: { id: null } } // simulate node-red situation (i.e. user is null)
                    const options = { clean: true, setAsTarget: false }
                    const auditEventType = 'full' // simulate node-red audit event
                    const snapshot = await app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot(project, auditEventType, options, meta)
                    should(snapshot).be.an.Object()
                    snapshot.should.have.a.property('id')
                    snapshot.should.have.a.property('name')
                    snapshot.name.should.match(/Auto Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
                    snapshot.should.have.a.property('description')
                    snapshot.description.should.match(/Instance Auto Snapshot taken following a Full deployment/)
                })

                it('only keeps 10 autoSnapshots for an instance', async function () {
                    const project = app.TestObjects.project1
                    const meta = { user: { id: null } } // simulate node-red situation (i.e. user is null)
                    const options = undefined // use fn defined default options this time
                    // perform 12 autoSnapshots
                    for (let i = 1; i <= 12; i++) {
                        const ss = await app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot(project, 'full', options, meta)
                        await ss.update({ description: `Auto Snapshot - ${i}` }) // update description to make it clear the round-robin cleanup is working
                    }
                    const snapshots = await app.db.models.ProjectSnapshot.findAll({ where: { ProjectId: project.id } })
                    // even though 12 snapshots were created in total, only 10 are kept
                    snapshots.should.have.length(10)
                    snapshots[0].description.should.equal('Auto Snapshot - 3') // note ss 1 & 2 were auto cleaned up
                    snapshots[9].description.should.equal('Auto Snapshot - 12')
                })

                it('keeps 11 autoSnapshots for an instance when one of them is assigned as target snapshot to a device', async function () {
                    const project = app.TestObjects.project1
                    // create a device
                    const application = app.TestObjects.application1
                    const team = app.TestObjects.team1
                    const device1 = await factory.createDevice({ name: 'device 1' }, team, null, application)
                    app.TestObjects.device1 = await app.db.models.Device.byId(device1.id, { include: app.db.models.Team })
                    // create a snapshot and set it as target for device1
                    const snapshot1 = await app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot(project, 'flows', { setAsTarget: true }, { user: { id: null } })
                    await snapshot1.update({ description: 'Auto Snapshot - 1' }) // update description to make it clear the round-robin cleanup is working
                    await device1.update({ targetSnapshotId: snapshot1.id })

                    // create snapshots
                    const meta = { user: { id: null } } // simulate node-red situation (i.e. user is null)
                    const options = { clean: true, setAsTarget: false }
                    for (let i = 2; i <= 13; i++) {
                        const ss = await app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot(project, 'nodes', options, meta)
                        await ss.update({ description: `Auto Snapshot - ${i}` }) // update description to make it clear the round-robin cleanup is working
                    }
                    const snapshots = await app.db.models.ProjectSnapshot.findAll({ where: { ProjectId: project.id }, order: [['id', 'ASC']] })

                    // even though 13 snapshots were created in total, only 11 are kept (1 is in use)
                    snapshots.should.have.length(11)
                    snapshots[0].description.should.equal('Auto Snapshot - 1') // ss 1 is in use & therefore not cleaned up
                    snapshots[1].description.should.equal('Auto Snapshot - 4') // ss 2 & 3 were auto cleaned up
                    snapshots[10].description.should.equal('Auto Snapshot - 13') // this was the last one created
                })
                it('keeps 11 autoSnapshots for an instance when one of them is assigned as the instances target snapshot', async function () {
                    const project = app.TestObjects.project1
                    // create a snapshot and set it as target for this instances devices
                    const snapshot1 = await app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot(project, 'flows', { setAsTarget: true }, { user: { id: null } })
                    await snapshot1.update({ description: 'Auto Snapshot - 101' }) // update description to make it clear the round-robin cleanup is working
                    project.updateSettings({ targetSnapshotId: snapshot1.id })
                    await project.updateSetting('deviceSettings', {
                        targetSnapshot: snapshot1.id
                    })
                    // create snapshots
                    const meta = { user: { id: null } } // simulate node-red situation (i.e. user is null)
                    const options = { clean: true, setAsTarget: false }
                    for (let i = 2; i <= 13; i++) {
                        const ss = await app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot(project, 'nodes', options, meta)
                        await ss.update({ description: `Auto Snapshot - ${i + 100}` }) // update description to make it clear the round-robin cleanup is working
                    }
                    const snapshots = await app.db.models.ProjectSnapshot.findAll({ where: { ProjectId: project.id }, order: [['id', 'ASC']] })

                    // even though 13 snapshots were created in total, 11 are kept (10x auto snapshots + snapshot101 which is in use)
                    snapshots.should.have.length(11)
                    snapshots[0].description.should.equal('Auto Snapshot - 101') // ss 101 is in use & therefore not cleaned up
                    snapshots[1].description.should.equal('Auto Snapshot - 104') // ss 102 & 103 were auto cleaned up
                    snapshots[10].description.should.equal('Auto Snapshot - 113') // this was the last one created
                })
            })
        })
    })
    // describe('exportProject', function () {
    //     it('', async function () {
    //         //
    //     })
    // })
    describe('createSnapshot (device)', function () {
        before(async function () {
            // mock app.comms.devices.sendCommandAwaitReply(device_Team_hashid, device_hashid, ...) so that it returns a valid config
            sinon.stub(app.comms.devices, 'sendCommandAwaitReply').callsFake(async function (teamId, deviceId) {
                const device = await app.db.models.Device.byId(deviceId)
                return {
                    flows: [{ id: '123', type: 'newNode' }],
                    credentials: encryptCreds(
                        crypto.createHash('sha256').update(device.credentialSecret).digest(),
                        { key: 'value' }
                    ),
                    package: {
                        modules: {
                            foo: '1.2.3'
                        }
                    }
                }
            })
        })
        afterEach(async function () {
            app.comms.devices.sendCommandAwaitReply.resetHistory()
        })
        after(async function () {
            app.comms.devices.sendCommandAwaitReply.restore()
        })
        it('creates a snapshot of a device owned by an application', async function () {
            const user = await app.db.models.User.byUsername('alice')
            const options = {
                name: 'snapshot1',
                description: 'a snapshot'
            }
            const application = app.TestObjects.application1
            const team = app.TestObjects.team1
            const device = await factory.createDevice({ name: 'device-1' }, team, null, application)
            // get db Device with all associations
            const dbDevice = await app.db.models.Device.byId(device.id)
            // Ensure device has credentialSecret
            await dbDevice.refreshAuthTokens()

            const snapshot = await app.db.controllers.ProjectSnapshot.createDeviceSnapshot(application, dbDevice, user, options)
            snapshot.should.have.property('name', 'snapshot1')
            snapshot.should.have.property('description', 'a snapshot')
            snapshot.should.have.property('settings')
            // Ensure modules is empty as none has been provided
            snapshot.settings.should.have.only.keys('settings', 'env', 'modules')
            snapshot.settings.modules.should.have.only.keys('foo')
            snapshot.should.have.property('flows')
            snapshot.flows.should.have.only.keys('flows', 'credentials')
            snapshot.flows.flows.should.have.length(1)
            snapshot.flows.flows[0].should.have.property('id', '123')

            const keyHash = crypto.createHash('sha256').update(snapshot.credentialSecret).digest()
            const decrypted = decryptCreds(keyHash, snapshot.flows.credentials)
            decrypted.should.have.property('key', 'value')
        })

        describe('auto snapshots', function () {
            it('throws an error when deviceAutoSnapshot feature is not enabled', async function () {
                const meta = { user: { id: null } } // simulate node-red situation (i.e. user is null)
                const options = { setAsTarget: false }
                const auditEventType = 'full' // simulate node-red audit event
                await app.db.controllers.ProjectSnapshot.doDeviceAutoSnapshot({}, auditEventType, options, meta).should.be.rejectedWith('Device auto snapshot feature is not available')
            })
            it('throws an error when team type feature flag deviceAutoSnapshot is not enabled', async function () {
                app.config.features.register('deviceAutoSnapshot', true, true)
                const application = app.TestObjects.application1
                const team = app.TestObjects.team1
                const device = await factory.createDevice({ name: 'device' }, team, null, application)
                const deviceWithTeam = await app.db.models.Device.byId(device.id, { include: app.db.models.Team })
                const meta = { user: { id: null } } // simulate node-red situation (i.e. user is null)
                const options = { setAsTarget: false }
                const auditEventType = 'full' // simulate node-red audit event
                await app.db.controllers.ProjectSnapshot.doDeviceAutoSnapshot(deviceWithTeam, auditEventType, options, meta).should.be.rejectedWith('Device auto snapshot is not enabled for the team')
            })
            it('throws an error when device setting autoSnapshot is not enabled', async function () {
                app.config.features.register('deviceAutoSnapshot', true, true)
                const application = app.TestObjects.application1
                const team = app.TestObjects.team1
                const device = await factory.createDevice({ name: 'device' }, team, null, application)
                const deviceWithTeam = await app.db.models.Device.byId(device.id, { include: app.db.models.Team })
                await deviceWithTeam.updateSettings({ autoSnapshot: false })
                const meta = { user: { id: null } } // simulate node-red situation (i.e. user is null)
                const options = { setAsTarget: false }
                const auditEventType = 'full' // simulate node-red audit event
                await app.db.controllers.ProjectSnapshot.doDeviceAutoSnapshot(deviceWithTeam, auditEventType, options, meta).should.be.rejectedWith('Device auto snapshot is not enabled')
            })

            describe('with deviceAutoSnapshot feature enabled', function () {
                before(async function () {
                    app.config.features.register('deviceAutoSnapshot', true, true)
                    // Enable deviceAutoSnapshot feature for default team type
                    const defaultTeamType = await app.db.models.TeamType.findOne({ where: { name: 'starter' } })
                    const defaultTeamTypeProperties = defaultTeamType.properties
                    defaultTeamTypeProperties.features.deviceAutoSnapshot = true
                    defaultTeamType.properties = defaultTeamTypeProperties
                    await defaultTeamType.save()

                    // create a device
                    const application = app.TestObjects.application1
                    const team = app.TestObjects.team1
                    const device1 = await factory.createDevice({ name: 'device 1' }, team, null, application)
                    const device2 = await factory.createDevice({ name: 'device 2' }, team, null, application)
                    app.TestObjects.device1 = await app.db.models.Device.byId(device1.id, { include: app.db.models.Team })
                    // Ensure device has credentialSecret
                    await app.TestObjects.device1.refreshAuthTokens()
                    app.TestObjects.device2 = await app.db.models.Device.byId(device2.id, { include: app.db.models.Team })
                    // Ensure device has credentialSecret
                    await app.TestObjects.device2.refreshAuthTokens()
                })

                after(async function () {
                    // delete devices we created in before()
                    await app.TestObjects.device1.destroy()
                    await app.TestObjects.device2.destroy()
                })

                it('creates an autoSnapshot for a device following a \'full\' deploy', async function () {
                    const device = app.TestObjects.device1
                    const meta = { user: { id: null } } // simulate node-red situation (i.e. user is null)
                    const options = { clean: true, setAsTarget: false }
                    const auditEventType = 'full' // simulate node-red audit event
                    const snapshot = await app.db.controllers.ProjectSnapshot.doDeviceAutoSnapshot(device, auditEventType, options, meta)
                    should(snapshot).be.an.Object()
                    snapshot.should.have.a.property('id')
                    snapshot.should.have.a.property('name')
                    snapshot.name.should.match(/Auto Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
                    snapshot.should.have.a.property('description')
                    snapshot.description.should.match(/Device Auto Snapshot taken following a Full deployment/)

                    snapshot.should.have.property('flows')
                    snapshot.flows.should.have.only.keys('flows', 'credentials')
                    snapshot.flows.flows.should.have.length(1)
                    snapshot.flows.flows[0].should.have.property('id', '123')

                    const keyHash = crypto.createHash('sha256').update(snapshot.credentialSecret).digest()
                    const decrypted = decryptCreds(keyHash, snapshot.flows.credentials)
                    decrypted.should.have.property('key', 'value')
                })

                it('only keeps 10 autoSnapshots for a device', async function () {
                    const device = app.TestObjects.device1
                    const meta = { user: { id: null } } // simulate node-red situation (i.e. user is null)
                    const options = undefined // use fn defined default options this time
                    // perform 12 autoSnapshots
                    for (let i = 1; i <= 12; i++) {
                        const ss = await app.db.controllers.ProjectSnapshot.doDeviceAutoSnapshot(device, 'full', options, meta)
                        await ss.update({ description: `Auto Snapshot - ${i}` }) // update description to make it clear the round-robin cleanup is working
                    }
                    const snapshots = await app.db.models.ProjectSnapshot.findAll({ where: { DeviceId: device.id }, order: [['id', 'ASC']] })
                    // even though 12 snapshots were created in total, only 10 are kept
                    snapshots.should.have.length(10)
                    snapshots[0].description.should.equal('Auto Snapshot - 3') // note ss 1 & 2 were auto cleaned up
                    snapshots[9].description.should.equal('Auto Snapshot - 12')
                })

                it('keeps 11 autoSnapshots for a device if one of them is assigned as target snapshot to another device', async function () {
                    const device = app.TestObjects.device1
                    const device2 = app.TestObjects.device2
                    // create a snapshot and set it as target for device2
                    const snapshot1 = await app.db.controllers.ProjectSnapshot.doDeviceAutoSnapshot(device, 'flows', { setAsTarget: true }, { user: { id: null } })
                    await snapshot1.update({ description: 'Auto Snapshot - 1' }) // update description to make it clear the round-robin cleanup is working
                    await device2.update({ targetSnapshotId: snapshot1.id })

                    // create snapshots
                    const meta = { user: { id: null } } // simulate node-red situation (i.e. user is null)
                    const options = { clean: true, setAsTarget: false }
                    for (let i = 2; i <= 13; i++) {
                        const ss = await app.db.controllers.ProjectSnapshot.doDeviceAutoSnapshot(device, 'nodes', options, meta)
                        await ss.update({ description: `Auto Snapshot - ${i}` }) // update description to make it clear the round-robin cleanup is working
                    }
                    const snapshots = await app.db.models.ProjectSnapshot.findAll({ where: { DeviceId: device.id }, order: [['id', 'ASC']] })

                    // even though 13 snapshots were created in total, only 10+1 (1 is in use) are kept
                    snapshots.should.have.length(11)
                    snapshots[0].description.should.equal('Auto Snapshot - 1') // ss 1 is in use & therefore not cleaned up
                    snapshots[1].description.should.equal('Auto Snapshot - 4') // ss 2 & 3 were auto cleaned up
                    snapshots[10].description.should.equal('Auto Snapshot - 13') // this was the last one created
                })
            })
        })
    })
})
