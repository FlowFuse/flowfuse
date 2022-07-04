const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Project model', function () {
    // Use standard test data.
    let app
    beforeEach(async function () {
        app = await setup()
    })

    afterEach(async function () {
        await app.close()
    })

    describe('Project Type', function () {
        it('has a project type', async function () {
            const project = await app.db.models.Project.create({
                name: 'testProject',
                type: '',
                url: ''
            })
            const projectType = await app.db.models.ProjectType.create({
                name: 'default-project-type',
                properties: {},
                active: true
            })
            await project.setProjectType(projectType)

            const reloadedProject = await app.db.models.Project.byId(project.id)
            const pt = await reloadedProject.getProjectType()

            console.log(pt.name)
        })
    })
    describe('Project Settings', function () {
        it('can get project settings in one query', async function () {
            const project = await app.db.models.Project.create({
                name: 'testProject',
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
            await project.updateSetting('pid', 123)
            await project.updateSetting('path', '/tmp/foo/bar')

            // const projects = await app.db.models.Project.findAll({
            //     attributes: [
            //         'id',
            //         'state',
            //         'ProjectStackId'
            //     ],
            //     include: [
            //         {
            //             model: app.db.models.ProjectSettings,
            //             where: { key: app.db.sequelize.or('port', 'path') }
            //         }
            //     ]
            // })

            // console.log(projects[0].ProjectStackId)
            // console.log(await projects[0].getProjectStack())
        })
    })
})
