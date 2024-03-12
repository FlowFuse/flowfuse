const crypto = require('crypto')

const should = require('should') // eslint-disable-line
const snapshots = require('../../../../forge/services/snapshots')
const Factory = require('../../../lib/TestModelFactory')
const { decryptCreds } = require('../../../lib/credentials')

const setup = require('../ee/setup') // EE setup for Pipeline support

describe('Snapshots Service', function () {
    let APP, USER, TEAM, FACTORY

    before(async function () {
        APP = await setup()

        FACTORY = new Factory(APP)

        USER = APP.user
        TEAM = APP.team
    })

    after(async function () {
        await APP.close()
    })

    describe('generateDeploySnapshotName', function () {
        it('Generates a name for a snapshot to be deployed', async function () {
            const name = snapshots.generateDeploySnapshotName()

            name.should.match(/Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
        })

        it('Generates a name for a snapshot to be deployed based on a source snapshot', async function () {
            const instance = await APP.db.models.Project.create({ name: 'instance-1', type: '', url: '' })

            await TEAM.addProject(instance)

            const snapshot = await snapshots.createSnapshot(APP, instance, USER, {
                name: 'Version 1.1.0',
                setAsTarget: false // no need to deploy to devices of the source
            })

            const name = snapshots.generateDeploySnapshotName(snapshot)

            name.should.match(/Version 1\.1\.0 - Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
        })

        it('Handles a source snapshot already having a date and name by stripping the date and keeping the name', async function () {
            const instance = await APP.db.models.Project.create({ name: 'instance-2', type: '', url: '' })

            await TEAM.addProject(instance)

            const snapshot = await snapshots.createSnapshot(APP, instance, USER, {
                name: 'Version 1.1.0',
                setAsTarget: false // no need to deploy to devices of the source
            })

            const name = snapshots.generateDeploySnapshotName(snapshot)
            name.should.match(/Version 1\.1\.0 - Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)

            const snapshot2 = await snapshots.createSnapshot(APP, instance, USER, {
                name,
                setAsTarget: false // no need to deploy to devices of the source
            })

            const name2 = snapshots.generateDeploySnapshotName(snapshot2)
            name2.should.match(/Version 1\.1\.0 - Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)

            const snapshot3 = await snapshots.createSnapshot(APP, instance, USER, {
                name: name2,
                setAsTarget: false // no need to deploy to devices of the source
            })

            const name3 = snapshots.generateDeploySnapshotName(snapshot3)
            name3.should.match(/Version 1\.1\.0 - Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
        })

        it('Handles a source snapshot having only a date by replacing the name entirely', async function () {
            const instance = await APP.db.models.Project.create({ name: 'instance-3', type: '', url: '' })

            await TEAM.addProject(instance)

            const snapshot = await snapshots.createSnapshot(APP, instance, USER, {
                name: 'Deploy Snapshot - 2023-09-22 11:40:45',
                setAsTarget: false // no need to deploy to devices of the source
            })

            const name = snapshots.generateDeploySnapshotName(snapshot)
            name.should.match(/^Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)

            const snapshot2 = await snapshots.createSnapshot(APP, instance, USER, {
                name,
                setAsTarget: false // no need to deploy to devices of the source
            })

            const name2 = snapshots.generateDeploySnapshotName(snapshot2)
            name2.should.match(/^Deploy Snapshot - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
        })
    })

    describe('generateDeploySnapshotDescription', function () {
        let pipeline, stageOne, stageTwo, stageThree, stageFour

        before(async function () {
            const application = await FACTORY.createApplication({ name: 'application1' }, TEAM)
            const instance = await APP.db.models.Project.create({ name: 'snaphot-instance-1', type: '', url: '', ApplicationId: application.id })
            const instanceTwo = await APP.db.models.Project.create({ name: 'snaphot-instance-2', type: '', url: '', ApplicationId: application.id })
            const instanceThree = await APP.db.models.Project.create({ name: 'snaphot-instance-3', type: '', url: '', ApplicationId: application.id })
            const instanceFlour = await APP.db.models.Project.create({ name: 'snaphot-instance-4', type: '', url: '', ApplicationId: application.id })

            pipeline = await FACTORY.createPipeline({ name: 'pipeline-1' }, application)

            stageOne = await FACTORY.createPipelineStage({ name: 's1', instanceId: instance.id }, pipeline)
            stageTwo = await FACTORY.createPipelineStage({ name: 's2', instanceId: instanceTwo.id }, pipeline)
            stageThree = await FACTORY.createPipelineStage({ name: 's3', instanceId: instanceThree.id }, pipeline)
            stageFour = await FACTORY.createPipelineStage({ name: 's4', instanceId: instanceFlour.id }, pipeline)
        })

        it('Generates a description for a snapshot to be deployed', async function () {
            const description = snapshots.generateDeploySnapshotDescription(stageOne, stageTwo, pipeline)
            description.should.equal('Snapshot created for pipeline deployment from s1 to s2 as part of pipeline pipeline-1')

            const description2 = snapshots.generateDeploySnapshotDescription(stageTwo, stageThree, pipeline)
            description2.should.equal('Snapshot created for pipeline deployment from s2 to s3 as part of pipeline pipeline-1')
        })

        it('Includes previous snapshots description if a source snapshot is set', async function () {
            const snapshot = await snapshots.createSnapshot(APP, APP.instance, USER, {
                name: 'Version 1.1.0',
                description: 'This snapshot was created during our tests',
                setAsTarget: false // no need to deploy to devices of the source
            })

            const description = snapshots.generateDeploySnapshotDescription(stageOne, stageTwo, pipeline, snapshot)
            description.should.match(/Snapshot created for pipeline deployment from s1 to s2 as part of pipeline pipeline-1/)
            description.should.match(/This snapshot was created during our tests/)

            const description2 = snapshots.generateDeploySnapshotDescription(stageTwo, stageThree, pipeline, snapshot)
            description2.should.match(/Snapshot created for pipeline deployment from s2 to s3 as part of pipeline pipeline-1/)
            description2.should.match(/This snapshot was created during our tests/)
        })

        it('Strips autogenerate snapshot descriptions to prevent duplicates', async function () {
            const snapshot = await snapshots.createSnapshot(APP, APP.instance, USER, {
                name: 'Version 1.1.0',
                description: 'Original description',
                setAsTarget: false // no need to deploy to devices of the source
            })

            const description = snapshots.generateDeploySnapshotDescription(stageOne, stageTwo, pipeline, snapshot)
            description.should.match(/Snapshot created for pipeline deployment from s1 to s2 as part of pipeline pipeline-1/)
            description.should.match(/Original description/)

            const snapshot2 = await snapshots.createSnapshot(APP, APP.instance, USER, {
                name: 'Version 1.1.0',
                description,
                setAsTarget: false // no need to deploy to devices of the source
            })

            const description2 = snapshots.generateDeploySnapshotDescription(stageTwo, stageThree, pipeline, snapshot2)
            description2.should.match(/Snapshot created for pipeline deployment from s2 to s3 as part of pipeline pipeline-1/)
            description2.should.not.match(/Snapshot created for pipeline deployment from s1 to s2 as part of pipeline pipeline-1/)
            description2.should.match(/Original description/)

            const snapshot3 = await snapshots.createSnapshot(APP, APP.instance, USER, {
                name: 'Version 1.1.0',
                description,
                setAsTarget: false // no need to deploy to devices of the source
            })

            const description3 = snapshots.generateDeploySnapshotDescription(stageThree, stageFour, pipeline, snapshot3)
            description3.should.match(/Snapshot created for pipeline deployment from s3 to s4 as part of pipeline pipeline-1/)
            description3.should.not.match(/Snapshot created for pipeline deployment from s1 to s2 as part of pipeline pipeline-1/)
            description3.should.not.match(/Snapshot created for pipeline deployment from s2 to s3 as part of pipeline pipeline-1/)
            description3.should.match(/Original description/)
        })
    })

    describe('createSnapshot', function () {
        it('Creates a snapshot of the passed instance', async function () {
            // Flows
            const flows = JSON.stringify([{ id: '456', type: 'newNode' }, { id: '123', type: 'node' }])
            await APP.db.controllers.StorageFlows.updateOrCreateForProject(APP.instance, flows)

            // Credentials
            const credentials = { 456: { a: 'b' } }
            await APP.db.controllers.StorageCredentials.updateOrCreateForProject(APP.instance, credentials)

            // Settings
            await APP.instance.updateSettings({
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

            const snapshot = await snapshots.createSnapshot(APP, APP.instance, USER, {
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
            const deviceOne = await APP.db.models.Device.create({
                name: 'device-1',
                type: 'type-1',
                credentialSecret: '123',
                ProjectId: APP.instance.id
            })

            const deviceTwo = await APP.db.models.Device.create({
                name: 'device-2',
                type: 'type-3',
                credentialSecret: '123',
                ProjectId: APP.instance.id
            })

            const snapshot = await snapshots.createSnapshot(APP, APP.instance, USER, {
                name: 'Test Snapshot',
                description: 'Snapshot description',
                setAsTarget: true
            })

            const deviceSettings = await APP.instance.getSetting('deviceSettings')
            deviceSettings.targetSnapshot.should.equal(snapshot.id)

            await deviceOne.reload()
            deviceOne.targetSnapshotId.should.equal(snapshot.id)

            await deviceTwo.reload()
            deviceTwo.targetSnapshotId.should.equal(snapshot.id)
        })
    })

    describe('copySnapshot', function () {
        it('Creates a copy of the passed snapshot', async function () {
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
                ProjectId: APP.instance.id,
                UserId: USER.id
            }

            const originalSnapshot = await APP.db.models.ProjectSnapshot.create(snapshotProps)

            const newSnapshot = await snapshots.copySnapshot(APP, originalSnapshot, APP.instance, { importSnapshot: true, setAsTarget: false })

            originalSnapshot.id.should.not.equal(newSnapshot.id)

            newSnapshot.name.should.equal('Test Snapshot')
            newSnapshot.description.should.equal('Description')

            // Flows
            newSnapshot.flows.flows[0].should.match({ id: '1', type: 'node-1' })
            newSnapshot.flows.flows.length.should.equal(1)

            // Credentials
            const toInstanceCredentialSecret = await APP.instance.getCredentialSecret()
            const toInstanceCredentialSecretHash = crypto.createHash('sha256').update(toInstanceCredentialSecret).digest()
            const decryptedCredentials = decryptCreds(toInstanceCredentialSecretHash, newSnapshot.flows.credentials)
            decryptedCredentials.should.match({ CRED_ONE: { a: 'b' } })

            // Settings
            newSnapshot.settings.settings.settingOne.should.equal('test')
            newSnapshot.settings.env.ENV_ONE.should.equal('env-1')
            newSnapshot.settings.modules.MODULE_ONE.should.equal('1.2.3')
        })

        it('Imports the snapshot if importSnapshot copying across the environment variables', async function () {
            const instance = await APP.db.models.Project.create({ name: 'instance-5', type: '', url: '' })

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
            const toInstance = await APP.db.models.Project.create({ name: 'instance-6', type: '', url: '' })

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
            const sourceInstance = await APP.db.models.Project.create({ name: 'instance-7', type: '', url: '' })

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
            const toInstance = await APP.db.models.Project.create({ name: 'instance-8', type: '', url: '' })

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
