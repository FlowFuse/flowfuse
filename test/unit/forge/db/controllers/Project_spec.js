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
        })
    })

    describe('exportProject', function () {
        it('', async function () {
            //
        })
    })
})
