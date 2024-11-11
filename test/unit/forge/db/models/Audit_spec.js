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
        describe('buildScopeClause', function () {
            describe('for Team', function () {
                it('should return clause scoped for team only', async () => {
                    const team = TestObjects.team1
                    const pagination = { }
                    const clause = await AuditLog.buildScopeClause('team', team.id, pagination)
                    assertEntityEquals(clause, 'team', team.id)
                })
                it('should return clause scoped for applications only', async () => {
                    const team = TestObjects.team1
                    const expectedApps = [TestObjects.team1_app1.id, TestObjects.team1_app2.id]
                    const pagination = { scope: 'application' }
                    const clause = await AuditLog.buildScopeClause('team', team.id, pagination)
                    assertEntitiesInArray(clause, 'application', expectedApps)
                })
                it('should return clause scoped for projects only', async () => {
                    const team = TestObjects.team1
                    const expectedProjects = [
                        TestObjects.team1_app1_proj1.id,
                        TestObjects.team1_app1_proj2.id,
                        TestObjects.team1_app2_proj1.id,
                        TestObjects.team1_app2_proj2.id
                    ]
                    const pagination = { scope: 'project' }
                    const clause = await AuditLog.buildScopeClause('team', team.id, pagination)
                    assertEntitiesInArray(clause, 'project', expectedProjects)
                })
                it('should return clause scoped for devices only', async () => {
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
                    const clause = await AuditLog.buildScopeClause('team', team.id, pagination)
                    assertEntitiesInArray(clause, 'device', expectedDevices)
                })
                it('should return clause scoped for team and all children', async () => {
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
                    const clause = await AuditLog.buildScopeClause('team', team.id, pagination)
                    clause.should.only.have.property(Op.or)
                    clause[Op.or].should.be.an.Array().and.have.length(4) // team, application, project, device
                    assertEntityEquals(clause[Op.or][0], 'team', team.id)
                    assertEntitiesInArray(clause[Op.or][1], 'application', allTeam1AppIds)
                    assertEntitiesInArray(clause[Op.or][2], 'project', allTeam1ProjectIds)
                    assertEntitiesInArray(clause[Op.or][3], 'device', allTeam1DeviceIds)
                })
                it('should return clause scoped for applications and all children', async () => {
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
                    const clause = await AuditLog.buildScopeClause('team', team.id, pagination)
                    clause.should.only.have.property(Op.or)
                    clause[Op.or].should.be.an.Array().and.have.length(3) // application, project, device
                    assertEntitiesInArray(clause[Op.or][0], 'application', allTeam1AppIds)
                    assertEntitiesInArray(clause[Op.or][1], 'project', allTeam1ProjectIds)
                    assertEntitiesInArray(clause[Op.or][2], 'device', allTeam1DeviceIds)
                })
                it('should return clause scoped for projects and all children', async () => {
                    const team = TestObjects.team1
                    const allTeam1ProjectIds = [
                        TestObjects.team1_app1_proj1.id,
                        TestObjects.team1_app1_proj2.id,
                        TestObjects.team1_app2_proj1.id,
                        TestObjects.team1_app2_proj2.id
                    ]
                    const pagination = { scope: 'project', includeChildren: true }
                    const clause = await AuditLog.buildScopeClause('team', team.id, pagination)
                    clause.should.only.have.property(Op.or)
                    clause[Op.or].should.be.an.Array().and.have.length(5) // project, app1_proj1 devices, app1_proj2 devices, app2_proj1 devices, app2_proj2 devices
                    assertEntitiesInArray(clause[Op.or][0], 'project', allTeam1ProjectIds)
                    assertEntitiesInArray(clause[Op.or][1], 'device', [
                        TestObjects.team1_app1_proj1_device1.id,
                        TestObjects.team1_app1_proj1_device2.id
                    ])
                    assertEntitiesInArray(clause[Op.or][2], 'device', [
                        TestObjects.team1_app1_proj2_device1.id,
                        TestObjects.team1_app1_proj2_device2.id
                    ])
                    assertEntitiesInArray(clause[Op.or][3], 'device', [
                        TestObjects.team1_app2_proj1_device1.id,
                        TestObjects.team1_app2_proj1_device2.id
                    ])
                    assertEntitiesInArray(clause[Op.or][4], 'device', [
                        TestObjects.team1_app2_proj2_device1.id,
                        TestObjects.team1_app2_proj2_device2.id
                    ])
                })
            })
            describe('for Application', function () {
                it('should return clause scoped for application only', async () => {
                    const application = TestObjects.team1_app1
                    const pagination = { }
                    const clause = await AuditLog.buildScopeClause('application', application.id, pagination)
                    assertEntityEquals(clause, 'application', application.id)
                })
                it('should return clause scoped for projects only', async () => {
                    const application = TestObjects.team1_app1
                    const expectedProjects = [TestObjects.team1_app1_proj1.id, TestObjects.team1_app1_proj2.id]
                    const pagination = { scope: 'project' }
                    const clause = await AuditLog.buildScopeClause('application', application.id, pagination)
                    assertEntitiesInArray(clause, 'project', expectedProjects)
                })
                it('should return clause scoped for devices only', async () => {
                    const application = TestObjects.team1_app1
                    const expectedDevices = [
                        TestObjects.team1_app1_device1.id,
                        TestObjects.team1_app1_device2.id
                    ]
                    const pagination = { scope: 'device' }
                    const clause = await AuditLog.buildScopeClause('application', application.id, pagination)
                    assertEntitiesInArray(clause, 'device', expectedDevices)
                })
                it('should return clause scoped for application and all children', async () => {
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
                    const allApp1Devices = [
                        TestObjects.team1_app1_device1.id,
                        TestObjects.team1_app1_device2.id
                    ]
                    const pagination = { scope: 'application', includeChildren: true }
                    const clause = await AuditLog.buildScopeClause('application', application.id, pagination)
                    clause.should.only.have.property(Op.or)
                    clause[Op.or].should.be.an.Array().and.have.length(5) // application, project, device
                    assertEntityEquals(clause[Op.or][0], 'application', application.id)
                    assertEntitiesInArray(clause[Op.or][1], 'project', allApp1ProjectIds)
                    assertEntitiesInArray(clause[Op.or][2], 'device', project1Devices)
                    assertEntitiesInArray(clause[Op.or][3], 'device', project2Devices)
                    assertEntitiesInArray(clause[Op.or][4], 'device', allApp1Devices)
                })
                it('should return clause scoped for projects and all children', async () => {
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
                    const clause = await AuditLog.buildScopeClause('application', application.id, pagination)
                    clause.should.only.have.property(Op.or)
                    clause[Op.or].should.be.an.Array().and.have.length(3) // project, device
                    assertEntitiesInArray(clause[Op.or][0], 'project', allApp1ProjectIds)
                    assertEntitiesInArray(clause[Op.or][1], 'device', project1Devices)
                    assertEntitiesInArray(clause[Op.or][2], 'device', project2Devices)
                })
            })
        })
    })
})
