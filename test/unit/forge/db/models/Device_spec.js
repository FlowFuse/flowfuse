const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Device model', function () {
    // Use standard test data.
    let app

    describe('License limits', function () {
        afterEach(async function () {
            await app.close()
        })
        it('Permits overage when licensed', async function () {
            // This license has limit of 2 devices
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A'
            app = await setup({ license })

            ;(await app.db.models.Device.count()).should.equal(0)

            await app.db.models.Device.create({ name: 'D1', type: '', credentialSecret: '' })
            await app.db.models.Device.create({ name: 'D2', type: '', credentialSecret: '' })
            await app.db.models.Device.create({ name: 'D3', type: '', credentialSecret: '' })
            ;(await app.db.models.Device.count()).should.equal(3)
        })

        it('Does not permit overage when unlicensed', async function () {
            app = await setup({ })
            app.license.defaults.instances = 2

            ;(await app.db.models.Device.count()).should.equal(0)

            await app.db.models.Device.create({ name: 'D1', type: '', credentialSecret: '' })
            await app.db.models.Device.create({ name: 'D2', type: '', credentialSecret: '' })
            ;(await app.db.models.Device.count()).should.equal(2)

            try {
                await app.db.models.Device.create({ name: 'D3', type: '', credentialSecret: '' })
                return Promise.reject(new Error('able to create device that exceeds limit'))
            } catch (err) { }

            await app.db.models.Device.destroy({ where: { name: 'D2', type: '', credentialSecret: '' } })
            ;(await app.db.models.Device.count()).should.equal(1)
            await app.db.models.Device.create({ name: 'D3', type: '', credentialSecret: '' })
            ;(await app.db.models.Device.count()).should.equal(2)
        })
    })
    describe('Settings hash', function () {
        before(async function () {
            app = await setup()
        })
        after(async function () {
            await app.close()
        })
        it('is updated when the device name is changed', async function () {
            const device = await app.db.models.Device.create({ name: 'D1', type: 'PI', credentialSecret: '' })
            await device.save()
            const initialSettingsHash = device.settingsHash
            // make a change - change name
            device.name = 'D2'
            await device.save()
            device.settingsHash.should.not.equal(initialSettingsHash)
        })
        it('is updated when the device type is changed', async function () {
            const device = await app.db.models.Device.create({ name: 'D1', type: 'PI', credentialSecret: '' })
            await device.save()
            const initialSettingsHash = device.settingsHash
            // make a change - change type
            device.type = 'RPi'
            await device.save()
            device.settingsHash.should.not.equal(initialSettingsHash)
        })
        it('is updated when the device env vars are changed', async function () {
            const device = await app.db.models.Device.create({ name: 'D1', type: 'PI', credentialSecret: '' })
            const initialSettingsHash = device.settingsHash
            const initialSettings = await device.getAllSettings()
            initialSettings.should.have.a.property('env').and.be.an.Array()
            const initialEnvCount = initialSettings.env.length // count of current env vars (includes platform env vars FF_DEVICE_XX)
            // make a change - add 1 env var
            await device.updateSettings({ env: [{ name: 'ev1', value: 'ev1-val' }] })
            device.settingsHash.should.not.equal(initialSettingsHash)
            const settings = await device.getAllSettings()
            should(settings).be.an.Object().and.have.a.property('env').of.Array()
            settings.env.length.should.equal(initialEnvCount + 1) // count should be +1
        })
        it('is not updated when the device option autoSnapshot is changed', async function () {
            const device = await app.db.models.Device.create({ name: 'D1', type: 'PI', credentialSecret: '' })
            const initialSettingsHash = device.settingsHash
            const initialSettings = await device.getAllSettings()
            initialSettings.should.have.a.property('autoSnapshot', true) // should be true by default
            await device.updateSettings({ autoSnapshot: false })
            device.settingsHash.should.equal(initialSettingsHash)
            const settings = await device.getAllSettings()
            should(settings).be.an.Object().and.have.a.property('autoSnapshot', false)
        })
    })
    describe('Relations', function () {
        let Application, Project, Team, Device
        before(async function () {
            app = await setup()
        })
        after(async function () {
            await app.close()
        })
        beforeEach(async () => {
            // increase license limits
            app.license.defaults.devices = 20
            app.license.defaults.instances = 20;
            ({ Application, Project, Team, Device } = app.db.models)
        })

        // helper functions
        const nameGenerator = (name) => `${name} ${Math.random().toString(36).substring(7)}`
        const newProject = async (applicationId, teamId, projectTypeId, projectStackId, projectTemplateId) => {
            const name = nameGenerator('Test Project')
            const project = await Project.create({
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
        const newApplication = async (teamId) => {
            const name = nameGenerator('Test Application')
            const application = await Application.create({ name, TeamId: teamId })
            return application
        }
        const newTeam = async (teamTypeId = 1) => {
            const name = nameGenerator('Test Team')
            const team = await Team.create({ name, TeamTypeId: teamTypeId })
            return team
        }
        const newDevice = async (teamId, { targetSnapshotId, activeSnapshotId, applicationId, projectId, deviceGroupId } = {}) => {
            const name = nameGenerator('Test Device')
            const device = await Device.create({
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
        const newDeviceGroup = async (applicationId, targetSnapshotId) => {
            const name = nameGenerator('Test Device Group')
            const deviceGroup = await app.db.models.DeviceGroup.create({ name, ApplicationId: applicationId, targetSnapshotId })
            return deviceGroup
        }
        const newSnapshot = async () => {
            const name = nameGenerator('Test Snapshot')
            const snapshot = await app.db.models.ProjectSnapshot.create({ name })
            return snapshot
        }

        // TESTS

        // RELATION: TeamId INTEGER REFERENCES Teams (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should delete Device on Team delete', async () => {
            // Create an application and a project
            const team = await newTeam()
            const device = await newDevice(team.id)
            const did = device.id

            // ensure device has team
            device.should.have.property('TeamId', team.id)

            // Delete the team
            await team.destroy()

            // Reload to get updated data
            const updated = await Device.findByPk(did)
            should(updated).not.be.null()
            updated.should.have.property('TeamId', null)
        })

        // RELATION: TeamId INTEGER REFERENCES Teams (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should update Device.TeamId on Team.id update', async () => {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            // Create an application and a project
            const team = await newTeam()
            const device = await newDevice(team.id)

            // Update team id
            team.id = team.id + 1
            await team.save()

            // Reload project to get updated data
            await device.reload()

            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            device.TeamId.should.equal(team.id)
        })

        // RELATION: targetSnapshotId INTEGER REFERENCES ProjectSnapshots (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should set Device.targetSnapshotId to null when ProjectSnapshot is deleted', async function () {
            // Create an application, device group & snapshot
            const team = app.TestObjects.team1
            const snapshot = await newSnapshot()
            const device = await newDevice(team.id, { targetSnapshotId: snapshot.id })
            const did = device.id

            // verify the snapshot is set
            device.should.have.property('targetSnapshotId', snapshot.id)

            // Delete the snapshot
            await snapshot.destroy()

            // Reload to get updated data
            const updated = await Device.findByPk(did)
            should(updated).not.be.null()
            updated.should.have.property('targetSnapshotId', null)
        })

        // RELATION: targetSnapshotId INTEGER REFERENCES ProjectSnapshots (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should update Device.targetSnapshotId when ProjectSnapshot.id is updated', async function () {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            // Create an application, device group & snapshot
            const team = app.TestObjects.team1
            const snapshot = await newSnapshot()
            const device = await newDevice(team.id, { targetSnapshotId: snapshot.id })
            const did = device.id

            // Update snapshot id
            snapshot.id = snapshot.id + 1
            await snapshot.save()
            await snapshot.reload()

            // Reload to get updated data
            const updated = await Device.findByPk(did)
            should(updated).not.be.null()
            updated.should.have.property('targetSnapshotId', snapshot.id)
        })

        // RELATION: activeSnapshotId INTEGER REFERENCES ProjectSnapshots (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should set Device.activeSnapshotId to null when ProjectSnapshot is deleted', async function () {
            // Create an application, device group & snapshot
            const team = app.TestObjects.team1
            const snapshot = await newSnapshot()
            const device = await newDevice(team.id, { activeSnapshotId: snapshot.id })
            const did = device.id

            // verify the snapshot is set
            device.should.have.property('activeSnapshotId', snapshot.id)

            // Delete the snapshot
            await snapshot.destroy()

            // Reload to get updated data
            const updated = await Device.findByPk(did)
            should(updated).not.be.null()
            updated.should.have.property('activeSnapshotId', null)
        })

        // RELATION: activeSnapshotId INTEGER REFERENCES ProjectSnapshots (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should update Device.activeSnapshotId when ProjectSnapshot.id is updated', async function () {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            // Create an application, device group & snapshot
            const team = app.TestObjects.team1
            const snapshot = await newSnapshot()
            const device = await newDevice(team.id, { activeSnapshotId: snapshot.id })
            const did = device.id

            // Update snapshot id
            snapshot.id = snapshot.id + 1
            await snapshot.save()
            await snapshot.reload()

            // Reload to get updated data
            const updated = await Device.findByPk(did)
            should(updated).not.be.null()
            updated.should.have.property('activeSnapshotId', snapshot.id)
        })

        // RELATION: ApplicationId INTEGER REFERENCES Applications (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should set Device.ApplicationId to null when Application is deleted', async function () {
            // Create an application and a project
            const team = app.TestObjects.team1
            const application = await newApplication(team.id)
            const device = await newDevice(team.id, { applicationId: application.id })
            const did = device.id

            // ensure device has application
            device.should.have.property('ApplicationId', application.id)

            // Delete the application
            await application.destroy()

            // Reload to get updated data
            const updated = await Device.findByPk(did)
            should(updated).not.be.null()
            updated.should.have.property('ApplicationId', null)
        })

        // RELATION: ApplicationId INTEGER REFERENCES Applications (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should update Device.ApplicationId on Application.id update', async () => {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            // Create an application and a project
            const team = app.TestObjects.team1
            const application = await newApplication(team.id)
            const device = await newDevice(team.id, { applicationId: application.id })

            // Update application id
            application.id = application.id + 1
            await application.save()
            await application.reload()

            // Reload project to get updated data
            await device.reload()

            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            device.ApplicationId.should.equal(application.id)
        })

        // RELATION: ProjectId INTEGER REFERENCES Projects (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should set Device.ProjectId to null when Project is deleted', async () => {
            // Create an application and a project
            const team = app.TestObjects.team1
            const application = await newApplication(team.id)
            const project = await newProject(application.id, team.id)
            const device = await newDevice(team.id, { projectId: project.id })
            const did = device.id

            // ensure device has project
            device.should.have.property('ProjectId', project.id)

            // Delete the project
            await project.destroy()

            // Reload to get updated data
            const updated = await Device.findByPk(did)
            should(updated).not.be.null()
            updated.should.have.property('ProjectId', null)
        })

        // RELATION: ProjectId INTEGER REFERENCES Projects (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should update Device.ProjectId on Project.id update', async () => {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            // Create an application and a project
            const team = app.TestObjects.team1
            const application = await newApplication(team.id)
            const project = await newProject(application.id, team.id)
            const device = await newDevice(team.id, { projectId: project.id })

            // Update project id
            project.id = project.id + 1
            await project.save()
            await project.reload()

            // Reload project to get updated data
            await device.reload()

            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            device.ProjectId.should.equal(project.id)
        })

        // RELATION: DeviceGroupId INTEGER REFERENCES DeviceGroups (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should set Device.DeviceGroupId to null when DeviceGroup is deleted', async () => {
            // Create an application and a project
            const team = app.TestObjects.team1
            const application = await newApplication(team.id)
            const deviceGroup = await newDeviceGroup(application.id)
            const device = await newDevice(team.id, { deviceGroupId: deviceGroup.id })
            const did = device.id

            // ensure device has device group
            device.should.have.property('DeviceGroupId', deviceGroup.id)

            // Delete the device group
            await deviceGroup.destroy()

            // Reload to get updated data
            const updated = await Device.findByPk(did)
            should(updated).not.be.null()
            updated.should.have.property('DeviceGroupId', null)
        })

        // RELATION: DeviceGroupId INTEGER REFERENCES DeviceGroups (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should update Device.DeviceGroupId on DeviceGroup.id update', async () => {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            // Create an application and a project
            const team = app.TestObjects.team1
            const application = await newApplication(team.id)
            const deviceGroup = await newDeviceGroup(application.id)
            const device = await newDevice(team.id, { deviceGroupId: deviceGroup.id })

            // Update device group id
            deviceGroup.id = deviceGroup.id + 1
            await deviceGroup.save()
            await deviceGroup.reload()

            // Reload project to get updated data
            await device.reload()

            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            device.DeviceGroupId.should.equal(deviceGroup.id)
        })
    })
})
