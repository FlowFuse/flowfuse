const crypto = require('crypto')

const should = require('should') // eslint-disable-line
const { decryptCreds } = require('../../../../lib/credentials.js')
const setup = require('../setup')

describe('Snapshot controller', function () {
    // Use standard test data.
    let app
    let projectInstanceCount = 0
    /** @type {import('../../../../lib/TestModelFactory')} */
    let factory
    /** @type {import('../../../../../forge/db/controllers/Snapshot.js')} */
    let snapshotController

    async function createProject (application = null, team = null) {
        const options = { name: 'project-' + (projectInstanceCount++), type: '', url: '' }
        if (application) {
            options.ApplicationId = application.id
        }
        if (team) {
            options.TeamId = team.id
        }
        let project = await app.db.models.Project.create(options)
        await project.updateSetting('credentialSecret', 'c13f09839cb9072bdc61a3c1530629dad3da26b131d9434c7322bc2f7921f1cd')
        // Reload to ensure all models are attached
        project = await app.db.models.Project.byId(project.id)
        await app.db.models.StorageFlow.create({
            // a flow JSON containing a HTTP Request node with basic auth
            flow: JSON.stringify([{"id":"90f317c74dab03c1","type":"http request","z":"d55adbd49eb9c0a7","name":"","method":"GET","ret":"txt","paytoqs":"ignore","url":"http://localhost:1880/auth-test","tls":"","persist":false,"proxy":"","insecureHTTPParser":false,"authType":"basic","senderr":false,"headers":[],"x":460,"y":180,"wires":[["db4f0470eee740fb"]]}]), // eslint-disable-line
            ProjectId: project.id
        })
        await app.db.models.StorageCredentials.create({
            credentials: JSON.stringify({ $: '8f89788aada6a40fc7cc06f12de7ea53veCKFVBe7rpZpzwnLNH0iNXnf0oG0Ttclqq5g8gtBZX+pjnaD6eozWkV6Sps5d48ja2A+pK1' }),
            ProjectId: project.id
        })
        await app.db.models.StorageSettings.create({
            settings: JSON.stringify({}),
            ProjectId: project.id
        })
        await app.db.models.StorageSession.create({
            sessions: JSON.stringify({}),
            ProjectId: project.id
        })
        await project.updateSetting('settings', { env: [{ name: 'env1', value: 'a' }, { name: 'env2', value: 'b' }] })
        await project.reload()
        return project
    }

    before(async function () {
        app = await setup({
            limits: {
                instances: 50
            }
        })
        factory = app.factory
        app.TestObjects.application1 = await factory.createApplication({ name: 'application-1' }, app.TestObjects.team1)
        snapshotController = app.db.controllers.Snapshot
    })

    after(async function () {
        await app.close()
    })

    afterEach(async function () {
        await app.db.models.ProjectSnapshot.destroy({ where: {} })
    })

    describe.skip('getSnapshot', function () {
        // TODO: Implement test
    })

    describe.skip('updateSnapshot', function () {
        // TODO: Implement test
    })

    describe('exportSnapshot', function () {
        let instanceSnapshot
        let instance
        before(async function () {
            instance = await createProject()
            const user = await app.TestObjects.userAlice
            const options = {
                name: 'snapshot-with-options',
                description: 'a full snapshot'
            }
            instanceSnapshot = await factory.createSnapshot(options, instance, user)
        })

        it('should export a full snapshot by default', async function () {
            const reencryptSecret = 'abc'
            const options = {
                credentialSecret: reencryptSecret
                // components: // excluded to use defaults
            }

            const snapshotExported = await snapshotController.exportSnapshot(instanceSnapshot, options)
            should.exist(snapshotExported)
            snapshotExported.should.be.an.Object()
            snapshotExported.should.have.properties('id', 'name', 'description', 'settings', 'credentialSecret', 'flows', 'ownerType', 'ProjectId')
            snapshotExported.id.should.equal(instanceSnapshot.id)
            snapshotExported.name.should.equal(instanceSnapshot.name)
            snapshotExported.description.should.equal(instanceSnapshot.description)
            snapshotExported.settings.should.only.have.keys('settings', 'env', 'modules')
            snapshotExported.settings.settings.should.deepEqual(instanceSnapshot.settings.settings)
            snapshotExported.settings.modules.should.deepEqual(instanceSnapshot.settings.modules)

            // ensure flows are exported
            snapshotExported.flows.should.have.only.keys('flows', 'credentials')
            snapshotExported.flows.flows.should.deepEqual(instanceSnapshot.flows.flows)

            // ensure credentials are exported
            snapshotExported.flows.credentials.should.be.an.Object()
            snapshotExported.flows.credentials.should.have.only.keys('$')
            const keyHash = crypto.createHash('sha256').update(reencryptSecret).digest()
            const creds = decryptCreds(keyHash, snapshotExported.flows.credentials)
            creds.should.only.have.keys('90f317c74dab03c1').and.be.an.Object()
            creds['90f317c74dab03c1'].should.only.have.keys('user', 'password')
            creds['90f317c74dab03c1'].user.should.equal('auth')
            creds['90f317c74dab03c1'].password.should.equal('test')

            // ensure exported env var are present and correct
            snapshotExported.settings.should.have.properties('env')
            snapshotExported.settings.env.should.deepEqual({ env1: 'a', env2: 'b' })
        })

        it('should export a snapshot without creds', async function () {
            const options = {
                components: {
                    credentials: false
                }
            }

            const snapshotExported = await snapshotController.exportSnapshot(instanceSnapshot, options)
            should.exist(snapshotExported)
            snapshotExported.should.be.an.Object()
            snapshotExported.should.have.properties('id', 'name', 'description', 'settings', 'flows', 'ownerType', 'ProjectId')
            snapshotExported.id.should.equal(instanceSnapshot.id)
            snapshotExported.name.should.equal(instanceSnapshot.name)
            snapshotExported.description.should.equal(instanceSnapshot.description)
            snapshotExported.settings.should.only.have.keys('settings', 'env', 'modules')
            snapshotExported.settings.settings.should.deepEqual(instanceSnapshot.settings.settings)
            snapshotExported.settings.modules.should.deepEqual(instanceSnapshot.settings.modules)

            // ensure flows are exported and credentials are excluded
            snapshotExported.flows.should.have.only.keys('flows', 'credentials')
            snapshotExported.flows.flows.should.deepEqual(instanceSnapshot.flows.flows)
            snapshotExported.flows.credentials.should.deepEqual({})

            // ensure exported env var are present and correct
            snapshotExported.settings.should.have.properties('env')
            snapshotExported.settings.env.should.deepEqual({ env1: 'a', env2: 'b' })
        })

        it('should export a snapshot without flows', async function () {
            const options = {
                components: {
                    flows: false
                }
            }
            // since credentials are for flows, they should be excluded as well
            const snapshotExported = await snapshotController.exportSnapshot(instanceSnapshot, options)
            should.exist(snapshotExported)
            snapshotExported.should.be.an.Object()
            snapshotExported.should.have.properties('id', 'name', 'description', 'settings', 'credentialSecret', 'flows', 'ownerType', 'ProjectId')
            snapshotExported.id.should.equal(instanceSnapshot.id)
            snapshotExported.name.should.equal(instanceSnapshot.name)
            snapshotExported.description.should.equal(instanceSnapshot.description)
            snapshotExported.settings.should.only.have.keys('settings', 'env', 'modules')
            snapshotExported.settings.should.only.have.keys('settings', 'env', 'modules')
            snapshotExported.settings.settings.should.deepEqual(instanceSnapshot.settings.settings)
            snapshotExported.settings.modules.should.deepEqual(instanceSnapshot.settings.modules)

            // ensure flows and credentials are excluded
            snapshotExported.flows.should.have.only.keys('flows', 'credentials')
            snapshotExported.flows.flows.should.deepEqual([])
            snapshotExported.flows.credentials.should.deepEqual({})

            // ensure exported env var are present and correct
            snapshotExported.settings.should.have.properties('env')
            snapshotExported.settings.env.should.deepEqual({ env1: 'a', env2: 'b' })
        })

        it('should export a snapshot without env (envVars: false)', async function () {
            const options = {
                credentialSecret: 'abc',
                components: {
                    envVars: false
                }
            }

            const snapshotExported = await snapshotController.exportSnapshot(instanceSnapshot, options)
            should.exist(snapshotExported)
            snapshotExported.should.be.an.Object()
            snapshotExported.should.have.properties('id', 'name', 'description', 'settings', 'credentialSecret', 'flows', 'ownerType', 'ProjectId')
            snapshotExported.id.should.equal(instanceSnapshot.id)
            snapshotExported.name.should.equal(instanceSnapshot.name)
            snapshotExported.description.should.equal(instanceSnapshot.description)
            snapshotExported.settings.should.only.have.keys('settings', 'env', 'modules')
            // ensure flows are exported
            snapshotExported.flows.should.have.only.keys('flows', 'credentials')
            snapshotExported.flows.flows.should.deepEqual(instanceSnapshot.flows.flows)
            // ensure credentials are exported
            snapshotExported.flows.credentials.should.be.an.Object()
            snapshotExported.flows.credentials.should.have.only.keys('$')
            // ensure env are excluded
            snapshotExported.settings.env.should.deepEqual({})
        })

        it('should export a snapshot without env values (envVars: "keys")', async function () {
            const options = {
                credentialSecret: 'abc',
                components: {
                    envVars: 'keys'
                }
            }

            const snapshotExported = await snapshotController.exportSnapshot(instanceSnapshot, options)
            should.exist(snapshotExported)
            snapshotExported.should.be.an.Object()
            snapshotExported.should.have.properties('id', 'name', 'description', 'settings', 'credentialSecret', 'flows', 'ownerType', 'ProjectId')
            snapshotExported.id.should.equal(instanceSnapshot.id)
            snapshotExported.name.should.equal(instanceSnapshot.name)
            snapshotExported.description.should.equal(instanceSnapshot.description)
            snapshotExported.settings.should.only.have.keys('settings', 'env', 'modules')
            // ensure flows are exported
            snapshotExported.flows.should.have.only.keys('flows', 'credentials')
            snapshotExported.flows.flows.should.deepEqual(instanceSnapshot.flows.flows)
            // ensure credentials are exported
            snapshotExported.flows.credentials.should.be.an.Object()
            snapshotExported.flows.credentials.should.have.only.keys('$')
            // ensure env are exported with keys only
            snapshotExported.settings.should.have.property('env')
            snapshotExported.settings.env.should.deepEqual({ env1: '', env2: '' })
        })
    })

    describe('uploadSnapshot', function () {
        let alice
        let instance
        let counter = 0

        function generateSnapshot (name, description, flows, creds, env, ownerType) {
            counter++
            const fullSnapshot = {
                flows: {
                    flows: flows || [
                        {
                            id: '90f317c74dab03c1',
                            type: 'http request',
                            z: 'd55adbd49eb9c0a7',
                            name: '',
                            method: 'GET',
                            ret: 'txt',
                            paytoqs: 'ignore',
                            url: 'http://192.168.86.45:12095/auth-test',
                            tls: '',
                            persist: false,
                            proxy: '',
                            insecureHTTPParser: false,
                            authType: 'basic',
                            senderr: false,
                            headers: [],
                            x: 460,
                            y: 180,
                            wires: [['db4f0470eee740fb']]
                        }
                    ],
                    credentials: creds || {
                        $: '92c3a4152076d6d8489b3de60f97f551LnSwcIJl9Q+l6Xz6WFCPQLMVRiGbyjkwR2MOuvi8HOV41oBO6MiBepsZ1lbhDwLxv2uHWmVA'
                    }
                },
                id: '6KbgK9BO4a',
                name: name || 'full snapshot ' + counter,
                description: description || 'full snapshot ' + counter,
                createdAt: '2024-10-02T16:56:15.175Z',
                updatedAt: '2024-10-02T16:56:15.175Z',
                user: {
                    id: 'EexY4j17B2',
                    username: 'steve',
                    name: 'steve-mcl',
                    avatar: 'http://localhost:3000/avatar/c3RldmU',
                    admin: true,
                    createdAt: '2023-12-15T18:51:43.578Z',
                    suspended: false
                },
                exportedBy: {
                    id: 'EexY4j17B2',
                    username: 'steve',
                    name: 'steve-mcl',
                    avatar: 'http://localhost:3000/avatar/c3RldmU',
                    admin: true,
                    createdAt: '2023-12-15T18:51:43.578Z',
                    suspended: false
                },
                ownerType: ownerType || 'instance',
                settings: {
                    settings: {
                        disableEditor: false,
                        disableTours: false,
                        codeEditor: 'monaco',
                        theme: 'forge-light',
                        page: {
                            title: 'FlowFuse',
                            favicon: ''
                        },
                        header: {
                            title: 'snapshot-import-export-options',
                            url: ''
                        },
                        timeZone: 'UTC',
                        palette: {
                            allowInstall: true,
                            catalogue: [
                                'https://catalogue.nodered.org/catalogue.json'
                            ],
                            npmrc: '',
                            denyList: [],
                            modules: {}
                        },
                        modules: {
                            allowInstall: true,
                            denyList: []
                        },
                        httpNodeAuth: {
                            type: 'none',
                            user: '',
                            pass: ''
                        },
                        emailAlerts: {
                            crash: false,
                            safe: false,
                            recipients: 'owners'
                        },
                        debugMaxLength: 1000,
                        apiMaxLength: '5mb',
                        httpAdminRoot: '',
                        dashboardUI: '/ui'
                    },
                    env: env || {
                        ev1: 'ev1',
                        ev2: 'ev2',
                        ev3: 'ev3',
                        ev4: 'ev4'
                    },
                    modules: {
                        'node-red': '4.0.3'
                    }
                }
            }
            return fullSnapshot
        }

        before(async function () {
            alice = await app.TestObjects.userAlice
            instance = await createProject()
        })

        it('should upload a snapshot', async function () {
            const fullSnapshot = generateSnapshot()
            const options = {
                // components: {} // excluded to use defaults
            }
            const importedSnapshot = await snapshotController.uploadSnapshot(instance, fullSnapshot, 'the secret', alice, options)
            should.exist(importedSnapshot)
            importedSnapshot.should.be.an.Object()
            // should be a squelize model
            importedSnapshot.should.be.an.instanceOf(app.db.models.ProjectSnapshot)
            importedSnapshot.should.have.properties('id', 'name', 'description', 'settings', 'flows', 'credentialSecret', 'ownerType', 'ProjectId')
            importedSnapshot.id.should.not.equal(fullSnapshot.id)
            importedSnapshot.name.should.equal(fullSnapshot.name)
            importedSnapshot.description.should.equal(fullSnapshot.description)
            importedSnapshot.settings.should.deepEqual(fullSnapshot.settings)

            // ensure flows are imported correctly
            importedSnapshot.flows.should.only.have.keys('flows', 'credentials')
            importedSnapshot.flows.flows.should.deepEqual(fullSnapshot.flows.flows)

            // ensure credentials are imported correctly
            importedSnapshot.flows.credentials.should.be.an.Object()
            const keyHash = crypto.createHash('sha256').update(importedSnapshot.credentialSecret).digest()
            const creds = decryptCreds(keyHash, importedSnapshot.flows.credentials)
            creds.should.only.have.keys('90f317c74dab03c1').and.be.an.Object()
            creds['90f317c74dab03c1'].should.only.have.keys('user', 'password')
            creds['90f317c74dab03c1'].user.should.equal('auth')
            creds['90f317c74dab03c1'].password.should.equal('test')

            // ensure env vars and values are imported correctly
            importedSnapshot.settings.should.have.properties('env')
            importedSnapshot.settings.env.should.deepEqual(fullSnapshot.settings.env)
        })

        it('should upload a snapshot without creds', async function () {
            const fullSnapshot = generateSnapshot()
            const options = {
                components: {
                    credentials: false
                }
            }
            const importedSnapshot = await snapshotController.uploadSnapshot(instance, fullSnapshot, 'the secret', alice, options)
            should.exist(importedSnapshot)
            importedSnapshot.should.be.an.Object()
            // should be a squelize model
            importedSnapshot.should.be.an.instanceOf(app.db.models.ProjectSnapshot)
            importedSnapshot.should.have.properties('id', 'name', 'description', 'settings', 'flows', 'credentialSecret', 'ownerType', 'ProjectId')
            importedSnapshot.id.should.not.equal(fullSnapshot.id)
            importedSnapshot.name.should.equal(fullSnapshot.name)
            importedSnapshot.description.should.equal(fullSnapshot.description)
            importedSnapshot.settings.should.deepEqual(fullSnapshot.settings)

            // ensure flows are imported correctly
            importedSnapshot.flows.should.only.have.keys('flows', 'credentials')
            importedSnapshot.flows.flows.should.deepEqual(fullSnapshot.flows.flows)

            // ensure credentials are excluded
            importedSnapshot.flows.credentials.should.deepEqual({})

            // ensure env vars and values are imported correctly
            importedSnapshot.settings.should.have.properties('env')
            importedSnapshot.settings.env.should.deepEqual(fullSnapshot.settings.env)
        })

        it('should upload a snapshot without flows', async function () {
            const fullSnapshot = generateSnapshot()
            const options = {
                components: {
                    flows: false
                }
            }
            const importedSnapshot = await snapshotController.uploadSnapshot(instance, fullSnapshot, 'the secret', alice, options)
            should.exist(importedSnapshot)
            importedSnapshot.should.be.an.Object()
            // should be a squelize model
            importedSnapshot.should.be.an.instanceOf(app.db.models.ProjectSnapshot)
            importedSnapshot.should.have.properties('id', 'name', 'description', 'settings', 'flows', 'credentialSecret', 'ownerType', 'ProjectId')
            importedSnapshot.id.should.not.equal(fullSnapshot.id)
            importedSnapshot.name.should.equal(fullSnapshot.name)
            importedSnapshot.description.should.equal(fullSnapshot.description)
            importedSnapshot.settings.should.deepEqual(fullSnapshot.settings)

            // ensure flows are excluded
            importedSnapshot.flows.should.only.have.keys('flows', 'credentials')
            importedSnapshot.flows.flows.should.deepEqual([])
            importedSnapshot.flows.credentials.should.deepEqual({}) // no flows, no creds!

            // ensure env vars and values are imported correctly
            importedSnapshot.settings.should.have.properties('env')
            importedSnapshot.settings.env.should.deepEqual(fullSnapshot.settings.env)
        })

        it('should upload a snapshot without env (envVars: false)', async function () {
            const fullSnapshot = generateSnapshot()
            const options = {
                components: {
                    envVars: false
                }
            }
            const importedSnapshot = await snapshotController.uploadSnapshot(instance, fullSnapshot, 'the secret', alice, options)
            should.exist(importedSnapshot)
            importedSnapshot.should.be.an.Object()
            // should be a squelize model
            importedSnapshot.should.be.an.instanceOf(app.db.models.ProjectSnapshot)
            importedSnapshot.should.have.properties('id', 'name', 'description', 'settings', 'flows', 'credentialSecret', 'ownerType', 'ProjectId')
            importedSnapshot.id.should.not.equal(fullSnapshot.id)
            importedSnapshot.name.should.equal(fullSnapshot.name)
            importedSnapshot.description.should.equal(fullSnapshot.description)

            // ensure flows and creds are imported
            importedSnapshot.flows.should.only.have.keys('flows', 'credentials')
            importedSnapshot.flows.flows.should.deepEqual(fullSnapshot.flows.flows)

            // ensure credentials are imported correctly
            importedSnapshot.flows.credentials.should.be.an.Object()
            importedSnapshot.flows.credentials.should.have.only.keys('$')

            // ensure env vars are excluded
            importedSnapshot.settings.should.have.properties('env')
            importedSnapshot.settings.env.should.deepEqual({})
        })

        it('should upload a snapshot without env values (envVars: "keys")', async function () {
            const fullSnapshot = generateSnapshot()
            const options = {
                components: {
                    envVars: 'keys'
                }
            }
            const importedSnapshot = await snapshotController.uploadSnapshot(instance, fullSnapshot, 'the secret', alice, options)
            should.exist(importedSnapshot)
            importedSnapshot.should.be.an.Object()
            // should be a squelize model
            importedSnapshot.should.be.an.instanceOf(app.db.models.ProjectSnapshot)
            importedSnapshot.should.have.properties('id', 'name', 'description', 'settings', 'flows', 'credentialSecret', 'ownerType', 'ProjectId')
            importedSnapshot.id.should.not.equal(fullSnapshot.id)
            importedSnapshot.name.should.equal(fullSnapshot.name)
            importedSnapshot.description.should.equal(fullSnapshot.description)

            // ensure flows and creds are imported
            importedSnapshot.flows.should.only.have.keys('flows', 'credentials')
            importedSnapshot.flows.flows.should.deepEqual(fullSnapshot.flows.flows)

            // ensure credentials are imported correctly
            importedSnapshot.flows.credentials.should.be.an.Object()
            importedSnapshot.flows.credentials.should.have.only.keys('$')

            // ensure env vars are imported with keys only
            importedSnapshot.settings.should.have.properties('env')
            importedSnapshot.settings.env.should.deepEqual({ ev1: '', ev2: '', ev3: '', ev4: '' })
        })
    })

    describe.skip('deleteSnapshot', function () {
        // TODO: Implement test
    })
})
