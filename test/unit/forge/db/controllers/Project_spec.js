const crypto = require('crypto')

const should = require('should') // eslint-disable-line
const { encryptCreds, decryptCreds } = require('../../../../lib/credentials')
const setup = require('../setup')
// const FF_UTIL = require('flowforge-test-utils')
// const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Project controller', function () {
    // Use standard test data.
    let app
    before(async function () {
        app = await setup({
            limits: {
                instances: 50
            }
        })
    })

    after(async function () {
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
            should(env).be.an.Array().with.lengthOf(4)
            env.should.containEql({ name: 'FF_PROJECT_NAME', value: 'project1', platform: true, deprecated: true }) // deprecated in favour of FF_INSTANCE_NAME as of V1.6.0
            env.should.containEql({ name: 'FF_PROJECT_ID', value: project.id, platform: true, deprecated: true }) // deprecated in favour of FF_INSTANCE_ID as of V1.6.0
            env.should.containEql({ name: 'FF_INSTANCE_NAME', value: 'project1', platform: true, deprecated: undefined })
            env.should.containEql({ name: 'FF_INSTANCE_ID', value: project.id, platform: true, deprecated: undefined })
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
            should(env).be.an.Array().with.lengthOf(6)
            env.should.containEql({ name: 'FF_PROJECT_NAME', value: 'project2', platform: true, deprecated: true }) // deprecated in favour of FF_INSTANCE_NAME as of V1.6.0
            env.should.containEql({ name: 'FF_PROJECT_ID', value: project.id, platform: true, deprecated: true }) // deprecated in favour of FF_INSTANCE_ID as of V1.6.0
            env.should.containEql({ name: 'FF_INSTANCE_NAME', value: 'project2', platform: true, deprecated: undefined })
            env.should.containEql({ name: 'FF_INSTANCE_ID', value: project.id, platform: true, deprecated: undefined })
            env.should.containEql({ name: 'one', value: '1' })
            env.should.containEql({ name: 'two', value: '2' })
        })
        it('removes env vars', async function () {
            const dummyEnvVars = [
                { name: 'FF_FUTURE_UNKNOWN_ENV_VAR', value: 'future unknown env var starting with FF_ should be removed' },
                { name: 'FF_PROJECT_ID', value: 'a' }, // deprecated in favour of FF_INSTANCE_ID as of V1.6.0
                { name: 'FF_PROJECT_NAME', value: 'b' }, // deprecated in favour of FF_INSTANCE_NAME as of V1.6.0
                { name: 'FF_INSTANCE_ID', value: 'a' },
                { name: 'FF_INSTANCE_NAME', value: 'b' },
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
                name: 'defaultTemplate-001',
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
                name: 'testProject-001',
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
            result.env.should.have.property('FF_PROJECT_ID', project.id) // deprecated in favour of FF_INSTANCE_ID as of V1.6.0
            result.env.should.have.property('FF_PROJECT_NAME', 'testProject-001') // deprecated in favour of FF_INSTANCE_NAME as of V1.6.0
            result.env.should.have.property('FF_INSTANCE_ID', project.id)
            result.env.should.have.property('FF_INSTANCE_NAME', 'testProject-001')
            result.env.should.not.have.property('FF_PROJECT_VAR_TEST')
            result.env.should.not.have.property('FF_DEVICE_VAR_TEST')
            result.env.should.not.have.property('FF_RANDOM_XXX_123')
        })
        it('does not merge template palette modules into runtime settings', async function () {
            const template = await app.db.models.ProjectTemplate.create({
                name: 'defaultTemplate-002',
                active: true,
                settings: {
                    palette: {
                        modules: [
                            { name: 'node-red-node-random', version: '1.2.2', local: true },
                            { name: 'node-red-node-badwords', version: '0.1.0', local: true }
                        ]
                    }
                },
                policy: {}
            })
            const project = await app.db.models.Project.create({
                name: 'testProject-001a',
                type: '',
                url: ''
            })
            await project.setProjectTemplate(template)

            const newProjectSettings = {
                palette: {
                    modules: [
                        { name: 'node-red-node-random', version: '1.2.3', local: true }, // upgrade
                        { name: 'node-red-node-ping', version: '0.3.3', local: true } // new/add
                    ]
                }
            }
            await project.updateSetting('settings', newProjectSettings)

            const reloadedProject = await app.db.models.Project.byId(project.id)
            const result = await app.db.controllers.Project.getRuntimeSettings(reloadedProject)

            result.should.have.property('palette')
            result.palette.should.have.property('modules')
            result.palette.modules.should.have.property('node-red-node-random', '1.2.3') // unchanged (still has project value)
            result.palette.modules.should.have.property('node-red-node-ping', '0.3.3') // unchanged (still has project value)
            result.palette.modules.should.not.have.property('node-red-node-badwords') // template item NOT merged into project settings
        })
    })

    describe('addProjectModule', function () {
        it('adds modules to existing project settings', async function () {
            let project = await app.db.models.Project.create({
                name: 'testProject-002',
                type: '',
                url: ''
            })

            project = await app.db.models.Project.byId(project.id)
            await project.updateSetting('settings', {
                palette: {
                    modules: [
                        { name: 'upgraded-module', version: '1', local: true },
                        { name: 'another-module', version: '1', local: true }
                    ]
                }
            })

            await app.db.controllers.Project.addProjectModule(project, 'new-module', '1')
            await app.db.controllers.Project.addProjectModule(project, 'upgraded-module', '2')

            const updatedSettings = await project.getSetting('settings')
            updatedSettings.palette.modules.should.have.length(3)
            updatedSettings.palette.modules.sort((A, B) => A.name.localeCompare(B.name))

            // 'another-module' left untouched
            updatedSettings.palette.modules[0].should.have.property('name', 'another-module')
            updatedSettings.palette.modules[0].should.have.property('version', '1')

            // 'new-module' added
            updatedSettings.palette.modules[1].should.have.property('name', 'new-module')
            updatedSettings.palette.modules[1].should.have.property('version', '~1')

            // 'upgraded-module' added
            updatedSettings.palette.modules[2].should.have.property('name', 'upgraded-module')
            updatedSettings.palette.modules[2].should.have.property('version', '~2')
        })
    })
    describe('removeProjectModule', function () {
        it('removes module from existing project settings', async function () {
            let project = await app.db.models.Project.create({
                name: 'testProject-003',
                type: '',
                url: ''
            })

            project = await app.db.models.Project.byId(project.id)
            await project.updateSetting('settings', {
                palette: {
                    modules: [
                        { name: 'upgraded-module', version: '1', local: true },
                        { name: 'another-module', version: '1', local: true }
                    ]
                }
            })

            await app.db.controllers.Project.removeProjectModule(project, 'another-module', '1')

            const updatedSettings = await project.getSetting('settings')
            updatedSettings.palette.modules.should.have.length(1)
            updatedSettings.palette.modules.sort((A, B) => A.name.localeCompare(B.name))

            // 'upgraded-module' untouched
            updatedSettings.palette.modules[0].should.have.property('name', 'upgraded-module')
            updatedSettings.palette.modules[0].should.have.property('version', '1')
        })
    })

    describe('mergeProjectModules', function () {
        it('updates without project that has no modules currently', async function () {
            const project = await app.db.models.Project.create({
                name: 'testProject-004',
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

        it('adds new modules to project settings', async function () {
            const project = await app.db.models.Project.create({
                name: 'testProject-005',
                type: '',
                url: ''
            })

            await project.updateSetting('settings', {
                palette: {
                    modules: [
                        { name: 'not-upgraded-module', version: '1', local: true },
                        { name: 'another-module', version: '1', local: true }
                    ]
                }
            })

            const reloadedProject = await app.db.models.Project.byId(project.id)

            await app.db.controllers.Project.mergeProjectModules(reloadedProject, [
                { name: 'new-module', version: '1', local: true },
                { name: 'not-upgraded-module', version: '2', local: true }
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

            // 'not-upgraded-module' untouched
            updatedSettings.palette.modules[2].should.have.property('name', 'not-upgraded-module')
            updatedSettings.palette.modules[2].should.have.property('version', '1')
        })

        it('updates existing modules in project settings', async function () {
            const project = await app.db.models.Project.create({
                name: 'testProject-006',
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
            ],
            true) // <-- flag to update existing)

            const updatedSettings = await project.getSetting('settings')
            updatedSettings.palette.modules.should.have.length(3)
            updatedSettings.palette.modules.sort((A, B) => A.name.localeCompare(B.name))
            // 'another-module' left untouched
            updatedSettings.palette.modules[0].should.have.property('name', 'another-module')
            updatedSettings.palette.modules[0].should.have.property('version', '1')

            // 'new-module' added
            updatedSettings.palette.modules[1].should.have.property('name', 'new-module')
            updatedSettings.palette.modules[1].should.have.property('version', '~1')

            // 'not-upgraded-module' untouched
            updatedSettings.palette.modules[2].should.have.property('name', 'upgraded-module')
            updatedSettings.palette.modules[2].should.have.property('version', '~2')
        })
    })

    describe('exportCredentials', function () {
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

    describe('importProjectSnapshot', function () {
        it('imports project snapshot that contains flows with credentials/storageflows when the project contains no credentials/storageflows yet', async function () {
            const project = await app.db.models.Project.create({
                name: 'testProject-007',
                type: '',
                url: ''
            })

            const snapshot = {
                flows: {
                    flows: [
                        { id: '1', type: 'tab', label: 'Sheet 1', disabled: false, info: '' },
                        { id: '2', type: 'tab', label: 'Sheet 2', disabled: false, info: '' }
                    ],
                    credentials: {
                        foo: { a: 'b' }
                    }
                }
            }

            await app.db.controllers.Project.importProjectSnapshot(project, snapshot)

            const savedCredentials = await app.db.models.StorageCredentials.byProject(project.id)
            const savedStorageFlows = await app.db.models.StorageFlow.byProject(project.id)

            const parsedCredentials = JSON.parse(savedCredentials.credentials)
            const parsedStorageFlows = JSON.parse(savedStorageFlows.flow)

            parsedCredentials.should.have.keys('foo')
            parsedCredentials.foo.should.have.property('a', 'b')

            parsedStorageFlows.should.have.length(2)
            parsedStorageFlows.should.containDeepOrdered([
                { id: '1', type: 'tab', label: 'Sheet 1', disabled: false, info: '' },
                { id: '2', type: 'tab', label: 'Sheet 2', disabled: false, info: '' }
            ])
        })
    })

    it('merges env vars with priority to the source if the flag is set', async function () {
        const instance = await app.db.models.Project.create({
            name: 'new-project',
            type: '',
            url: ''
        })

        await instance.updateSettings({
            settings: {
                // as array
                env: [
                    { name: 'REMOVED_KEY', value: 'old-value-1' }, // should not get changed
                    { name: 'EXISTING_KEY', value: 'old-value-2' } // should not get changed
                ]
            }
        })

        const snapshot = {
            flows: { flows: [] },
            settings: {
                // as object is convered to array when saved to DB
                env: {
                    EXISTING_KEY: 'new-value-2', // should do nothing
                    NEW_KEY: 'new-value-3' // should be added
                }
            }
        }

        await app.db.controllers.Project.importProjectSnapshot(instance, snapshot, { mergeEnvVars: true })

        const instanceSettings = await instance.getSetting('settings')

        instanceSettings.env.length.should.equal(3)
        instanceSettings.env.map((envVar) => envVar.name).should.match(['REMOVED_KEY', 'EXISTING_KEY', 'NEW_KEY'])

        instanceSettings.env[0].name.should.equal('REMOVED_KEY')
        instanceSettings.env[0].value.should.equal('old-value-1')

        instanceSettings.env[1].name.should.equal('EXISTING_KEY')
        instanceSettings.env[1].value.should.equal('old-value-2')

        instanceSettings.env[2].name.should.equal('NEW_KEY')
        instanceSettings.env[2].value.should.equal('new-value-3')
    })
})
