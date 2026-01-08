const should = require('should') // eslint-disable-line
const sinon = require('sinon')
const { v4: uuidv4 } = require('uuid')

const setup = require('../setup')

describe('Project model', function () {
    // Use standard test data.
    let app
    before(async function () {
        app = await setup()
    })
    after(async function () {
        await app.close()
    })

    describe('License limits', function () {
        describe('Licensed', function () {
            before(async function () {
                await app.close()
                app = await setup({
                    // license has projects limit set to 2
                    license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjIsImRldmljZXMiOjUwLCJkZXYiOnRydWUsImlhdCI6MTY2MjQ4NDgzNn0.akS_SIeRNK_mQZyPXGVbg1odqoRRAi62xOyDS3jHnUVhSLvwZIpWBZu799PXCXRS0fV98GxVWjZm7i1YbuxlUg'
                })
            })
            after(async function () {
                await app.close()
                app = await setup()
            })
            it('Permits overage when licensed', async function () {
                ;(await app.db.models.Project.count()).should.equal(0)
                await app.db.models.Project.create({ name: 'p1', type: '', url: '' })
                ;(await app.db.models.Project.count()).should.equal(1)
                await app.db.models.Project.create({ name: 'p2', type: '', url: '' })
                ;(await app.db.models.Project.count()).should.equal(2)
                await app.db.models.Project.create({ name: 'p3', type: '', url: '' })
                ;(await app.db.models.Project.count()).should.equal(3)
            })
        })
        it('Does not permit overage when unlicensed', async function () {
            app.license.defaults.instances = 2 // override default
            ;(await app.db.models.Project.count()).should.equal(0)
            await app.db.models.Project.create({ name: 'p1', type: '', url: '' })
            ;(await app.db.models.Project.count()).should.equal(1)
            await app.db.models.Project.create({ name: 'p2', type: '', url: '' })
            ;(await app.db.models.Project.count()).should.equal(2)
            try {
                await app.db.models.Project.create({ name: 'p3', type: '', url: '' })
                return Promise.reject(new Error('able to create project that exceeds limit'))
            } catch (err) { }
            await app.db.models.Project.destroy({ where: { name: 'p2' } })
            ;(await app.db.models.Project.count()).should.equal(1)
            await app.db.models.Project.create({ name: 'p3', type: '', url: '' })
            ;(await app.db.models.Project.count()).should.equal(2)
        })
    })

    describe('Project Type', function () {
        it('has a project type', async function () {
            const project = await app.db.models.Project.create({
                name: 'testProject-01',
                type: '',
                url: ''
            })
            const projectType = await app.db.models.ProjectType.create({
                name: 'default-project-type-01',
                properties: {},
                active: true
            })
            await project.setProjectType(projectType)

            const reloadedProject = await app.db.models.Project.byId(project.id)
            const pt = await reloadedProject.getProjectType()

            pt.name.should.equal('default-project-type-01')
        })
    })
    describe('Project Settings', function () {
        it('can get project settings in one query', async function () {
            const project = await app.db.models.Project.create({
                name: 'testProject-02',
                type: '',
                url: ''
            })
            const stack = await app.db.models.ProjectStack.create({
                name: 'stack-1',
                active: true,
                properties: { foo: 'bar' }
            })
            await project.setProjectStack(stack)

            await project.updateSetting('port', 123)
            await project.updateSetting('pid', 456)
            await project.updateSetting('path', '/tmp/foo/bar')
            const settings = await project.getAllSettings()
            settings.should.have.a.property('port', 123)
            settings.should.have.a.property('pid', 456)
            settings.should.have.a.property('path', '/tmp/foo/bar')
        })

        it('includes platform specific env vars', async function () {
            const project = await app.db.models.Project.create({
                name: 'testProject-03',
                type: '',
                url: ''
            })
            const settings = await project.getAllSettings()
            should(settings).be.an.Object()
            settings.should.have.a.property('settings')
            settings.settings.should.have.a.property('env').of.Array()
            settings.settings.env.length.should.equal(4)
            settings.settings.env.find(e => e.name === 'FF_PROJECT_ID').should.have.a.property('value', project.id) // deprecated in favour of FF_INSTANCE_ID as of 1.6.0
            settings.settings.env.find(e => e.name === 'FF_PROJECT_NAME').should.have.a.property('value', 'testProject-03') // deprecated in favour of FF_INSTANCE_NAME as of 1.6.0
            settings.settings.env.find(e => e.name === 'FF_INSTANCE_ID').should.have.a.property('value', project.id)
            settings.settings.env.find(e => e.name === 'FF_INSTANCE_NAME').should.have.a.property('value', 'testProject-03')
        })
    })
    describe('Relations', function () {
        let Application, Project, Team
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
        before(async function () {
            await app.close()
            // Dev-only Enterprise license - loads ee models
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'
            app = await setup({
                license,
                broker: {
                    url: 'mqtt://forge:1883',
                    teamBroker: {
                        enabled: true
                    }
                }
            })
        })
        after(async function () {
            await app.close()
            app = await setup()
        })
        beforeEach(async () => {
            app.license.defaults.instances = 20 // override default
            app.license.defaults.mqttClients = 5 // override default
            ;({ Application, Project, Team } = app.db.models)
        })
        // RELATION: ([ApplicationId]) REFERENCES [dbo].[Applications] ([id]) ON DELETE CASCADE,
        it('should delete Project on Application delete', async () => {
            // Create an application and a project
            const application = await newApplication(app.TestObjects.team1.id)
            const project = await newProject(application.id, app.TestObjects.team1.id)
            const pid = project.id

            // Delete the application
            await application.destroy()

            // Reload project to get updated data
            const updatedProject = await Project.findOne({ where: { id: pid } })
            should(updatedProject).be.null()
        })

        it('should update Project.ApplicationId on Application.id update', async () => {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            // Create an application and a project
            const application = await newApplication(app.TestObjects.team1.id)
            const project = await newProject(application.id, app.TestObjects.team1.id)

            // Update application id
            application.id = application.id + 1
            await application.save()
            await application.reload()

            // Reload project to get updated data
            await project.reload()

            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            project.ApplicationId.should.equal(application.id)
        })

        // RELATION: TeamId INTEGER REFERENCES Teams (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should set Project.TeamId NULL on Team delete', async () => {
            // NOTE: Although the relationship defined on the table is ON DELETE SET NULL, the actual
            // behavior is an error is thrown when trying to delete a team that has projects associated with it.
            // This behavior is enforced by the application code in the Team model in the beforeDestroy hook.

            // Create a project
            const team = await newTeam()
            await newProject(null, team.id)

            // Delete the team - should throw new Error('Cannot delete team that owns instances')
            try {
                await team.destroy()
            } catch (err) {
                err.message.should.equal('Cannot delete team that owns instances')
            }
        })

        // RELATION: TeamId INTEGER REFERENCES Teams (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should update Project.TeamId on Team.id update', async () => {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            // Create a project
            const team = await newTeam()
            const project = await newProject(null, team.id)

            // Update team id
            team.id = team.id + 1
            await team.save()
            await team.reload()

            // Reload project to get updated data
            const updatedProject = await Project.findByPk(project.id)

            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            updatedProject.TeamId.should.equal(team.id)
        })

        // RELATION: ProjectTypeId INTEGER REFERENCES ProjectTypes (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should set Project.ProjectTypeId NULL on ProjectType delete', async () => {
            // NOTE: Although the relationship defined on the table is ON DELETE SET NULL, the actual
            // behavior is an error is thrown when trying to delete a project type that has projects associated with it.
            // This behavior is enforced by the application code in the ProjectType model in the beforeDestroy hook.

            // Create a project type and a project
            const projectType = await app.db.models.ProjectType.create({ name: nameGenerator('Test Project Type') })
            await newProject(null, app.TestObjects.team1.id, projectType.id)

            // Delete the project type
            try {
                await projectType.destroy()
            } catch (err) {
                err.message.should.equal('Cannot delete ProjectType that is used by projects')
            }
        })
        // RELATION: ProjectTypeId INTEGER REFERENCES ProjectTypes (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should update Project.ProjectTypeId on ProjectType.id update', async () => {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            // Create a project type and a project
            const projectType = await app.db.models.ProjectType.create({ name: nameGenerator('Test Project Type') })
            const project = await newProject(null, app.TestObjects.team1.id, projectType.id)

            // Update project type id
            projectType.id = projectType.id + 1
            await projectType.save()
            await projectType.reload()

            // Reload project to get updated data
            const updatedProject = await Project.findByPk(project.id)

            // at this point, the id may or may not have been updated however the relationship
            updatedProject.ProjectTypeId.should.equal(projectType.id)
        })

        // RELATION: ProjectStackId INTEGER REFERENCES ProjectStacks (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should set Project.ProjectStackId NULL on ProjectStack delete', async () => {
            // NOTE: Although the relationship defined on the table is ON DELETE SET NULL, the actual
            // behavior is an error is thrown when trying to delete a project stack that has projects associated with it.
            // This behavior is enforced by the application code in the ProjectStack model in the beforeDestroy hook.

            // Create a project stack and a project
            const projectStack = await app.db.models.ProjectStack.create({ name: nameGenerator('Test Project Stack') })
            await newProject(null, app.TestObjects.team1.id, null, projectStack.id)

            // Delete the project stack
            try {
                await projectStack.destroy()
            } catch (err) {
                err.message.should.equal('Cannot delete stack that is used by projects')
            }
        })

        // RELATION: ProjectStackId INTEGER REFERENCES ProjectStacks (id) ON DELETE SET NULL ON UPDATE CASCADE,
        it('should update Project.ProjectStackId on ProjectStack.id update', async () => {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            // Create a project stack and a project
            const projectStack = await app.db.models.ProjectStack.create({ name: nameGenerator('Test Project Stack') })
            const project = await newProject(null, app.TestObjects.team1.id, null, projectStack.id)

            // Update project stack id
            projectStack.id = projectStack.id + 1
            await projectStack.save()
            await projectStack.reload()

            // Reload project to get updated data
            const updatedProject = await Project.findByPk(project.id)

            // at this point, the id may or may not have been updated however the relationship
            updatedProject.ProjectStackId.should.equal(projectStack.id)
        })

        // RELATION: ProjectTemplateId INTEGER REFERENCES ProjectTemplates (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should set Project.ProjectTemplateId NULL on ProjectTemplate delete', async () => {
            // NOTE: Although the relationship defined on the table is ON DELETE SET NULL, the actual
            // behavior is an error is thrown when trying to delete a project template that has projects associated with it.
            // This behavior is enforced by the application code in the ProjectTemplate model in the beforeDestroy hook.

            // Create a project template and a project
            const projectTemplate = await app.db.models.ProjectTemplate.create({ name: nameGenerator('Test Project Template') })
            await newProject(null, app.TestObjects.team1.id, null, null, projectTemplate.id)

            // Delete the project template
            try {
                await projectTemplate.destroy()
            } catch (err) {
                err.message.should.equal('Cannot delete template that is used by projects')
            }
        })

        // RELATION: ProjectTemplateId INTEGER REFERENCES ProjectTemplates (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should update Project.ProjectTemplateId on ProjectTemplate.id update', async () => {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            // Create a project template and a project
            const projectTemplate = await app.db.models.ProjectTemplate.create({ name: nameGenerator('Test Project Template') })
            const project = await newProject(null, app.TestObjects.team1.id, null, null, projectTemplate.id)

            // Update project template id
            projectTemplate.id = projectTemplate.id + 1
            await projectTemplate.save()
            await projectTemplate.reload()

            // Reload project to get updated data
            const updatedProject = await Project.findByPk(project.id)

            // at this point, the id may or may not have been updated however the relationship
            updatedProject.ProjectTemplateId.should.equal(projectTemplate.id)
        })

        // Soft relations - ones linked via application logic rather than actual DDL constraints/cascades
        it('should delete associated table rows on single Project delete', async () => {
            // PREMISE: Create a project with associated rows in other tables, then delete it
            // using project.destroy() and verify associated rows are also deleted
            // which should occur in the model hook `afterDestroy`
            // NOTE: access tokens & brokerClients are generated via a call to project.refreshAuthTokens()
            // NOTE: auth clients are generated via a call to app.db.controllers.AuthClient.createClientForProject(project)

            const project = await app.db.models.Project.create({ name: 'Project with associations', type: '', url: '', TeamId: app.TestObjects.team1.id })

            // create access tokens & brokerClients
            await project.refreshAuthTokens()

            // create auth clients
            await app.db.controllers.AuthClient.createClientForProject(project)

            // create other associated rows
            await app.db.models.ProjectSettings.create({ ProjectId: project.id, key: 'value', value: { test: true }, valueType: 1 })
            await app.db.models.TeamBrokerClient.create({ username: `project:${project.id}`, password: uuidv4(), acls: '[]', teamId: app.TestObjects.team1.id, ownerId: '' + project.id, ownerType: 'project' })
            await app.db.models.MCPRegistration.create({ name: `mcp_project_${project.id}`, protocol: 'http', targetType: 'instance', targetId: '' + project.id, nodeId: 'xxx', endpointRoute: '/mcp', TeamId: app.TestObjects.team1.id })

            // test integrity - check tables we expect rows in to actually have them (later we will check they are deleted)
            ;(await app.db.models.AccessToken.count({ where: { ownerId: project.id, ownerType: 'project' } })).should.equal(1)
            ;(await app.db.models.BrokerClient.count({ where: { ownerId: project.id, ownerType: 'project' } })).should.be.equal(1)
            ;(await app.db.models.AuthClient.count({ where: { ownerId: project.id, ownerType: 'project' } })).should.be.equal(1)
            ;(await app.db.models.ProjectSettings.count({ where: { ProjectId: project.id, key: 'value' } })).should.be.equal(1)
            ;(await app.db.models.TeamBrokerClient.count({ where: { ownerId: project.id, ownerType: 'project' } })).should.be.equal(1)
            ;(await app.db.models.MCPRegistration.count({ where: { targetId: project.id, targetType: 'instance' } })).should.be.equal(1)
            // Delete the project
            await project.destroy()

            // Verify associated rows are also deleted
            ;(await app.db.models.AccessToken.count({ where: { ownerId: project.id, ownerType: 'project' } })).should.equal(0)
            ;(await app.db.models.BrokerClient.count({ where: { ownerId: project.id, ownerType: 'project' } })).should.be.equal(0)
            ;(await app.db.models.AuthClient.count({ where: { ownerId: project.id, ownerType: 'project' } })).should.be.equal(0)
            ;(await app.db.models.ProjectSettings.count({ where: { ProjectId: project.id, key: 'value' } })).should.be.equal(0)
            ;(await app.db.models.TeamBrokerClient.count({ where: { ownerId: project.id, ownerType: 'project' } })).should.be.equal(0)
            ;(await app.db.models.MCPRegistration.count({ where: { targetId: project.id, targetType: 'instance' } })).should.be.equal(0)
        })
    })

    describe('Counting Projects by State', function () {
        before(async function () {
            // Due to how EE models are loaded/required in the test setup, app.db.models.MCPRegistration will be the instance
            // first loaded.  e.g. [APP-1].db.models.models.MCPRegistration will be the same instance as [APP-2].db.models.models.MCPRegistration
            // This will cause the error "ConnectionManager.getConnection was called after the connection manager was closed!" to be thrown
            // in the below tests because the previous describe blocks close the DB connection effectively invalidating the MCPRegistration model
            // for subsequent tests. For that reason, the below tests will mock out the MCPRegistration.destroy call
            // The ideal fix is to refactor the model loading in the test setup or to split the tests into separate processes
            // but for now this stub will suffice
            sinon.stub(app.db.models.MCPRegistration, 'destroy').resolves()
        })
        after(async function () {
            sinon.restore()
        })
        beforeEach(async () => {
            app.license.defaults.teams = 20
            app.license.defaults.instances = 20

            // Load TeamType association for TestObjects.team1
            await app.TestObjects.team1.reload({ include: [{ model: app.db.models.TeamType }] })
        })
        it('should count projects grouped by state with valid states and a string TeamId', async function () {
            const states = ['running', 'stopped']

            const team = await app.db.models.Team.create({ name: 'Test Team', TeamTypeId: 1 })
            // Load the TeamType association so the team has the getFeatureProperty method
            await team.reload({ include: [{ model: app.db.models.TeamType }] })
            const numericTeamId = team.id

            const instance1 = await app.db.models.Project.create({ name: 'p1', type: '', url: '', state: 'running', TeamId: numericTeamId })
            const instance2 = await app.db.models.Project.create({ name: 'p2', type: '', url: '', state: 'stopped', TeamId: numericTeamId })
            const instance3 = await app.db.models.Project.create({ name: 'p3', type: '', url: '', state: 'running', TeamId: numericTeamId })

            const result = await app.db.models.Project.countByState(states, team, null, null)

            result.should.deepEqual([
                { state: 'running', count: 2 },
                { state: 'stopped', count: 1 }
            ])

            await instance1.destroy()
            await instance2.destroy()
            await instance3.destroy()
            await team.destroy()
        })

        it('should count projects with no state filter (only by TeamId)', async function () {
            const team = await app.db.models.Team.create({ name: 'Test Team', TeamTypeId: 1 })
            // Load the TeamType association so the team has the getFeatureProperty method
            await team.reload({ include: [{ model: app.db.models.TeamType }] })

            const instance1 = await app.db.models.Project.create({ name: 'p4', type: '', url: '', state: 'idle', TeamId: team.id })
            const instance2 = await app.db.models.Project.create({ name: 'p5', type: '', url: '', state: 'running', TeamId: team.id })

            const result = await app.db.models.Project.countByState([], team, null, null)

            result.should.deepEqual([
                { state: 'idle', count: 1 },
                { state: 'running', count: 1 }
            ])

            await instance1.destroy()
            await instance2.destroy()
            await team.destroy()
        })

        it('should return an empty result when no projects match the given states', async function () {
            const states = ['non-existent-state']
            const team = await app.db.models.Team.create({
                name: 'Test Team',
                TeamTypeId: 1
            })
            await team.reload({ include: [{ model: app.db.models.TeamType }] })

            const result = await app.db.models.Project.countByState(states, team, null, null)

            result.should.eql([])

            await team.destroy()
        })

        it('should handle errors gracefully when an invalid teamId is provided', async function () {
            const invalidTeam = { id: 'invalidTeamId' }

            try {
                await app.db.models.Project.countByState(['running'], invalidTeam, null, null)
                should.fail('Expected an error to be thrown')
            } catch (err) {
                err.should.be.an.Error()
                err.message.should.match(/invalid.*teamId/i)
            }
        })

        it('should be able to return results when using a hashed team id', async function () {
            const states = ['running', 'stopped']

            const team = await app.db.models.Team.create({ name: 'Test Team', TeamTypeId: 1 })
            // Load the TeamType association so the team has the getFeatureProperty method
            await team.reload({ include: [{ model: app.db.models.TeamType }] })
            const numericTeamId = team.id

            const instance1 = await app.db.models.Project.create({ name: 'p1', type: '', url: '', state: 'running', TeamId: numericTeamId })
            const instance2 = await app.db.models.Project.create({ name: 'p2', type: '', url: '', state: 'stopped', TeamId: numericTeamId })
            const instance3 = await app.db.models.Project.create({ name: 'p3', type: '', url: '', state: 'running', TeamId: numericTeamId })

            const result = await app.db.models.Project.countByState(states, team, null, null)

            result.should.deepEqual([
                { state: 'running', count: 2 },
                { state: 'stopped', count: 1 }
            ])

            await instance1.destroy()
            await instance2.destroy()
            await instance3.destroy()
            await team.destroy()
        })

        it('should handle invalid string ApplicationId', async () => {
            const team = await app.db.models.Team.create({ name: 'Test Team', TeamTypeId: 1 })
            // Load the TeamType association so the team has the getFeatureProperty method
            await team.reload({ include: [{ model: app.db.models.TeamType }] })

            try {
                await app.db.models.Project.countByState([], team, 'invalid-application-id', null)
                should.fail('Expected an error to be thrown')
            } catch (err) {
                err.should.be.an.Error()
                err.message.should.equal('Invalid ApplicationId')
            }
            await team.destroy()
        })

        it('should filter by application and statuses', async () => {
            app.license.defaults.instances = 50 // override default

            const states = ['running', 'stopped']

            const team = await app.db.models.Team.create({ name: 'Test Team', TeamTypeId: 1 })
            // Load the TeamType association so the team has the getFeatureProperty method
            await team.reload({ include: [{ model: app.db.models.TeamType }] })
            const numericTeamId = team.id

            const application1 = await app.db.models.Application.create({ name: 'App 1', TeamId: numericTeamId })
            const numericApp1Id = application1.id

            const application2 = await app.db.models.Application.create({ name: 'App 2', TeamId: numericTeamId })
            const numericApp2Id = application2.id

            const instance1 = await app.db.models.Project.create({ name: 'p1', type: '', url: '', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp1Id })
            const instance2 = await app.db.models.Project.create({ name: 'p2', type: '', url: '', state: 'stopped', TeamId: numericTeamId, ApplicationId: numericApp1Id })
            const instance3 = await app.db.models.Project.create({ name: 'p3', type: '', url: '', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp1Id })
            const instance4 = await app.db.models.Project.create({ name: 'p4', type: '', url: '', state: 'suspended', TeamId: numericTeamId, ApplicationId: numericApp1Id })

            const instance5 = await app.db.models.Project.create({ name: 'p5', type: '', url: '', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp2Id })
            const instance6 = await app.db.models.Project.create({ name: 'p6', type: '', url: '', state: 'stopped', TeamId: numericTeamId, ApplicationId: numericApp2Id })
            const instance7 = await app.db.models.Project.create({ name: 'p7', type: '', url: '', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp2Id })
            const instance8 = await app.db.models.Project.create({ name: 'p8', type: '', url: '', state: 'suspended', TeamId: numericTeamId, ApplicationId: numericApp2Id })

            const hashedAppId = app.db.models.Application.encodeHashid(application1.id)

            const result = await app.db.models.Project.countByState(states, team, hashedAppId, null)

            result.should.deepEqual([
                { state: 'running', count: 2 },
                { state: 'stopped', count: 1 }
            ])

            await instance1.destroy()
            await instance2.destroy()
            await instance3.destroy()
            await instance4.destroy()
            await instance5.destroy()
            await instance6.destroy()
            await instance7.destroy()
            await instance8.destroy()
            await application1.destroy()
            await application2.destroy()
            await team.destroy()
        })

        it('should filter by application and no statuses', async () => {
            app.license.defaults.instances = 50 // override default

            const states = []

            const team = await app.db.models.Team.create({ name: 'Test Team', TeamTypeId: 1 })
            // Load the TeamType association so the team has the getFeatureProperty method
            await team.reload({ include: [{ model: app.db.models.TeamType }] })
            const numericTeamId = team.id

            const application1 = await app.db.models.Application.create({ name: 'App 1', TeamId: numericTeamId })
            const numericApp1Id = application1.id

            const application2 = await app.db.models.Application.create({ name: 'App 2', TeamId: numericTeamId })
            const numericApp2Id = application2.id

            const instance1 = await app.db.models.Project.create({ name: 'p1', type: '', url: '', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp1Id })
            const instance2 = await app.db.models.Project.create({ name: 'p2', type: '', url: '', state: 'stopped', TeamId: numericTeamId, ApplicationId: numericApp1Id })
            const instance3 = await app.db.models.Project.create({ name: 'p3', type: '', url: '', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp1Id })
            const instance4 = await app.db.models.Project.create({ name: 'p4', type: '', url: '', state: 'suspended', TeamId: numericTeamId, ApplicationId: numericApp1Id })

            const instance5 = await app.db.models.Project.create({ name: 'p5', type: '', url: '', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp2Id })
            const instance6 = await app.db.models.Project.create({ name: 'p6', type: '', url: '', state: 'stopped', TeamId: numericTeamId, ApplicationId: numericApp2Id })
            const instance7 = await app.db.models.Project.create({ name: 'p7', type: '', url: '', state: 'running', TeamId: numericTeamId, ApplicationId: numericApp2Id })
            const instance8 = await app.db.models.Project.create({ name: 'p8', type: '', url: '', state: 'stopped', TeamId: numericTeamId, ApplicationId: numericApp2Id })

            const hashedAppId = app.db.models.Application.encodeHashid(application1.id)

            const result = await app.db.models.Project.countByState(states, team, hashedAppId, null)

            result.should.deepEqual([
                { count: 2, state: 'running' },
                { count: 1, state: 'stopped' },
                { count: 1, state: 'suspended' }
            ])

            await instance1.destroy()
            await instance2.destroy()
            await instance3.destroy()
            await instance4.destroy()
            await instance5.destroy()
            await instance6.destroy()
            await instance7.destroy()
            await instance8.destroy()
            application1.destroy()
            application2.destroy()
            await team.destroy()
        })
    })
})
