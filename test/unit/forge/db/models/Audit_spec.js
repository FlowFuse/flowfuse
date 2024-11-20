const { Op } = require('sequelize')
const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Audit model', function () {
    let app
    let Application, AuditLog, Device, Project

    const TestObjects = {
        defaultTeamType: null,
        userAlice: null,
        userBob: null,
        team1: null,
        team2: null,
        team3: null,
        teamA: null,

        team1_app1: null,
        team1_app1_proj1: null,
        team1_app1_proj2: null,
        team1_app1_proj1_device1: null,
        team1_app1_proj1_device2: null,
        team1_app1_proj2_device1: null,
        team1_app1_proj2_device2: null,
        team1_app1_device1: null,
        team1_app1_device2: null,

        team1_app2: null,
        team1_app2_proj1: null,
        team1_app2_proj2: null,
        team1_app2_proj1_device1: null,
        team1_app2_proj1_device2: null,
        team1_app2_proj2_device1: null,
        team1_app2_proj2_device2: null,
        team1_app2_device1: null,
        team1_app2_device2: null,

        // Additional team, application, project, and device for verifying correct scoping
        team2_app1: null,
        team2_app1_proj1: null,
        team2_app1_proj1_device1: null,
        team2_app1_device1: null
    }

    const nameGenerator = (name) => `${name} ${Math.random().toString(36).substring(7)}`
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

    const assertEntitiesInArray = (clause, entityType, entityIds) => {
        clause.should.only.have.keys('entityType', 'entityId')
        clause.should.have.property('entityType', entityType)
        clause.entityId.should.have.property(Op.in).which.is.an.Array()
        clause.entityId[Op.in].map(String).should.deepEqual(entityIds.map(String))
    }
    const assertEntityEquals = (clause, entityType, entityId) => {
        clause.should.only.have.keys('entityType', 'entityId')
        clause.should.have.property('entityType', entityType)
        clause.entityId.toString().should.deepEqual(entityId.toString())
    }

    const assertAssociations = (associations, expected) => {
        for (const key in expected) {
            associations.should.have.property(key)
            associations[key].should.be.an.Array().and.have.length(expected[key].length)
            associations[key].map(e => e.id?.toString()).should.deepEqual(expected[key].map(String))
        }
    }

    before(async function () {
        app = await setup()
        app.license.defaults.instances = 20; // override default
        ({ Application, AuditLog, Device, Project } = app.db.models)

        TestObjects.defaultTeamType = app.TestObjects.defaultTeamType
        TestObjects.userAlice = app.TestObjects.userAlice
        TestObjects.userBob = app.TestObjects.userBob
        TestObjects.team1 = app.TestObjects.team1
        TestObjects.team2 = app.TestObjects.team2
        TestObjects.team3 = app.TestObjects.team3

        TestObjects.team1_app1 = await newApplication(TestObjects.team1.id)
        TestObjects.team1_app1_proj1 = await newProject(TestObjects.team1_app1.id, TestObjects.team1.id)
        TestObjects.team1_app1_proj2 = await newProject(TestObjects.team1_app1.id, TestObjects.team1.id)
        TestObjects.team1_app1_proj1_device1 = await newDevice(TestObjects.team1.id, { projectId: TestObjects.team1_app1_proj1.id })
        TestObjects.team1_app1_proj1_device2 = await newDevice(TestObjects.team1.id, { projectId: TestObjects.team1_app1_proj1.id })
        TestObjects.team1_app1_proj2_device1 = await newDevice(TestObjects.team1.id, { projectId: TestObjects.team1_app1_proj2.id })
        TestObjects.team1_app1_proj2_device2 = await newDevice(TestObjects.team1.id, { projectId: TestObjects.team1_app1_proj2.id })
        TestObjects.team1_app1_device1 = await newDevice(TestObjects.team1.id, { applicationId: TestObjects.team1_app1.id })
        TestObjects.team1_app1_device2 = await newDevice(TestObjects.team1.id, { applicationId: TestObjects.team1_app1.id })

        TestObjects.team1_app2 = await newApplication(TestObjects.team1.id)
        TestObjects.team1_app2_proj1 = await newProject(TestObjects.team1_app2.id, TestObjects.team1.id)
        TestObjects.team1_app2_proj2 = await newProject(TestObjects.team1_app2.id, TestObjects.team1.id)
        TestObjects.team1_app2_proj1_device1 = await newDevice(TestObjects.team1.id, { projectId: TestObjects.team1_app2_proj1.id })
        TestObjects.team1_app2_proj1_device2 = await newDevice(TestObjects.team1.id, { projectId: TestObjects.team1_app2_proj1.id })
        TestObjects.team1_app2_proj2_device1 = await newDevice(TestObjects.team1.id, { projectId: TestObjects.team1_app2_proj2.id })
        TestObjects.team1_app2_proj2_device2 = await newDevice(TestObjects.team1.id, { projectId: TestObjects.team1_app2_proj2.id })
        TestObjects.team1_app2_device1 = await newDevice(TestObjects.team1.id, { applicationId: TestObjects.team1_app2.id })
        TestObjects.team1_app2_device2 = await newDevice(TestObjects.team1.id, { applicationId: TestObjects.team1_app2.id })

        // generate team 2 items - we can use the (lack of) presence of these to test that the scoping is working correctly
        TestObjects.team2_app1 = await newApplication(TestObjects.team2.id)
        TestObjects.team2_app1_proj1 = await newProject(TestObjects.team2_app1.id, TestObjects.team2.id)
        TestObjects.team2_app1_proj1_device1 = await newDevice(TestObjects.team2.id, { projectId: TestObjects.team2_app1_proj1.id })
        TestObjects.team2_app1_device1 = await newDevice(TestObjects.team2.id, { applicationId: TestObjects.team2_app1.id })
    })
    after(async function () {
        await app.close()
    })

    describe('static methods', function () {
        describe('getFilterAndAssociations', function () {
            describe('for Team', function () {
                it('should return clause scoped for team only', async () => {
                    const team = TestObjects.team1
                    const pagination = { }
                    const { filter, associations } = await AuditLog.getFilterAndAssociations('team', team.id, pagination)
                    assertEntityEquals(filter, 'team', team.id)
                    assertAssociations(associations, {
                        applications: [],
                        instances: [],
                        devices: []
                    })
                })
                it('should return filter scoped for applications only', async () => {
                    const team = TestObjects.team1
                    const expectedApps = [TestObjects.team1_app1.id, TestObjects.team1_app2.id]
                    const pagination = { scope: 'application' }
                    const { filter, associations } = await AuditLog.getFilterAndAssociations('team', team.id, pagination)
                    assertEntitiesInArray(filter, 'application', expectedApps)
                    assertAssociations(associations, {
                        applications: expectedApps,
                        instances: [],
                        devices: []
                    })
                })
                it('should return filter scoped for projects only', async () => {
                    const team = TestObjects.team1
                    const expectedProjects = [
                        TestObjects.team1_app1_proj1.id,
                        TestObjects.team1_app1_proj2.id,
                        TestObjects.team1_app2_proj1.id,
                        TestObjects.team1_app2_proj2.id
                    ]
                    const pagination = { scope: 'project' }
                    const { filter, associations } = await AuditLog.getFilterAndAssociations('team', team.id, pagination)
                    assertEntitiesInArray(filter, 'project', expectedProjects)
                    assertAssociations(associations, {
                        applications: [],
                        instances: expectedProjects,
                        devices: []
                    })
                })
                it('should return filter scoped for devices only', async () => {
                    const team = TestObjects.team1
                    const expectedDevices = [
                        TestObjects.team1_app1_proj1_device1.id,
                        TestObjects.team1_app1_proj1_device2.id,
                        TestObjects.team1_app1_proj2_device1.id,
                        TestObjects.team1_app1_proj2_device2.id,
                        TestObjects.team1_app1_device1.id,
                        TestObjects.team1_app1_device2.id,
                        TestObjects.team1_app2_proj1_device1.id,
                        TestObjects.team1_app2_proj1_device2.id,
                        TestObjects.team1_app2_proj2_device1.id,
                        TestObjects.team1_app2_proj2_device2.id,
                        TestObjects.team1_app2_device1.id,
                        TestObjects.team1_app2_device2.id
                    ]
                    const pagination = { scope: 'device' }
                    const { filter, associations } = await AuditLog.getFilterAndAssociations('team', team.id, pagination)
                    assertEntitiesInArray(filter, 'device', expectedDevices)
                    assertAssociations(associations, {
                        applications: [],
                        instances: [],
                        devices: expectedDevices
                    })
                })
                it('should return filter scoped for team and all children', async () => {
                    const team = TestObjects.team1
                    const allTeam1AppIds = [TestObjects.team1_app1.id, TestObjects.team1_app2.id]
                    const allTeam1ProjectIds = [
                        TestObjects.team1_app1_proj1.id,
                        TestObjects.team1_app1_proj2.id,
                        TestObjects.team1_app2_proj1.id,
                        TestObjects.team1_app2_proj2.id
                    ]
                    const allTeam1DeviceIds = [
                        TestObjects.team1_app1_proj1_device1.id,
                        TestObjects.team1_app1_proj1_device2.id,
                        TestObjects.team1_app1_proj2_device1.id,
                        TestObjects.team1_app1_proj2_device2.id,
                        TestObjects.team1_app1_device1.id,
                        TestObjects.team1_app1_device2.id,
                        TestObjects.team1_app2_proj1_device1.id,
                        TestObjects.team1_app2_proj1_device2.id,
                        TestObjects.team1_app2_proj2_device1.id,
                        TestObjects.team1_app2_proj2_device2.id,
                        TestObjects.team1_app2_device1.id,
                        TestObjects.team1_app2_device2.id
                    ]
                    const pagination = { scope: 'team', includeChildren: true }
                    const { filter, associations } = await AuditLog.getFilterAndAssociations('team', team.id, pagination)
                    filter.should.only.have.property(Op.or)
                    filter[Op.or].should.be.an.Array().and.have.length(4) // team, application, project, device
                    assertEntityEquals(filter[Op.or][0], 'team', team.id)
                    assertEntitiesInArray(filter[Op.or][1], 'application', allTeam1AppIds)
                    assertEntitiesInArray(filter[Op.or][2], 'project', allTeam1ProjectIds)
                    assertEntitiesInArray(filter[Op.or][3], 'device', allTeam1DeviceIds)
                    assertAssociations(associations, {
                        applications: allTeam1AppIds,
                        instances: allTeam1ProjectIds,
                        devices: allTeam1DeviceIds
                    })
                })
                it('should return filter scoped for applications and all children', async () => {
                    const team = TestObjects.team1
                    const allTeam1AppIds = [TestObjects.team1_app1.id, TestObjects.team1_app2.id]
                    const allTeam1ProjectIds = [
                        TestObjects.team1_app1_proj1.id,
                        TestObjects.team1_app1_proj2.id,
                        TestObjects.team1_app2_proj1.id,
                        TestObjects.team1_app2_proj2.id
                    ]
                    const allTeam1DeviceIds = [
                        TestObjects.team1_app1_proj1_device1.id,
                        TestObjects.team1_app1_proj1_device2.id,
                        TestObjects.team1_app1_proj2_device1.id,
                        TestObjects.team1_app1_proj2_device2.id,
                        TestObjects.team1_app1_device1.id,
                        TestObjects.team1_app1_device2.id,
                        TestObjects.team1_app2_proj1_device1.id,
                        TestObjects.team1_app2_proj1_device2.id,
                        TestObjects.team1_app2_proj2_device1.id,
                        TestObjects.team1_app2_proj2_device2.id,
                        TestObjects.team1_app2_device1.id,
                        TestObjects.team1_app2_device2.id
                    ]
                    const pagination = { scope: 'application', includeChildren: true }
                    const { filter, associations } = await AuditLog.getFilterAndAssociations('team', team.id, pagination)
                    filter.should.only.have.property(Op.or)
                    filter[Op.or].should.be.an.Array().and.have.length(3) // application, project, device
                    assertEntitiesInArray(filter[Op.or][0], 'application', allTeam1AppIds)
                    assertEntitiesInArray(filter[Op.or][1], 'project', allTeam1ProjectIds)
                    assertEntitiesInArray(filter[Op.or][2], 'device', allTeam1DeviceIds)
                    assertAssociations(associations, {
                        applications: allTeam1AppIds,
                        instances: allTeam1ProjectIds,
                        devices: allTeam1DeviceIds
                    })
                })
                it('should return filter scoped for projects and all children', async () => {
                    const team = TestObjects.team1
                    const allTeam1ProjectIds = [
                        TestObjects.team1_app1_proj1.id,
                        TestObjects.team1_app1_proj2.id,
                        TestObjects.team1_app2_proj1.id,
                        TestObjects.team1_app2_proj2.id
                    ]
                    const allTeam1ProjectDeviceIds = [
                        TestObjects.team1_app1_proj1_device1.id,
                        TestObjects.team1_app1_proj1_device2.id,
                        TestObjects.team1_app1_proj2_device1.id,
                        TestObjects.team1_app1_proj2_device2.id,
                        TestObjects.team1_app2_proj1_device1.id,
                        TestObjects.team1_app2_proj1_device2.id,
                        TestObjects.team1_app2_proj2_device1.id,
                        TestObjects.team1_app2_proj2_device2.id
                    ]
                    const pagination = { scope: 'project', includeChildren: true }
                    const { filter, associations } = await AuditLog.getFilterAndAssociations('team', team.id, pagination)
                    filter.should.only.have.property(Op.or)
                    filter[Op.or].should.be.an.Array().and.have.length(2) // project, app1_proj1 devices, app1_proj2 devices, app2_proj1 devices, app2_proj2 devices
                    assertEntitiesInArray(filter[Op.or][0], 'project', allTeam1ProjectIds)
                    assertEntitiesInArray(filter[Op.or][1], 'device', allTeam1ProjectDeviceIds)
                    assertAssociations(associations, {
                        applications: [],
                        instances: allTeam1ProjectIds,
                        devices: allTeam1ProjectDeviceIds
                    })
                })
            })
            describe('for Application', function () {
                it('should return filter scoped for application only', async () => {
                    const application = TestObjects.team1_app1
                    const pagination = { }
                    const { filter, associations } = await AuditLog.getFilterAndAssociations('application', application.id, pagination)
                    assertEntityEquals(filter, 'application', application.id)
                    assertAssociations(associations, {
                        applications: [application.id],
                        instances: [],
                        devices: []
                    })
                })
                it('should return filter scoped for projects only', async () => {
                    const application = TestObjects.team1_app1
                    const expectedProjects = [TestObjects.team1_app1_proj1.id, TestObjects.team1_app1_proj2.id]
                    const pagination = { scope: 'project' }
                    const { filter, associations } = await AuditLog.getFilterAndAssociations('application', application.id, pagination)
                    assertEntitiesInArray(filter, 'project', expectedProjects)
                    assertAssociations(associations, {
                        applications: [],
                        instances: expectedProjects,
                        devices: []
                    })
                })
                it('should return filter scoped for devices only', async () => {
                    const application = TestObjects.team1_app1
                    const expectedDevices = [
                        TestObjects.team1_app1_device1.id,
                        TestObjects.team1_app1_device2.id
                    ]
                    const pagination = { scope: 'device' }
                    const { filter, associations } = await AuditLog.getFilterAndAssociations('application', application.id, pagination)
                    assertEntitiesInArray(filter, 'device', expectedDevices)
                    assertAssociations(associations, {
                        applications: [],
                        instances: [],
                        devices: expectedDevices
                    })
                })
                it('should return filter scoped for application and all children', async () => {
                    const application = TestObjects.team1_app1
                    const allApp1ProjectIds = [TestObjects.team1_app1_proj1.id, TestObjects.team1_app1_proj2.id]
                    const projectDevices = [
                        TestObjects.team1_app1_proj1_device1.id,
                        TestObjects.team1_app1_proj1_device2.id,
                        TestObjects.team1_app1_proj2_device1.id,
                        TestObjects.team1_app1_proj2_device2.id
                    ]
                    const allApp1Devices = [
                        TestObjects.team1_app1_device1.id,
                        TestObjects.team1_app1_device2.id
                    ]
                    const pagination = { scope: 'application', includeChildren: true }
                    const { filter, associations } = await AuditLog.getFilterAndAssociations('application', application.id, pagination)
                    filter.should.only.have.property(Op.or)
                    filter[Op.or].should.be.an.Array().and.have.length(4) // application, project, device
                    assertEntityEquals(filter[Op.or][0], 'application', application.id)
                    assertEntitiesInArray(filter[Op.or][1], 'project', allApp1ProjectIds)
                    assertEntitiesInArray(filter[Op.or][2], 'device', projectDevices)
                    assertEntitiesInArray(filter[Op.or][3], 'device', allApp1Devices)
                    assertAssociations(associations, {
                        applications: [application.id],
                        instances: allApp1ProjectIds,
                        devices: [...projectDevices, ...allApp1Devices]
                    })
                })
                it('should return filter scoped for projects and all children', async () => {
                    const application = TestObjects.team1_app1
                    const allApp1ProjectIds = [TestObjects.team1_app1_proj1.id, TestObjects.team1_app1_proj2.id]
                    const project1Devices = [
                        TestObjects.team1_app1_proj1_device1.id,
                        TestObjects.team1_app1_proj1_device2.id
                    ]
                    const project2Devices = [
                        TestObjects.team1_app1_proj2_device1.id,
                        TestObjects.team1_app1_proj2_device2.id
                    ]
                    const pagination = { scope: 'project', includeChildren: true }
                    const { filter, associations } = await AuditLog.getFilterAndAssociations('application', application.id, pagination)
                    filter.should.only.have.property(Op.or)
                    filter[Op.or].should.be.an.Array().and.have.length(2) // project, device
                    assertEntitiesInArray(filter[Op.or][0], 'project', allApp1ProjectIds)
                    assertEntitiesInArray(filter[Op.or][1], 'device', [...project1Devices, ...project2Devices])
                    assertAssociations(associations, {
                        applications: [],
                        instances: allApp1ProjectIds,
                        devices: [...project1Devices, ...project2Devices]
                    })
                })
            })
        })
    })
})
