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
        // helper functions
        const nameGenerator = (name) => `${name} ${Math.random().toString(36).substring(7)}`

        const newApplication = async (teamId) => {
            const name = nameGenerator('Test Application')
            const application = await app.db.models.Application.create({ name, TeamId: teamId })
            return application
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
        const newDeviceGroup = async (applicationId, targetSnapshotId) => {
            const name = nameGenerator('Test Device Group')
            const deviceGroup = await app.db.models.DeviceGroup.create({ name, ApplicationId: applicationId, targetSnapshotId })
            return deviceGroup
        }

        before(async function () {
            app = await setup()
        })
        after(async function () {
            await app.close()
        })
        beforeEach(async () => {
            // increase license limits
            app.license.defaults.devices = 20
            app.license.defaults.instances = 20
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
        it('is updated when the snapshot changes', async function () {
            // since snapshot affects FF_ ENV VARs, the settings hash should change due to a different snapshot id/name
            const device = await newDevice(app.TestObjects.team1.id)
            const initialSettingsHash = device.settingsHash
            const snapshotName = 'Test Snapshot @ ' + new Date().toISOString()
            const snapshot = await app.db.models.ProjectSnapshot.create({ name: snapshotName, settings: { env: [{ name: 'SNAPSHOT_ENV_VAR', value: 'value' }] } })

            // make a change - set snapshot
            device.targetSnapshotId = snapshot.id
            await device.save()
            await device.reload()
            device.settingsHash.should.not.equal(initialSettingsHash)
        })
        it('is updated when a device is added to a device group which has ENV vars', async function () {
            // Adding a device to a group which has ENV VARs that affect the device should change the settings hash
            const application = await newApplication(app.TestObjects.team1.id)
            const device = await newDevice(app.TestObjects.team1.id, { applicationId: application.id })
            const deviceGroup = await newDeviceGroup(application.id)
            deviceGroup.settings = { env: [{ name: 'GROUP_ENV_VAR', value: 'value' }] }
            await deviceGroup.save()
            const initialSettingsHash = device.settingsHash

            // make a change - set device group
            device.DeviceGroupId = deviceGroup.id
            await device.save()
            await device.reload()
            device.settingsHash.should.not.equal(initialSettingsHash)
        })
        it('is not updated when a device is added to a device group which does not have ENV vars', async function () {
            // since device group _can_ affect FF_ ENV VARs, the settings hash will change when a group has ENV VARs that affect the device
            // however, if the group has no ENV VARs, the settings hash should not change
            const application = await newApplication(app.TestObjects.team1.id)
            const device = await newDevice(app.TestObjects.team1.id, { applicationId: application.id })
            const deviceGroup = await newDeviceGroup(application.id)
            const initialSettingsHash = device.settingsHash

            // make a change - set device group
            device.DeviceGroupId = deviceGroup.id
            await device.save()
            await device.reload()
            device.settingsHash.should.equal(initialSettingsHash)
        })
        it('is updated when the devices group gets a new ENV value applied', async function () {
            // since device group _can_ affect FF_ ENV VARs, the settings hash will change when a group has ENV VARs that affect the device
            const application = await newApplication(app.TestObjects.team1.id)
            const device = await newDevice(app.TestObjects.team1.id, { applicationId: application.id })
            const deviceGroup = await newDeviceGroup(application.id)
            deviceGroup.settings = { env: [{ name: 'GROUP_ENV_VAR', value: 'value' }] }
            await deviceGroup.save()
            device.DeviceGroupId = deviceGroup.id
            await device.save()
            await device.reload()
            const initialSettingsHash = device.settingsHash

            // make a change - set device group env
            deviceGroup.settings = { env: [{ name: 'GROUP_ENV_VAR', value: 'new-value' }] }
            await deviceGroup.save()

            await device.reload()
            device.settingsHash.should.not.equal(initialSettingsHash)
        })
        it('is not updated when the devices group gets a new ENV value that does not affect the device', async function () {
            // since device group _can_ affect FF_ ENV VARs, the settings hash will change when a group has ENV VARs that affect the device
            const application = await newApplication(app.TestObjects.team1.id)
            const device = await newDevice(app.TestObjects.team1.id, { applicationId: application.id })
            device.updateSettings({ env: [{ name: 'DEVICE_ENV_VAR', value: 'device value' }] })
            const deviceGroup = await newDeviceGroup(application.id)
            device.DeviceGroupId = deviceGroup.id
            await device.save()
            const initialSettingsHash = device.settingsHash

            // make a change - set device group env
            deviceGroup.settings = { env: [{ name: 'DEVICE_ENV_VAR', value: 'group value' }] } // this env is superseded by the device env
            await deviceGroup.save()

            await device.reload()
            device.settingsHash.should.equal(initialSettingsHash)
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
    describe('Counting Devices by State', function () {
        before(async function () {
            app = await setup()
        })
        after(async function () {
            await app.close()
        })
        beforeEach(async () => {
            // increase license limits
            app.license.defaults.devices = 20
            app.license.defaults.instances = 20
        })

        it('should count devices grouped by state with valid states and a string TeamId', async function () {
            const states = ['running', 'stopped']

            const team = await app.db.models.Team.create({ name: 'Test Team', TeamTypeId: 1 })
            const numericTeamId = team.id

            await app.db.models.Device.create({ name: 'p1', credentialSecret: 'abc', type: 'P1', state: 'running', TeamId: numericTeamId })
            await app.db.models.Device.create({ name: 'p2', credentialSecret: 'abc', type: 'P1', state: 'stopped', TeamId: numericTeamId })
            await app.db.models.Device.create({ name: 'p3', credentialSecret: 'abc', type: 'P1', state: 'running', TeamId: numericTeamId })

            const result = await app.db.models.Device.countByState(states, team.id)

            result.should.deepEqual([
                { state: 'running', count: 2 },
                { state: 'stopped', count: 1 }
            ])
        })

        it('should count devices with no state filter (only by TeamId)', async function () {
            const teamId = app.TestObjects.team1.id

            await app.db.models.Device.create({ name: 'p4', credentialSecret: 'abc', type: 'P1', state: 'idle', TeamId: teamId })
            await app.db.models.Device.create({ name: 'p5', credentialSecret: 'abc', type: 'P1', state: 'running', TeamId: teamId })

            const result = await app.db.models.Device.countByState([], teamId)

            result.should.deepEqual([
                { state: 'idle', count: 1 },
                { state: 'running', count: 1 }
            ])
        })

        it('should return an empty result when no devices match the given states', async function () {
            const states = ['non-existent-state']
            const teamId = app.TestObjects.team1.id

            const result = await app.db.models.Device.countByState(states, teamId)

            result.should.eql([])
        })

        it('should handle errors gracefully when an invalid teamId is provided', async function () {
            const teamId = 'invalidTeamId'

            try {
                await app.db.models.Device.countByState(['running'], teamId)
                should.fail('Expected an error to be thrown')
            } catch (err) {
                err.should.be.an.Error()
                err.message.should.match(/invalid.+teamId/i)
            }
        })

        it('should be able to return results when using a hashed team id', async function () {
            // Mock states and team ID
            const states = ['running', 'stopped']

            const team = await app.db.models.Team.create({ name: 'Another Test Team', TeamTypeId: 1 })
            const numericTeamId = team.id

            await app.db.models.Device.create({ name: 'p1', credentialSecret: 'abc', type: 'P1', state: 'running', TeamId: numericTeamId })
            await app.db.models.Device.create({ name: 'p2', credentialSecret: 'abc', type: 'P1', state: 'stopped', TeamId: numericTeamId })
            await app.db.models.Device.create({ name: 'p3', credentialSecret: 'abc', type: 'P1', state: 'running', TeamId: numericTeamId })

            const hashedTeamId = app.db.models.Team.encodeHashid(team.id)

            const result = await app.db.models.Device.countByState(states, hashedTeamId)

            result.should.deepEqual([
                { state: 'running', count: 2 },
                { state: 'stopped', count: 1 }
            ])
            await team.destroy()
        })

        it('should handle invalid string ApplicationId', async () => {
            const team = await app.db.models.Team.create({ name: 'Team Test', TeamTypeId: 1 })
            const hashedTeamId = app.db.models.Team.encodeHashid(team.id)

            try {
                await app.db.models.Device.countByState([], hashedTeamId, 'invalid-application-id')
                should.fail('Expected an error to be thrown')
            } catch (err) {
                err.should.be.an.Error()
                err.message.should.equal('Invalid ApplicationId')
            }
            await team.destroy()
        })

        it('should filter by application and statuses', async () => {
            app.license.defaults.devices = 8 // override default

            const states = ['running', 'stopped']

            const team = await app.db.models.Team.create({ name: 'Team Test', TeamTypeId: 1 })
            const numericTeamId = team.id

            const application1 = await app.db.models.Application.create({ name: 'App 1', TeamId: numericTeamId })
            const numericApp1Id = application1.id

            const application2 = await app.db.models.Application.create({ name: 'App 2', TeamId: numericTeamId })
            const numericApp2Id = application2.id

            const device1 = await app.db.models.Device.create({ name: 'p1', credentialSecret: 'abc', type: 'P1', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp1Id })
            const device2 = await app.db.models.Device.create({ name: 'p2', credentialSecret: 'abc', type: 'P1', state: 'stopped', TeamId: numericTeamId, ApplicationId: numericApp1Id })
            const device3 = await app.db.models.Device.create({ name: 'p3', credentialSecret: 'abc', type: 'P1', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp1Id })
            const device4 = await app.db.models.Device.create({ name: 'p4', credentialSecret: 'abc', type: 'P1', state: 'suspended', TeamId: numericTeamId, ApplicationId: numericApp1Id })

            const device5 = await app.db.models.Device.create({ name: 'p5', credentialSecret: 'abc', type: 'P1', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp2Id })
            const device6 = await app.db.models.Device.create({ name: 'p6', credentialSecret: 'abc', type: 'P1', state: 'stopped', TeamId: numericTeamId, ApplicationId: numericApp2Id })
            const device7 = await app.db.models.Device.create({ name: 'p7', credentialSecret: 'abc', type: 'P1', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp2Id })
            const device8 = await app.db.models.Device.create({ name: 'p8', credentialSecret: 'abc', type: 'P1', state: 'suspended', TeamId: numericTeamId, ApplicationId: numericApp2Id })

            const hashedTeamId = app.db.models.Team.encodeHashid(team.id)
            const hashedAppId = app.db.models.Application.encodeHashid(application1.id)

            const result = await app.db.models.Device.countByState(states, hashedTeamId, hashedAppId)

            result.should.deepEqual([
                { state: 'running', count: 2 },
                { state: 'stopped', count: 1 }
            ])

            await device1.destroy()
            await device2.destroy()
            await device3.destroy()
            await device4.destroy()
            await device5.destroy()
            await device6.destroy()
            await device7.destroy()
            await device8.destroy()
            await application1.destroy()
            await application2.destroy()
            await team.destroy()
        })

        it('should filter by application and no statuses', async () => {
            app.license.defaults.devices = 8 // override default

            const states = []

            const team = await app.db.models.Team.create({ name: 'Team Test', TeamTypeId: 1 })
            const numericTeamId = team.id

            const application1 = await app.db.models.Application.create({ name: 'App 1', TeamId: numericTeamId })
            const numericApp1Id = application1.id

            const application2 = await app.db.models.Application.create({ name: 'App 2', TeamId: numericTeamId })
            const numericApp2Id = application2.id

            const device1 = await app.db.models.Device.create({ name: 'p1', credentialSecret: 'abc', type: 'P1', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp1Id })
            const device2 = await app.db.models.Device.create({ name: 'p2', credentialSecret: 'abc', type: 'P1', state: 'stopped', TeamId: numericTeamId, ApplicationId: numericApp1Id })
            const device3 = await app.db.models.Device.create({ name: 'p3', credentialSecret: 'abc', type: 'P1', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp1Id })
            const device4 = await app.db.models.Device.create({ name: 'p4', credentialSecret: 'abc', type: 'P1', state: 'suspended', TeamId: numericTeamId, ApplicationId: numericApp1Id })

            const device5 = await app.db.models.Device.create({ name: 'p5', credentialSecret: 'abc', type: 'P1', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp2Id })
            const device6 = await app.db.models.Device.create({ name: 'p6', credentialSecret: 'abc', type: 'P1', state: 'stopped', TeamId: numericTeamId, ApplicationId: numericApp2Id })
            const device7 = await app.db.models.Device.create({ name: 'p7', credentialSecret: 'abc', type: 'P1', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp2Id })
            const device8 = await app.db.models.Device.create({ name: 'p8', credentialSecret: 'abc', type: 'P1', state: 'suspended', TeamId: numericTeamId, ApplicationId: numericApp2Id })

            const hashedTeamId = app.db.models.Team.encodeHashid(team.id)
            const hashedAppId = app.db.models.Application.encodeHashid(application1.id)

            const result = await app.db.models.Device.countByState(states, hashedTeamId, hashedAppId)

            result.should.deepEqual([
                { count: 2, state: 'running' },
                { count: 1, state: 'stopped' },
                { count: 1, state: 'suspended' }
            ])

            await device1.destroy()
            await device2.destroy()
            await device3.destroy()
            await device4.destroy()
            await device5.destroy()
            await device6.destroy()
            await device7.destroy()
            await device8.destroy()
            application1.destroy()
            application2.destroy()
            await team.destroy()
        })
    })
})
