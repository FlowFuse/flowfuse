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

            await app.db.models.StorageSettings.create({
                settings: '{"nodes":{"node-red":{"name":"node-red","version":"3.0.0","local":false,"user":false},"@flowforge/nr-project-nodes":{"name":"@flowforge/nr-project-nodes","version":"0.1.0","local":false,"user":false},"node-red-node-random":{"name":"node-red-node-random","version":"1.2.3","local":true}}}',
                ProjectId: project.id
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
            result.palette.should.have.property('modules')
            result.palette.modules.should.have.property('node-red-node-random', '1.2.3')
            result.should.have.property('modules')
            result.modules.should.have.property('allowInstall', true)
            result.should.have.property('env')
            result.env.should.have.property('one', 'project-a')
            result.env.should.have.property('two', 'b')
            result.env.should.have.property('three', 'c')
        })
    })

    describe('mergeProjectModules', function () {
        it('updates without project that has no modules currently', async function () {
            const project = await app.db.models.Project.create({
                name: 'testProject',
                type: '',
                url: ''
            })

            const reloadedProject = await app.db.models.Project.byId(project.id)

            await app.db.controllers.Project.mergeProjectModules(reloadedProject, [
                { name: 'new-module', version: '1', local: true },
                { name: 'upgraded-module', version: '2', local: true }
            ])

            const updatedSettings = await project.getSetting('settings')
            updatedSettings.palette.modules.should.have.length(2)
            updatedSettings.palette.modules.sort((A, B) => A.name.localeCompare(B.name))
            // 'new-module' added
            updatedSettings.palette.modules[0].should.have.property('name', 'new-module')
            updatedSettings.palette.modules[0].should.have.property('version', '~1')

            // 'upgraded-module' added
            updatedSettings.palette.modules[1].should.have.property('name', 'upgraded-module')
            updatedSettings.palette.modules[1].should.have.property('version', '~2')
        })

        it('updates project settings based on Node-RED module list', async function () {
            const project = await app.db.models.Project.create({
                name: 'testProject',
                type: '',
                url: ''
            })

            await project.updateSetting('settings', {
                palette: {
                    modules: [
                        { name: 'upgraded-module', version: '1', local: true },
                        { name: 'another-module', version: '1', local: true }
                    ]
                }
            })

            const reloadedProject = await app.db.models.Project.byId(project.id)

            await app.db.controllers.Project.mergeProjectModules(reloadedProject, [
                { name: 'new-module', version: '1', local: true },
                { name: 'upgraded-module', version: '2', local: true }
            ])

            const updatedSettings = await project.getSetting('settings')
            updatedSettings.palette.modules.should.have.length(3)
            updatedSettings.palette.modules.sort((A, B) => A.name.localeCompare(B.name))
            // 'another-module' left untouched
            updatedSettings.palette.modules[0].should.have.property('name', 'another-module')
            updatedSettings.palette.modules[0].should.have.property('version', '1')

            // 'new-module' added
            updatedSettings.palette.modules[1].should.have.property('name', 'new-module')
            updatedSettings.palette.modules[1].should.have.property('version', '~1')

            // 'upgraded-module' upgraded
            updatedSettings.palette.modules[2].should.have.property('name', 'upgraded-module')
            updatedSettings.palette.modules[2].should.have.property('version', '~2')
        })
    })
    // describe('exportProject', function () {
    //     it('', async function () {
    //         //
    //     })
    // })
})
