const should = require('should') // eslint-disable-line
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
        beforeEach(async () => {
            app.license.defaults.instances = 20; // override default
            ({ Application, Project, Team } = app.db.models)
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
    })
})
