const crypto = require('crypto')
const sleep = require('util').promisify(setTimeout)

const should = require('should')
const sinon = require('sinon')

const { createSnapshot } = require('../../../../../../forge/services/snapshots')
const TestModelFactory = require('../../../../../lib/TestModelFactory.js')

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')

const { START_DELAY, STOP_DELAY } = FF_UTIL.require('forge/containers/stub/index.js')

const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Projects API (EE)', function () {
    describe('Projects API - with billing enabled', function () {
        const sandbox = sinon.createSandbox()

        const TestObjects = { tokens: {} }

        let app

        async function login (username, password) {
            const response = await app.inject({
                method: 'POST',
                url: '/account/login',
                payload: { username, password, remember: false }
            })
            response.cookies.should.have.length(1)
            response.cookies[0].should.have.property('name', 'sid')
            TestObjects.tokens[username] = response.cookies[0].value
        }

        beforeEach(async function () {
            app = await setup()
            sandbox.stub(app.log, 'info')
            sandbox.stub(app.log, 'warn')
            sandbox.stub(app.log, 'error')
            sandbox.stub(app.billing, 'addProject')
            sandbox.stub(app.billing, 'removeProject')

            await login('alice', 'aaPassword')
        })

        afterEach(async function () {
            await app.close()
            delete require.cache[require.resolve('stripe')]
            sandbox.restore()
        })

        describe('Update Project', function () {
            describe('Change project type', function () {
                it('Removes and re-adds the project to billing', async function () {
                    const project = app.project

                    // Create a new project type
                    const projectTypeProperties = {
                        name: 'projectType-new',
                        description: 'This is a new project type',
                        active: true,
                        properties: { bar: 'foo' }
                    }
                    const projectType = await app.db.models.ProjectType.create(projectTypeProperties)

                    // Create a new stack
                    const stackProperties = {
                        name: 'stack-new',
                        active: true,
                        properties: { nodered: '9.9.9' }
                    }
                    const stack = await app.db.models.ProjectStack.create(stackProperties)
                    await stack.setProjectType(projectType)

                    // Put project in running state
                    await app.containers.start(project)
                    app.billing.addProject.resetHistory()
                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/projects/${app.project.id}`,
                        payload: {
                            projectType: projectType.hashid,
                            stack: stack.hashid
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })
                    response.statusCode.should.equal(200)

                    await sleep(START_DELAY + STOP_DELAY + 100)

                    should.equal(app.billing.removeProject.calledOnce, true)
                    should.equal(app.billing.addProject.calledOnce, true)
                })
            })

            describe('Change project stack', function () {
                it('Skips removing the project from billing when changing only stack but marks billing state as billed', async function () {
                    const project = app.project

                    // Create a new stack
                    const stackProperties = {
                        name: 'stack-new',
                        active: true,
                        properties: { nodered: '9.9.9' }
                    }
                    const stack = await app.db.models.ProjectStack.create(stackProperties)
                    await stack.setProjectType(app.projectType)

                    // Put project in running state
                    await app.containers.start(project)
                    app.billing.addProject.resetHistory()

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/projects/${app.project.id}`,
                        payload: {
                            stack: stack.hashid
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })

                    response.statusCode.should.equal(200)

                    await sleep(STOP_DELAY + 50)

                    await sleep(START_DELAY + 50)

                    should.equal(app.billing.removeProject.calledOnce, false) // skipped
                    should.equal(app.billing.addProject.calledOnce, true)
                })
            })
        })
    })

    describe('npmrc values should be hidden from none owners', function () {
        const TestObjects = {}

        let app
        const sandbox = sinon.createSandbox()

        async function login (username, password) {
            const response = await app.inject({
                method: 'POST',
                url: '/account/login',
                payload: { username, password, remember: false }
            })
            response.cookies.should.have.length(1)
            response.cookies[0].should.have.property('name', 'sid')
            TestObjects.tokens[username] = response.cookies[0].value
        }

        before(async function () {
            app = await setup()
            sandbox.stub(app.billing, 'addProject')
            sandbox.stub(app.billing, 'removeProject')

            TestObjects.alice = await app.db.models.User.byUsername('alice')
            TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
            TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

            // ATeam create in setup()
            TestObjects.ATeam = await app.db.models.Team.byName('ATeam')

            TestObjects.ApplicationA = app.application

            await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Member } })

            TestObjects.tokens = {}
            await login('alice', 'aaPassword')
            await login('bob', 'bbPassword')
            await login('chris', 'ccPassword')

            // TestObjects.tokens.alice = (await app.db.controllers.AccessToken.createTokenForPasswordReset(TestObjects.alice)).token
            TestObjects.tokens.project = (await app.project.refreshAuthTokens()).token

            TestObjects.projectType1 = app.projectType
            TestObjects.stack1 = app.stack

            const props = TestObjects.ATeam.TeamType.properties
            props.features.customCatalogs = true
            TestObjects.ATeam.TeamType.properties = props
            await TestObjects.ATeam.TeamType.save()

            const unlockedTemplate = await app.factory.createProjectTemplate(
                {
                    name: 'startTemplate',
                    settings: {
                        palette: {
                            catalogue: ['https://www.first.com'],
                            npmrc: '//_authToken=token'
                        }
                    },
                    policy: {
                        palette: {
                            npmrc: true
                        }
                    }
                },
                app.user
            )
            const lockedTemplate = await app.factory.createProjectTemplate(
                {
                    name: 'endTemplate',
                    settings: {
                        palette: {
                            catalogue: ['https://www.second.com', 'https://third.com'],
                            npmrc: '//_authToken=token'
                        }
                    },
                    policy: {
                        palette: {
                            npmrc: false
                        }
                    }
                },
                app.user
            )
            const unlockedInstance = await app.factory.createInstance(
                { name: 'unlocked' },
                TestObjects.ApplicationA,
                TestObjects.stack,
                unlockedTemplate,
                TestObjects.projectType,
                { start: true }
            )
            TestObjects.unlockedInstance = unlockedInstance
            const lockedInstance = await app.factory.createInstance(
                { name: 'locked' },
                TestObjects.ApplicationA,
                TestObjects.stack,
                lockedTemplate,
                TestObjects.projectType,
                { start: true }
            )
            TestObjects.lockedInstance = lockedInstance
        })

        after(async function () {
            await app.close()
        })

        it('npmrc should be shown to owner if unlocked', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.unlockedInstance.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.template.settings.palette.npmrc.should.equal('//_authToken=token')
        })
        it('npmrc should be hidden from owner if locked', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.lockedInstance.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.template.settings.palette.npmrc.should.equal('//_authToken="xxxxxxx"')
        })
        it('npmrc should be hidden from member', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.unlockedInstance.id}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.template.settings.palette.npmrc.should.equal('//_authToken="xxxxxxx"')
        })
    })

    describe('History timeline', function () {
        const TestObjects = {
            /** admin */ alice: null,
            /** owner */ bob: null,
            /** member */ chris: null,
            /** viewer */ dave: null,
            /** non member */ elvis: null,
            instanceOne: null,
            instanceTwo: null,
            team: null,
            application: null,
            stack: null,
            template: null,
            projectType: null,
            tokens: {
                alice: null,
                bob: null,
                chris: null,
                dave: null,
                elvis: null
            },
            /** @type {TestModelFactory} */
            factory: null
        }

        let app
        const sandbox = sinon.createSandbox()
        /** @type {import('../../../../../../forge/auditLog/project.js').getLoggers} */
        const getProjectLogger = (app) => { return app?.auditLog?.Project }
        let projectLogger = getProjectLogger(app)

        async function enableTeamTypeFeatureFlag (enabled) {
            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { name: 'starter' } })
            const defaultTeamTypeProperties = defaultTeamType.properties
            defaultTeamTypeProperties.features.projectHistory = enabled
            defaultTeamType.properties = defaultTeamTypeProperties
            await defaultTeamType.save()
        }

        async function login (username, password) {
            const response = await app.inject({
                method: 'POST',
                url: '/account/login',
                payload: { username, password, remember: false }
            })
            response.cookies.should.have.length(1)
            response.cookies[0].should.have.property('name', 'sid')
            TestObjects.tokens[username] = response.cookies[0].value
        }

        before(async function () {
            app = await setup()
            projectLogger = getProjectLogger(app)
            sandbox.stub(app.log, 'info')
            sandbox.stub(app.log, 'warn')
            sandbox.stub(app.log, 'error')

            const factory = new TestModelFactory(app)

            TestObjects.factory = factory

            TestObjects.instanceOne = app.instance
            await TestObjects.instanceOne.updateSetting('credentialSecret', crypto.randomBytes(32).toString('hex'))

            TestObjects.instanceTwo = await TestObjects.factory.createInstance(
                { name: 'instance-two' },
                app.application,
                app.stack,
                app.template,
                app.projectType,
                { start: false }
            )

            TestObjects.team = app.team
            TestObjects.application = app.application
            TestObjects.stack = app.stack
            TestObjects.template = app.template
            TestObjects.projectType = app.projectType

            TestObjects.alice = await app.db.models.User.byUsername('alice')
            TestObjects.bob = await TestObjects.factory.createUser({ admin: false, username: 'bob', name: 'Bob Solo', email: 'bob@example.com', password: 'bbPassword' })
            TestObjects.chris = await TestObjects.factory.createUser({ admin: false, username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
            TestObjects.dave = await TestObjects.factory.createUser({ admin: false, username: 'dave', name: 'Dave Vader', email: 'dave@example.com', email_verified: true, password: 'ddPassword' })

            await TestObjects.team.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
            await TestObjects.team.addUser(TestObjects.chris, { through: { role: Roles.Member } })
            await TestObjects.team.addUser(TestObjects.dave, { through: { role: Roles.Viewer } })

            TestObjects.elvis = await TestObjects.factory.createUser({ admin: false, username: 'elvis', name: 'Elvis Dooku', email: 'elvis@example.com', email_verified: true, password: 'eePassword' })
            const team2 = await TestObjects.factory.createTeam({ name: 'PTeam' })
            await team2.addUser(TestObjects.elvis, { through: { role: Roles.Member } })

            await login('alice', 'aaPassword')
            await login('bob', 'bbPassword')
            await login('chris', 'ccPassword')
            await login('dave', 'ddPassword')
            await login('elvis', 'eePassword')
        })

        beforeEach(async function () {
            await enableTeamTypeFeatureFlag(true)
        })

        after(async function () {
            await app.close()
            sandbox.restore()
        })

        it('Owner should get a timeline of changes to the project', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.instanceOne.id}/history`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('meta')
            body.should.have.property('count')
            body.should.have.property('timeline')
        })
        it('Member should get a timeline of changes to the project', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.instanceOne.id}/history`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('meta')
            body.should.have.property('count')
            body.should.have.property('timeline')
        })
        it('Viewer should be able to access project history (200)', async function () {
            // 403: Forbidden - The user does not have permission to access the resource
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.instanceOne.id}/history`,
                cookies: { sid: TestObjects.tokens.dave }
            })
            response.statusCode.should.equal(200)
        })
        it('Non member should not be able to access project history (404)', async function () {
            // 404: Not Found - The requested resource could not be found
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.instanceOne.id}/history`,
                cookies: { sid: TestObjects.tokens.elvis }
            })
            response.statusCode.should.equal(404)
        })
        it('Anonymous should not be able to access project history (401)', async function () {
            // 401: Unauthorized - The user is not authenticated
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.instanceOne.id}/history`
            })
            response.statusCode.should.equal(401)
        })
        it('Should return 404 when the teamtype feature flag is disabled', async function () {
            await enableTeamTypeFeatureFlag(false)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.instanceOne.id}/history`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(404)
        })

        describe('Timeline Data', function () {
            async function simulateModifyFlows (instance, user) {
                // since we don't have running instances to post flows, we just simulate the event
                await app.db.controllers.AuditLog.projectLog(instance.id, user.id, 'flows.set', { type: 'flows' })
            }

            async function simulatePipelineDeployment (instance, user, snapshot) {
                // simulate a pipeline deployment by logging the event
                await projectLogger.project.snapshot.imported(user, null, instance, instance, null, snapshot)
            }

            async function doAutoSnapshot (instance, user, deploymentType = 'full') {
                // since we don't have running instances to cause flow mods, just call the controller directly
                await app.db.controllers.ProjectSnapshot.doInstanceAutoSnapshot(instance, deploymentType, undefined, { user })
            }

            async function rollback (instance, snapshotId, sid) {
                await app.inject({
                    method: 'POST',
                    url: `/api/v1/projects/${instance.id}/actions/rollback`,
                    payload: { snapshotId },
                    cookies: { sid }
                })
            }

            async function modifySettings (instance, newSettings, sid) {
                await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${instance.id}`,
                    payload: { settings: newSettings },
                    cookies: { sid: TestObjects.tokens.bob }
                })
            }
            before(async function () {
                // Enable instanceAutoSnapshot feature for default team type
                app.config.features.register('instanceAutoSnapshot', true, true)
                const defaultTeamType = await app.db.models.TeamType.findOne({ where: { name: 'starter' } })
                const defaultTeamTypeProperties = defaultTeamType.properties
                defaultTeamTypeProperties.features.instanceAutoSnapshot = true
                defaultTeamType.properties = defaultTeamTypeProperties
                await defaultTeamType.save()

                // clear all snapshots & audit logs
                await app.db.models.ProjectSnapshot.destroy({ where: {} })
                await app.db.models.AuditLog.destroy({ where: {} })

                // Simulate below events by pushing entries to the audit log and generating snapshots
                // 1. Create snapshot 1
                // 2. Modify flows
                // 3. Create snapshot 2 (auto snapshot)
                // 4. Modify settings
                // 5. Create snapshot 3
                // 6. pipeline deployment of Snapshot 1
                // 7. Create snapshot 4
                // 8. Rollback to snapshot 3

                // createSnapshot(app, instance, user, snapshotProps)
                const snapshotProps = (num) => {
                    return {
                        name: `Snapshot ${num}`,
                        description: `Snapshot ${num}`,
                        setAsTarget: false, // no need to deploy to devices of the source
                        flows: { custom: `custom-flows-${num}` },
                        // credentials: { custom: `custom-creds-${num}` },
                        settings: {
                            modules: { custom: `custom-module-${num}` },
                            env: { custom: `custom-env-${num}` }
                        }
                    }
                }
                // NOTE: The tests rely on specific ordering of events, so every event has a different
                // timestamp, we add a small delay between each event.
                // IRL, these events would be triggered by user actions and any 2 events occurring
                // at the same ms would be highly unlikely and ultimately, of little consequence.
                const snapshot1 = await createSnapshot(app, TestObjects.instanceOne, TestObjects.bob, snapshotProps(1))
                await sleep(10)
                await simulateModifyFlows(TestObjects.instanceOne, TestObjects.bob)
                await sleep(10)
                await doAutoSnapshot(TestObjects.instanceOne, TestObjects.bob)
                await sleep(10)
                await modifySettings(TestObjects.instanceOne, { header: { title: 'changed' } }, TestObjects.tokens.bob)
                await sleep(10)
                const snapshot3 = await createSnapshot(app, TestObjects.instanceOne, TestObjects.bob, snapshotProps(3))
                await sleep(10)
                await simulatePipelineDeployment(TestObjects.instanceOne, TestObjects.bob, snapshot1)
                await sleep(10)
                await createSnapshot(app, TestObjects.instanceOne, TestObjects.bob, snapshotProps(4))
                await sleep(10)
                await rollback(TestObjects.instanceOne, snapshot3.hashid, TestObjects.tokens.bob)
            })

            it('Should return a timeline of changes to the project', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${TestObjects.instanceOne.id}/history`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(200)

                const body = response.json()
                body.should.have.property('meta')
                body.should.have.property('count')
                body.should.have.property('timeline').and.be.an.Array()
                body.timeline.should.have.length(8)

                // check a selection of entries
                const entry1 = body.timeline[0]
                entry1.should.have.property('createdAt')
                entry1.should.have.property('user').and.be.an.Object()
                entry1.user.should.have.property('id').and.be.a.String()
                entry1.should.have.property('event', 'project.snapshot.rolled-back')
                entry1.should.have.property('data').and.be.an.Object()

                const entry2 = body.timeline[1]
                entry2.should.have.property('createdAt')
                entry2.should.have.property('user').and.be.an.Object()
                entry2.user.should.have.property('id').and.be.a.String()
                entry2.should.have.property('event', 'project.snapshot.created')
                entry2.should.have.property('data').and.be.an.Object()
                entry2.data.should.have.property('snapshot').and.be.an.Object()
                entry2.data.snapshot.should.have.property('id').and.be.a.String()
                entry2.data.snapshot.should.have.property('name', 'Snapshot 4')
                entry2.data.should.have.property('info').and.be.an.Object()
                entry2.data.info.should.have.property('snapshotExists', true)

                const entry3 = body.timeline[2]
                entry3.should.have.property('createdAt')
                entry3.should.have.property('user').and.be.an.Object()
                entry3.user.should.have.property('id').and.be.a.String()
                entry3.should.have.property('event', 'project.snapshot.imported') // pipeline deployment
                entry3.should.have.property('data').and.be.an.Object()
                entry3.data.should.have.property('snapshot').and.be.an.Object()
                entry3.data.snapshot.should.have.property('id').and.be.a.String()
                entry3.data.snapshot.should.have.property('name', 'Snapshot 1') // snapshot 1 was deployed
                entry3.data.should.have.property('info').and.be.an.Object()
                entry3.data.info.should.have.property('snapshotExists', true)

                // check remaining entries event string only
                body.timeline[3].event.should.equal('project.snapshot.created')
                body.timeline[4].event.should.equal('project.settings.updated')
                body.timeline[5].event.should.equal('project.snapshot.created')
                body.timeline[6].event.should.equal('flows.set')
                body.timeline[7].event.should.equal('project.snapshot.created')
            })

            describe('Pagination', function () {
                it('Should limit response', async function () {
                    const response = await app.inject({
                        method: 'GET',
                        url: `/api/v1/projects/${TestObjects.instanceOne.id}/history?limit=2`,
                        cookies: { sid: TestObjects.tokens.bob }
                    })
                    response.statusCode.should.equal(200)
                    const body = response.json()
                    body.should.have.property('count', 2)
                })

                it('Should use cursor', async function () {
                    const response = await app.inject({
                        method: 'GET',
                        url: `/api/v1/projects/${TestObjects.instanceOne.id}/history?limit=2`,
                        cookies: { sid: TestObjects.tokens.bob }
                    })
                    response.statusCode.should.equal(200)
                    const body1 = response.json()
                    body1.meta.should.have.property('next_cursor')

                    const response2 = await app.inject({
                        method: 'GET',
                        url: `/api/v1/projects/${TestObjects.instanceOne.id}/history?cursor=${body1.meta.next_cursor}&limit=3`,
                        cookies: { sid: TestObjects.tokens.bob }
                    })
                    response2.statusCode.should.equal(200)
                    const body2 = response2.json()

                    body2.meta.should.have.property('next_cursor')
                    body2.meta.next_cursor.should.not.equal(body1.meta.next_cursor)
                })
            })
        })
    })

    describe('Project Resources', function () {
        const TestObjects = { tokens: {} }

        let app
        const sandbox = sinon.createSandbox()

        async function login (username, password) {
            const response = await app.inject({
                method: 'POST',
                url: '/account/login',
                payload: { username, password, remember: false }
            })
            response.cookies.should.have.length(1)
            response.cookies[0].should.have.property('name', 'sid')
            TestObjects.tokens[username] = response.cookies[0].value
        }

        before(async function () {
            app = await setup()
            sandbox.stub(app.log, 'info')
            sandbox.stub(app.log, 'warn')
            sandbox.stub(app.log, 'error')

            const factory = new TestModelFactory(app)

            TestObjects.factory = factory

            TestObjects.instanceOne = app.instance
            await TestObjects.instanceOne.updateSetting('credentialSecret', crypto.randomBytes(32).toString('hex'))

            TestObjects.instanceTwo = await TestObjects.factory.createInstance(
                { name: 'instance-two' },
                app.application,
                app.stack,
                app.template,
                app.projectType,
                { start: false }
            )

            TestObjects.team = app.team
            TestObjects.application = app.application
            TestObjects.stack = app.stack
            TestObjects.template = app.template
            TestObjects.projectType = app.projectType

            TestObjects.alice = await app.db.models.User.byUsername('alice')
            TestObjects.bob = await TestObjects.factory.createUser({ admin: false, username: 'bob', name: 'Bob Solo', email: 'bob@example.com', password: 'bbPassword' })
            TestObjects.chris = await TestObjects.factory.createUser({ admin: false, username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
            TestObjects.dave = await TestObjects.factory.createUser({ admin: false, username: 'dave', name: 'Dave Vader', email: 'dave@example.com', email_verified: true, password: 'ddPassword' })

            await TestObjects.team.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
            await TestObjects.team.addUser(TestObjects.chris, { through: { role: Roles.Member } })
            await TestObjects.team.addUser(TestObjects.dave, { through: { role: Roles.Viewer } })

            TestObjects.elvis = await TestObjects.factory.createUser({ admin: false, username: 'elvis', name: 'Elvis Dooku', email: 'elvis@example.com', email_verified: true, password: 'eePassword' })
            const team2 = await TestObjects.factory.createTeam({ name: 'PTeam' })
            await team2.addUser(TestObjects.elvis, { through: { role: Roles.Member } })

            await login('alice', 'aaPassword')
            await login('bob', 'bbPassword')
            await login('chris', 'ccPassword')
            await login('dave', 'ddPassword')
            await login('elvis', 'eePassword')
        })

        after(async function () {
            await app.close()
        })

        it('should return the project resources', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.instanceOne.id}/resources`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('meta')
            body.should.have.property('resources').and.be.an.Array()
            body.should.have.property('count')
        })
        it('should not return the project resources', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.instanceOne.id}/resources`,
                cookies: { sid: TestObjects.tokens.elvis }
            })

            response.statusCode.should.equal(404)
        })
    })
})
