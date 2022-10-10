const should = require('should') // eslint-disable-line
const setup = require('../setup')
// const FF_UTIL = require('flowforge-test-utils')
// const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Project controller', function () {
    // Use standard test data.
    let app
    beforeEach(async function () {
        app = await setup()
    })

    afterEach(async function () {
        await app.close()
    })

    describe('Platform Specific Environment Variables', function () {
        it('generates env array', async function () {
            const project = await app.db.models.Project.create({
                name: 'project1',
                type: '',
                url: ''
            })
            const env = app.db.controllers.Project.insertPlatformSpecificEnvVars(project, null)
            should(env).be.an.Array().with.lengthOf(2)
            env.should.containEql({ name: 'FF_PROJECT_NAME', value: 'project1', platform: true })
            env.should.containEql({ name: 'FF_PROJECT_ID', value: project.id, platform: true })
        })
        it('merges env vars', async function () {
            const project = await app.db.models.Project.create({
                name: 'project2',
                type: '',
                url: ''
            })
            const dummyEnvVars = [
                { name: 'one', value: '1' },
                { name: 'two', value: '2' }
            ]
            const env = app.db.controllers.Project.insertPlatformSpecificEnvVars(project, dummyEnvVars)
            should(env).be.an.Array().with.lengthOf(4)
            env.should.containEql({ name: 'FF_PROJECT_NAME', value: 'project2', platform: true })
            env.should.containEql({ name: 'FF_PROJECT_ID', value: project.id, platform: true })
            env.should.containEql({ name: 'one', value: '1' })
            env.should.containEql({ name: 'two', value: '2' })
        })
        it('removes env vars', async function () {
            const dummyEnvVars = [
                { name: 'FF_PROJECT_ID', value: 'a' },
                { name: 'FF_PROJECT_NAME', value: 'b' },
                { name: 'FF_DEVICE_ID', value: 'c' },
                { name: 'FF_DEVICE_NAME', value: 'd' },
                { name: 'FF_DEVICE_TYPE', value: 'e' },
                { name: 'normal-env-var', value: 'f' }
            ]
            const env = app.db.controllers.Project.removePlatformSpecificEnvVars(dummyEnvVars)
            should(env).be.an.Array().and.have.a.lengthOf(1)
            env.should.containEql({ name: 'normal-env-var', value: 'f' })
        })
    })

    describe('getRuntimeSettings', function () {
        it('generates runtime settings object', async function () {
            const template = await app.db.models.ProjectTemplate.create({
                name: 'defaultTemplate',
                active: true,
                settings: {
                    disableEditor: true,
                    httpAdminRoot: '/foo',
                    dashboardUI: '/dashfoo',
                    codeEditor: 'monaco',
                    palette: {
                        allowInstall: true,
                        nodesExcludes: 'ex.js'
                    },
                    modules: {
                        allowInstall: true
                    },
                    env: [
                        { name: 'one', value: 'a' },
                        { name: 'two', value: 'b' }
                    ]
                },
                policy: {}
            })
            const project = await app.db.models.Project.create({
                name: 'testProject',
                type: '',
                url: ''
            })
            await project.setProjectTemplate(template)

            await project.updateSetting('settings', {
                httpAdminRoot: '/bar',
                dashboardUI: '/dashbar',
                palette: {
                    nodesExcludes: 'updated.js'
                },
                env: [
                    { name: 'one', value: 'project-a' },
                    { name: 'three', value: 'c' }
                ]
            })

            const reloadedProject = await app.db.models.Project.byId(project.id)

            const result = await app.db.controllers.Project.getRuntimeSettings(reloadedProject)

            result.should.have.property('disableEditor', true)
            result.should.have.property('httpAdminRoot', '/bar')
            result.should.have.property('dashboardUI', '/dashbar')
            result.should.have.property('codeEditor', 'monaco')
            result.should.have.property('palette')
            result.palette.should.have.property('allowInstall', true)
            result.palette.should.have.property('nodesExcludes', 'updated.js')
            result.should.have.property('modules')
            result.modules.should.have.property('allowInstall', true)
            result.should.have.property('env')

            result.env.should.have.property('one', 'project-a')
            result.env.should.have.property('two', 'b')
            result.env.should.have.property('three', 'c')
            result.env.should.have.property('FF_PROJECT_ID', project.id)
            result.env.should.have.property('FF_PROJECT_NAME', 'testProject')
        })
    })

    describe('exportProject', function () {
        it('', async function () {
            //
        })
    })
})
