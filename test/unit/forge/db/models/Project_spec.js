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
})
