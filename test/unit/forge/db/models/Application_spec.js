const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Application model', function () {
    // Use standard test data.
    let app
    /** @type {import('../../../../lib/TestModelFactory')} */
    let factory = null

    before(async function () {
        app = await setup()
        factory = app.factory
    })
    after(async function () {
        await app.close()
    })
    let Application, Project, Team, Device
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

    describe('Relations', function () {
        beforeEach(async () => {
            app.license.defaults.instances = 20; // override default
            ({ Application, Project, Team, Device } = app.db.models)
        })

        it('should delete Application when team is deleted', async () => {
            // Create an application and a project
            const team = await newTeam()
            const application = await newApplication(team.id)

            // first assert that they are associated
            application.TeamId.should.equal(team.id)

            // Delete the team
            await team.destroy()

            // Reload project to get updated data
            const updatedApplication = await Application.findByPk(application.id)
            should.not.exist(updatedApplication)
        })
    })

    describe('instance methods', function () {
        describe('getChildren', function () {
            beforeEach(async () => {
                app.license.defaults.instances = 20; // override default
                ({ Application, Project, Team } = app.db.models)
            })

            it('should return an child instances, devices and instance devices', async () => {
                // Create an application and a project
                const team = await newTeam()
                const application = await newApplication(team.id)
                const project = await newProject(application.id, team.id)
                const appDevice = await factory.createDevice({ name: 'device 1', type: 'test device' }, team, null, application)
                const instDevice = await factory.createDevice({ name: 'device 1', type: 'test device' }, team, project, null)

                const children = await application.getChildren()
                should(children).be.an.Array().and.have.length(3)
                const instance = children.find(c => c.type === 'instance' && c.model.id === project.id)
                const device1 = children.find(c => c.type === 'device' && c.model.id === appDevice.id)
                const device2 = children.find(c => c.type === 'device' && c.model.id === instDevice.id)

                instance.should.be.an.Object()
                instance.model.should.be.an.instanceOf(Project)
                instance.should.not.have.property('dependencies')

                device1.should.be.an.Object()
                device1.model.should.be.an.instanceOf(Device)
                device1.should.have.property('ownerId', application.id)
                device1.should.have.property('ownerType', 'application')
                device1.should.not.have.property('dependencies')

                device2.should.be.an.Object()
                device2.model.should.be.an.instanceOf(Device)
                device2.should.have.property('ownerType', 'instance')
                device2.should.have.property('ownerId', project.id)
                device2.should.not.have.property('dependencies')
            })
            it('should return an child instances, devices and instance devices with dependencies', async () => {
                // Create an application and a project
                const team = await newTeam()
                const application = await newApplication(team.id)
                const project = await newProject(application.id, team.id)
                const appDevice = await factory.createDevice({ name: 'device 1', type: 'test device' }, team, null, application)
                const instDevice = await factory.createDevice({ name: 'device 1', type: 'test device' }, team, project, null)

                const children = await application.getChildren({ includeDependencies: true })
                should(children).be.an.Array().and.have.length(3)
                const instance = children.find(c => c.type === 'instance' && c.model.id === project.id)
                const device1 = children.find(c => c.type === 'device' && c.model.id === appDevice.id)
                const device2 = children.find(c => c.type === 'device' && c.model.id === instDevice.id)

                const checkDeps = (item) => {
                    item.should.have.property('dependencies').and.be.an.Object()
                    Object.entries(item.dependencies).forEach(([key, value]) => {
                        key.should.be.a.String()
                        value.should.be.an.Object()
                        value.should.have.property('semver')
                        value.should.have.property('installed')
                    })
                }

                instance.should.be.an.Object()
                instance.model.should.be.an.instanceOf(Project)
                checkDeps(instance)

                device1.should.be.an.Object()
                device1.model.should.be.an.instanceOf(Device)
                device1.should.have.property('ownerId', application.id)
                device1.should.have.property('ownerType', 'application')
                checkDeps(device1)

                device2.should.be.an.Object()
                device2.model.should.be.an.instanceOf(Device)
                device2.should.have.property('ownerType', 'instance')
                device2.should.have.property('ownerId', project.id)
                checkDeps(device2)
            })
        })
    })
})
