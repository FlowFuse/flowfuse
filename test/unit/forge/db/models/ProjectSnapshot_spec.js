const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('ProjectSnapshot model', function () {
    // Use standard test data.
    let app
    before(async function () {
        app = await setup()
    })
    after(async function () {
        await app.close()
    })
    describe('Relations', function () {
        let ProjectSnapshot
        beforeEach(async () => {
            ({ ProjectSnapshot } = app.db.models)
        })

        // helper functions
        const nameGenerator = (name) => `${name} ${Math.random().toString(36).substring(7)}`
        const newSnapshot = async (projectId, deviceId, userId) => {
            const name = nameGenerator('Test Snapshot')
            const snapshot = await app.db.models.ProjectSnapshot.create({ name, ProjectId: projectId, DeviceId: deviceId, UserId: userId })
            return snapshot
        }
        const newProject = async (applicationId, teamId, projectTypeId, projectStackId, projectTemplateId) => {
            const name = nameGenerator('Test Project')
            const project = await app.db.models.Project.create({
                name,
                safeName: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                type: '',
                url: '',
                ApplicationId: applicationId,
                TeamId: teamId,
                ProjectTypeId: projectTypeId || null,
                ProjectStackId: projectStackId || null,
                ProjectTemplateId: projectTemplateId || null
            })
            return project
        }
        const newDevice = async (teamId, { targetSnapshotId, activeSnapshotId, applicationId, projectId, deviceGroupId } = {}) => {
            const name = nameGenerator('Test Device')
            const device = await app.db.models.Device.create({
                name,
                TeamId: teamId,
                type: 'PI',
                credentialSecret: 'abc',
                state: 'active',
                targetSnapshotId: targetSnapshotId || null,
                activeSnapshotId: activeSnapshotId || null,
                ApplicationId: applicationId || null,
                ProjectId: projectId || null,
                DeviceGroupId: deviceGroupId || null
            })
            return device
        }
        const newUser = async () => {
            const name = nameGenerator('Test User')
            const username = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
            const email = username + '@example.com'
            const user = await app.db.models.User.create({
                name,
                username,
                email,
                password: 'password',
                email_verified: true
            })
            return user
        }

        // TESTS

        // RELATION: ProjectId UUID REFERENCES Projects (id) ON DELETE CASCADE ON UPDATE CASCADE,
        it('should delete ProjectSnapshot when Project is deleted', async function () {
            const project = await newProject(null, app.TestObjects.team1.id)
            const projectSnapshot = await newSnapshot(project.id)
            projectSnapshot.should.have.property('ProjectId', project.id)

            await project.destroy()
            const updated = await ProjectSnapshot.findByPk(projectSnapshot.id)
            should(updated).be.null()
        })

        // RELATION: ProjectId UUID REFERENCES Projects (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should update ProjectSnapshot.ProjectId when Project.id is updated', async function () {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.
            const project = await newProject(null, app.TestObjects.team1.id)
            const projectSnapshot = await newSnapshot(project.id)
            projectSnapshot.should.have.property('ProjectId', project.id)

            project.update({ id: project + '-mod' })
            await project.reload()

            const updated = await ProjectSnapshot.findByPk(projectSnapshot.id)
            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            updated.ProjectId.should.equal(project.id)
        })

        // RELATION: DeviceId INTEGER REFERENCES Devices (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should set ProjectSnapshot.DeviceId to null when Device is deleted', async function () {
            const device = await newDevice(app.TestObjects.team1.id)
            const projectSnapshot = await newSnapshot(null, device.id)
            projectSnapshot.should.have.property('DeviceId', device.id)

            await device.destroy()
            const updated = await ProjectSnapshot.findByPk(projectSnapshot.id)
            updated.should.have.property('DeviceId', null)
        })

        // RELATION: DeviceId INTEGER REFERENCES Devices (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should update ProjectSnapshot.DeviceId when Device.id is updated', async function () {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.
            const device = await newDevice(app.TestObjects.team1.id)
            const projectSnapshot = await newSnapshot(null, device.id)
            projectSnapshot.should.have.property('DeviceId', device.id)

            device.update({ id: device.id + 1 })
            await device.reload()

            const updated = await ProjectSnapshot.findByPk(projectSnapshot.id)
            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            updated.DeviceId.should.equal(device.id)
        })

        // RELATION: UserId INTEGER REFERENCES Users (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should set ProjectSnapshot.UserId to null when User is deleted', async function () {
            const user = await newUser()
            const projectSnapshot = await newSnapshot(null, null, user.id)
            projectSnapshot.should.have.property('UserId', user.id)

            await user.destroy()
            const updated = await ProjectSnapshot.findByPk(projectSnapshot.id)
            updated.should.have.property('UserId', null)
        })

        // RELATION: UserId INTEGER REFERENCES Users (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should update ProjectSnapshot.UserId when User.id is updated', async function () {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.
            const user = await newUser()
            const projectSnapshot = await newSnapshot(null, null, user.id)
            projectSnapshot.should.have.property('UserId', user.id)

            user.update({ id: user.id + 1 })
            await user.reload()

            const updated = await ProjectSnapshot.findByPk(projectSnapshot.id)
            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            updated.UserId.should.equal(user.id)
        })
    })
})
