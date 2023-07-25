const crypto = require('crypto')

const should = require('should') // eslint-disable-line
const snapshots = require('../../../../forge/services/snapshots')
const { decryptCreds } = require('../../../lib/credentials')

const FF_UTIL = require('flowforge-test-utils')

describe('Snapshots Service', function () {
    let APP, USER, TEAM

    before(async function () {
        APP = await FF_UTIL.setupApp()

        USER = await APP.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })

        const defaultTeamType = await APP.db.models.TeamType.findOne()
        TEAM = await APP.db.models.Team.create({ name: 'ATeam', TeamTypeId: defaultTeamType.id })
    })

    after(async function () {
        await APP.close()
    })

    describe('createSnapshot', function () {
        it('Creates a snapshot of the passed instance', async function () {
            const instance = await APP.db.models.Project.create({ name: 'instance-1', type: '', url: '' })

            await TEAM.addProject(instance)

            // Flows
            const flows = JSON.stringify([{ id: '456', type: 'newNode' }, { id: '123', type: 'node' }])
            await APP.db.controllers.StorageFlows.updateOrCreateForProject(instance, flows)

            // Credentials
            const credentials = { 456: { a: 'b' } }
            await APP.db.controllers.StorageCredentials.updateOrCreateForProject(instance, credentials)

            // Settings
            await instance.updateSettings({
                settings: {
                    // as array
                    env: [
                        { name: 'REMOVED_KEY', value: 'old-value-1' }, // should not get changed
                        { name: 'EXISTING_KEY', value: 'old-value-2' } // should not get changed
                    ],
                    modules: {
                        foo: '1.2.3'
                    }
                }
            })

            const snapshot = await snapshots.createSnapshot(APP, instance, USER, {
                name: 'Test Snapshot',
                description: 'Snapshot description',
                setAsTarget: false // no need to deploy to devices of the source
            })

            // Details
            snapshot.name.should.equal('Test Snapshot')
            snapshot.description.should.equal('Snapshot description')

            // Flows
            snapshot.flows.flows[0].should.match({ id: '456', type: 'newNode' })
            snapshot.flows.flows[1].should.match({ id: '123', type: 'node' })
            snapshot.flows.flows.length.should.equal(2)

            // Credentials
            snapshot.flows.credentials.should.match({ 456: { a: 'b' } })

            // Settings
            snapshot.settings.env.REMOVED_KEY.should.equal('old-value-1')
            snapshot.settings.env.EXISTING_KEY.should.equal('old-value-2')
        })

        it('Sets the snapshot as the target if setAsTarget is true', async function () {
            const instance = await APP.db.models.Project.create({ name: 'instance-2', type: '', url: '' })

            await TEAM.addProject(instance)

            instance.reload()

            const deviceOne = await APP.db.models.Device.create({
                name: 'device-1',
                type: 'type-1',
                credentialSecret: '123',
                ProjectId: instance.id
            })

            const deviceTwo = await APP.db.models.Device.create({
                name: 'device-2',
                type: 'type-3',
                credentialSecret: '123',
                ProjectId: instance.id
            })

            const snapshot = await snapshots.createSnapshot(APP, instance, USER, {
                name: 'Test Snapshot',
                description: 'Snapshot description',
                setAsTarget: true
            })

            const deviceSettings = await instance.getSetting('deviceSettings')
            deviceSettings.targetSnapshot.should.equal(snapshot.id)

            await deviceOne.reload()
            deviceOne.targetSnapshotId.should.equal(snapshot.id)

            await deviceTwo.reload()
            deviceTwo.targetSnapshotId.should.equal(snapshot.id)
        })
    })

    describe('copySnapshot', function () {
        it('Creates a copy of the passed snapshot', async function () {
            const instance = await APP.db.models.Project.create({ name: 'instance-3', type: '', url: '' })

            const snapshotProps = {
                name: 'Test Snapshot',
                description: 'Description',
                settings: {
                    settings: { settingOne: 'test' },
                    env: {
                        ENV_ONE: 'env-1'
                    },
                    modules: {
                        MODULE_ONE: '1.2.3'
                    }
                },
                flows: {
                    flows: [{ id: '1', type: 'node-1' }],
                    credentials: { CRED_ONE: { a: 'b' } }
                },
                ProjectId: instance.id,
                UserId: USER.id
            }

            const originalSnapshot = await APP.db.models.ProjectSnapshot.create(snapshotProps)

            const newSnapshot = await snapshots.copySnapshot(APP, originalSnapshot, instance, { importSnapshot: true, setAsTarget: false })

            originalSnapshot.id.should.not.equal(newSnapshot.id)

            newSnapshot.name.should.equal('Test Snapshot')
            newSnapshot.description.should.equal('Description')

            // Flows
            newSnapshot.flows.flows[0].should.match({ id: '1', type: 'node-1' })
            newSnapshot.flows.flows.length.should.equal(1)

            // Credentials
            const toInstanceCredentialSecret = await instance.getCredentialSecret()
            const toInstanceCredentialSecretHash = crypto.createHash('sha256').update(toInstanceCredentialSecret).digest()
            const decryptedCredentials = decryptCreds(toInstanceCredentialSecretHash, newSnapshot.flows.credentials)
            decryptedCredentials.should.match({ CRED_ONE: { a: 'b' } })

            // Settings
            newSnapshot.settings.settings.settingOne.should.equal('test')
            newSnapshot.settings.env.ENV_ONE.should.equal('env-1')
            newSnapshot.settings.modules.MODULE_ONE.should.equal('1.2.3')
        })

        it('Imports the snapshot if importSnapshot copying across the environment variables', async function () {
            const instance = await APP.db.models.Project.create({ name: 'instance-4', type: '', url: '' })

            await TEAM.addProject(instance)

            await instance.updateSettings({
                settings: {
                    // as array
                    env: [
                        { name: 'REMOVED_KEY', value: 'old-value-1' }, // should not get changed
                        { name: 'EXISTING_KEY', value: 'old-value-2' } // should not get changed
                    ]
                }
            })

            const sourceSnapshot = await APP.db.models.ProjectSnapshot.create({
                name: 'Test Snapshot',
                description: 'Test description',
                settings: {
                    env: {
                        EXISTING_KEY: 'new-value-2', // should do nothing
                        NEW_KEY: 'new-value-3' // should be added
                    }
                },
                flows: {},
                UserId: USER.id
            })

            await snapshots.copySnapshot(APP, sourceSnapshot, instance, { importSnapshot: true, setAsTarget: false })

            const instanceSettings = await instance.getSetting('settings')

            instanceSettings.env.map((envVar) => envVar.name).should.match(['REMOVED_KEY', 'EXISTING_KEY', 'NEW_KEY'])

            instanceSettings.env[0].name.should.equal('REMOVED_KEY')
            instanceSettings.env[0].value.should.equal('old-value-1')

            instanceSettings.env[1].name.should.equal('EXISTING_KEY')
            instanceSettings.env[1].value.should.equal('old-value-2')

            instanceSettings.env[2].name.should.equal('NEW_KEY')
            instanceSettings.env[2].value.should.equal('new-value-3')
        })

        it('Sets the snapshot as the target if setAsTarget is true', async function () {
            const toInstance = await APP.db.models.Project.create({ name: 'instance-5', type: '', url: '' })

            await TEAM.addProject(toInstance)
            toInstance.reload()

            const deviceOne = await APP.db.models.Device.create({
                name: 'device-1',
                type: 'type-1',
                credentialSecret: '123',
                ProjectId: toInstance.id
            })

            const deviceTwo = await APP.db.models.Device.create({
                name: 'device-2',
                type: 'type-3',
                credentialSecret: '123',
                ProjectId: toInstance.id
            })

            const sourceSnapshot = await snapshots.createSnapshot(APP, toInstance, USER, {
                name: 'Test Snapshot',
                description: 'Snapshot description',
                setAsTarget: true
            })

            const newSnapshot = await snapshots.copySnapshot(APP, sourceSnapshot, toInstance, { importSnapshot: true, setAsTarget: true })

            const deviceSettings = await toInstance.getSetting('deviceSettings')
            deviceSettings.targetSnapshot.should.equal(newSnapshot.id)

            await deviceOne.reload()
            deviceOne.targetSnapshotId.should.equal(newSnapshot.id)

            await deviceTwo.reload()
            deviceTwo.targetSnapshotId.should.equal(newSnapshot.id)
        })

        it('Re-encrypts any credentials found on the source instance', async function () {
            const sourceInstance = await APP.db.models.Project.create({ name: 'instance-6', type: '', url: '' })

            await TEAM.addProject(sourceInstance)
            sourceInstance.reload()

            // Credentials for source
            const credentials = { 456: { a: 'b' } }
            const credentialsSecret = APP.db.models.Project.generateCredentialSecret()
            await sourceInstance.updateSetting('credentialSecret', credentialsSecret)
            const credentialsEncrypted = APP.db.controllers.Project.exportCredentials(credentials, null, credentialsSecret)

            await APP.db.controllers.StorageCredentials.updateOrCreateForProject(sourceInstance, credentialsEncrypted)

            const sourceSnapshot = await snapshots.createSnapshot(APP, sourceInstance, USER, {
                name: 'Test Snapshot',
                description: 'Snapshot description',
                setAsTarget: false // no need to deploy to devices of the source
            })

            sourceSnapshot.flows.credentials.should.match(credentialsEncrypted)

            // Copy over
            const toInstance = await APP.db.models.Project.create({ name: 'instance-7', type: '', url: '' })

            await TEAM.addProject(toInstance)
            toInstance.reload()

            const newSnapshot = await snapshots.copySnapshot(APP, sourceSnapshot, toInstance, { importSnapshot: true, decryptAndReEncryptCredentialsSecret: credentialsSecret })
            newSnapshot.flows.credentials.should.not.match(credentialsEncrypted) // should have been re-encrypted
            newSnapshot.flows.credentials.should.have.key('$')

            // Set during the copy
            const toInstanceCredentialSecret = await toInstance.getCredentialSecret()
            toInstanceCredentialSecret.should.not.equal(null)

            const toInstanceCredentialSecretHash = crypto.createHash('sha256').update(toInstanceCredentialSecret).digest()

            // Credentials from the flow should match
            const decryptedCredentials = decryptCreds(toInstanceCredentialSecretHash, newSnapshot.flows.credentials)
            decryptedCredentials.should.match(credentials)
        })
    })
})
