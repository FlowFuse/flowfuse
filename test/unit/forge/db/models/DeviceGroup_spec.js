const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('DeviceGroup model', function () {
    // Use standard test data.
    let app
    before(async function () {
        app = await setup()
    })
    after(async function () {
        await app.close()
    })

    describe('Relations', function () {
        let Application, DeviceGroup
        const nameGenerator = (name) => `${name} ${Math.random().toString(36).substring(7)}`

        const newApplication = async (teamId) => {
            const name = nameGenerator('Test Application')
            const application = await Application.create({ name, TeamId: teamId })
            return application
        }
        const newDeviceGroup = async (applicationId, targetSnapshotId) => {
            const name = nameGenerator('Test Device Group')
            const deviceGroup = await DeviceGroup.create({ name, ApplicationId: applicationId, targetSnapshotId })
            return deviceGroup
        }
        const newSnapshot = async () => {
            const name = nameGenerator('Test Snapshot')
            const snapshot = await app.db.models.ProjectSnapshot.create({ name })
            return snapshot
        }
        beforeEach(async () => {
            ({ Application, DeviceGroup } = app.db.models)
        })

        // RELATION: ApplicationId INTEGER REFERENCES Applications (id) ON DELETE CASCADE ON UPDATE CASCADE
        it('should delete DeviceGroup on Application delete', async () => {
            // Create an application and a device group
            const application = await newApplication(app.TestObjects.team1.id)
            const deviceGroup = await newDeviceGroup(application.id)
            const dgid = deviceGroup.id

            // Delete the application
            await application.destroy()

            // Reload to get updated data
            const updated = await DeviceGroup.findOne({ where: { id: dgid } })
            should(updated).be.null()
        })

        // RELATION: ApplicationId INTEGER REFERENCES Applications (id) ON DELETE CASCADE ON UPDATE CASCADE
        it('should update DeviceGroup.ApplicationId on Application.id update', async () => {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            // Create an application and a project
            const application = await newApplication(app.TestObjects.team1.id)
            const deviceGroup = await newDeviceGroup(application.id)

            // Update application id
            application.id = application.id + 1
            await application.save()
            await application.reload()

            // Reload project to get updated data
            await deviceGroup.reload()

            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            deviceGroup.ApplicationId.should.equal(application.id)
        })

        // RELATION: targetSnapshotId INTEGER REFERENCES ProjectSnapshots (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should set DeviceGroup.targetSnapshotId to null when ProjectSnapshot is deleted', async function () {
            // Create an application, device group & snapshot
            const application = await newApplication(app.TestObjects.team1.id)
            const snapshot = await newSnapshot()
            const deviceGroup = await newDeviceGroup(application.id, snapshot.id)
            const dgid = deviceGroup.id

            // verify the snapshot is set
            deviceGroup.should.have.property('targetSnapshotId', snapshot.id)

            // Delete the snapshot
            await snapshot.destroy()

            // Reload to get updated data
            const updated = await DeviceGroup.findByPk(dgid)
            should(updated).not.be.null()
            updated.should.have.property('targetSnapshotId', null)
        })

        // RELATION: targetSnapshotId INTEGER REFERENCES ProjectSnapshots (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should update DeviceGroup.targetSnapshotId when ProjectSnapshot.id is updated', async function () {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            // Create an application, device group & snapshot
            const application = await newApplication(app.TestObjects.team1.id)
            const snapshot = await newSnapshot()
            const deviceGroup = await newDeviceGroup(application.id, snapshot.id)
            const dgid = deviceGroup.id

            // Update snapshot id
            snapshot.id = snapshot.id + 1
            await snapshot.save()
            await snapshot.reload()

            // Reload the device group
            const updated = await DeviceGroup.findByPk(dgid)

            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            updated.targetSnapshotId.should.equal(snapshot.id)
        })
    })
})
