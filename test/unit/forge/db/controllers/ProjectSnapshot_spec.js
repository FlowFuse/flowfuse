const crypto = require('crypto')

const should = require('should') // eslint-disable-line
const { decryptCreds } = require('../../../../lib/credentials')
const setup = require('../setup')

describe('ProjectSnapshot controller', function () {
    // Use standard test data.
    let app
    let projectInstanceCount = 0

    before(async function () {
        app = await setup()
    })

    after(async function () {
        await app.close()
    })
    afterEach(async function () {
        await app.db.models.ProjectSnapshot.destroy({ where: {} })
    })
    describe('createSnapshot', function () {
        async function createProject () {
            let project = await app.db.models.Project.create({ name: 'project-' + (projectInstanceCount++), type: '', url: '' })
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
    })
    // describe('exportProject', function () {
    //     it('', async function () {
    //         //
    //     })
    // })
})
