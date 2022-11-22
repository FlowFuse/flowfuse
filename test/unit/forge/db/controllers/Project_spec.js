const should = require('should') // eslint-disable-line
const setup = require('../setup')
const crypto = require('crypto')
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
                { name: 'FF_FUTURE_UNKNOWN_ENV_VAR', value: 'future unknown env var starting with FF_ should be removed' },
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
                    { name: 'three', value: 'c' },
                    { name: 'FF_PROJECT_VAR_TEST', value: 'should not be saved and not returned' },
                    { name: 'FF_DEVICE_VAR_TEST', value: 'should not be saved and not returned' },
                    { name: 'FF_RANDOM_XXX_123', value: 'should not be saved and not returned' }
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
            result.env.should.have.property('FF_PROJECT_ID', project.id)
            result.env.should.have.property('FF_PROJECT_NAME', 'testProject')
            result.env.should.not.have.property('FF_PROJECT_VAR_TEST')
            result.env.should.not.have.property('FF_DEVICE_VAR_TEST')
            result.env.should.not.have.property('FF_RANDOM_XXX_123')
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

    describe('exportCredentials', function () {
        function decryptCreds (key, cipher) {
            let flows = cipher.$
            const initVector = Buffer.from(flows.substring(0, 32), 'hex')
            flows = flows.substring(32)
            const decipher = crypto.createDecipheriv('aes-256-ctr', key, initVector)
            const decrypted = decipher.update(flows, 'base64', 'utf8') + decipher.final('utf8')
            return JSON.parse(decrypted)
        }

        function encryptCreds (key, plain) {
            const initVector = crypto.randomBytes(16)
            const cipher = crypto.createCipheriv('aes-256-ctr', key, initVector)
            return { $: initVector.toString('hex') + cipher.update(JSON.stringify(plain), 'utf8', 'base64') + cipher.final('base64') }
        }

        it('re-encrypts credentials from old to new key', function () {
            const oldKey = 'oldkey'
            const oldHash = crypto.createHash('sha256').update(oldKey).digest()
            const newKey = 'newkey'
            const newHash = crypto.createHash('sha256').update(newKey).digest()

            const credentials = { foo: { a: 'b' } }
            const encrypted = encryptCreds(oldHash, credentials)

            const result = app.db.controllers.Project.exportCredentials(encrypted, oldKey, newKey)

            result.should.only.have.keys('$')
            ;(typeof result.$).should.equal('string')

            const decrypted = decryptCreds(newHash, result)
            decrypted.should.only.have.keys('foo')
        })
        it('encrypts credentials when no old key provided', function () {
            const newKey = 'newkey'
            const newHash = crypto.createHash('sha256').update(newKey).digest()

            const credentials = { foo: { a: 'b' } }
            const result = app.db.controllers.Project.exportCredentials(credentials, null, newKey)

            result.should.only.have.keys('$')
            ;(typeof result.$).should.equal('string')

            const decrypted = decryptCreds(newHash, result)
            decrypted.should.only.have.keys('foo')
        })
    })
    // describe('exportProject', function () {
    //     it('', async function () {
    //         //
    //     })
    // })
})
