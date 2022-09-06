const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Project model', function () {
    // Use standard test data.
    let app

    afterEach(async function () {
        if (app) {
            await app.close()
            app = null
        }
    })

    describe('Project Create', function () {
        it('limits how many projects can be created according to license', async function () {
            app = await setup({
                // license has projects limit set to 2
                license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjIsImRldmljZXMiOjUwLCJkZXYiOnRydWUsImlhdCI6MTY2MjQ4NDgzNn0.akS_SIeRNK_mQZyPXGVbg1odqoRRAi62xOyDS3jHnUVhSLvwZIpWBZu799PXCXRS0fV98GxVWjZm7i1YbuxlUg'
            })
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
        beforeEach(async function () {
            app = await setup()
        })

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

            pt.name.should.equal('default-project-type')
        })
    })
    describe('Project Settings', function () {
        beforeEach(async function () {
            app = await setup()
        })

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
