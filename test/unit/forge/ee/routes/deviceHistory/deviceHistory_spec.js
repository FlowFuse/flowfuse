const sleep = require('util').promisify(setTimeout)

// eslint-disable-next-line no-unused-vars
const should = require('should')

const sinon = require('sinon')

const TestModelFactory = require('../../../../../lib/TestModelFactory.js')
const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Devices API (EE)', function () {
    describe('History timeline', function () {
        const TestObjects = {
            /** admin */ alice: null,
            /** owner */ bob: null,
            /** member */ chris: null,
            /** viewer */ dave: null,
            /** non member */ elvis: null,
            device: null,
            deviceTwo: null,
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
            sandbox.stub(app.log, 'info')
            sandbox.stub(app.log, 'warn')
            sandbox.stub(app.log, 'error')

            const factory = new TestModelFactory(app)

            TestObjects.factory = factory

            TestObjects.device = await TestObjects.factory.createDevice(
                { name: 'device-one' },
                app.team,
                null,
                app.application
            )

            TestObjects.deviceTwo = await TestObjects.factory.createDevice(
                { name: 'device-two' },
                app.team,
                null,
                app.application
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
                url: `/api/v1/devices/${TestObjects.device.hashid}/history`,
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
                url: `/api/v1/devices/${TestObjects.device.hashid}/history`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('meta')
            body.should.have.property('count')
            body.should.have.property('timeline')
        })
        it('Viewer should not be able to access project history (403)', async function () {
        // 403: Forbidden - The user does not have permission to access the resource
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${TestObjects.device.hashid}/history`,
                cookies: { sid: TestObjects.tokens.dave }
            })
            response.statusCode.should.equal(403)
        })
        it('Non member should not be able to access project history (404)', async function () {
        // 404: Not Found - The requested resource could not be found
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${TestObjects.device.hashid}/history`,
                cookies: { sid: TestObjects.tokens.elvis }
            })
            response.statusCode.should.equal(404)
        })
        it('Anonymous should not be able to access project history (401)', async function () {
        // 401: Unauthorized - The user is not authenticated
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${TestObjects.device.hashid}/history`
            })
            response.statusCode.should.equal(401)
        })
        it('Should return 404 when the teamtype feature flag is disabled', async function () {
            await enableTeamTypeFeatureFlag(false)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${TestObjects.device.hashid}/history`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(404)
        })

        describe('Timeline Data', function () {
            async function simulateModifyFlows (device, user) {
                // since we don't have running instances to post flows, we just simulate the event
                await app.db.controllers.AuditLog.deviceLog(device.id, user.id, 'flows.set', { type: 'flows' })
            }

            async function simulateRestart (device, user) {
                // since we don't have running instances to post flows, we just simulate the event
                await app.db.controllers.AuditLog.deviceLog(device.id, user.id, 'device.restarted', { device })
            }

            async function modifySettings (device, newSettings, user) {
                app.auditLog.Device.device.settings.updated(user.id, null, device, newSettings)
                // await app.inject({
                //     method: 'PUT',
                //     url: `/api/v1/devices/${device.id}`,
                //     payload: { settings: newSettings },
                //     cookies: { sid: TestObjects.tokens.bob }
                // })
            }
            before(async function () {
                // clear all snapshots & audit logs
                await app.db.models.ProjectSnapshot.destroy({ where: {} })
                await app.db.models.AuditLog.destroy({ where: {} })

                // Simulate below events by pushing entries to the audit log and generating snapshots
                // 1. Modify flows
                // 2. Modify settings
                // 3. Restart

                // NOTE: The tests rely on specific ordering of events, so every event has a different
                // timestamp, we add a small delay between each event.
                // IRL, these events would be triggered by user actions and any 2 events occurring
                // at the same ms would be highly unlikely and ultimately, of little consequence.
                await simulateModifyFlows(TestObjects.device, TestObjects.bob)
                await sleep(10)
                await modifySettings(TestObjects.device, { header: { title: 'changed' } }, TestObjects.bob)
                await sleep(10)
                await simulateRestart(TestObjects.device, TestObjects.tokens.bob)
            })

            it('Should return a timeline of changes to the project', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${TestObjects.device.hashid}/history`,
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(200)

                const body = response.json()
                body.should.have.property('meta')
                body.should.have.property('count')
                body.should.have.property('timeline').and.be.an.Array()
                body.timeline.should.have.length(3)

                // check a selection of entries
                const entry1 = body.timeline[0]
                entry1.should.have.property('createdAt')
                entry1.should.have.property('user').and.be.an.Object()
                entry1.user.should.have.property('id').and.be.a.String()
                entry1.should.have.property('event', 'device.restarted')
                entry1.should.have.property('data').and.be.an.Object()

                const entry2 = body.timeline[1]
                entry2.should.have.property('createdAt')
                entry2.should.have.property('user').and.be.an.Object()
                entry2.user.should.have.property('id').and.be.a.String()
                entry2.should.have.property('event', 'device.settings.updated')
                entry2.should.have.property('data').and.be.an.Object()

                const entry3 = body.timeline[2]
                entry3.should.have.property('createdAt')
                entry3.should.have.property('user').and.be.an.Object()
                entry3.user.should.have.property('id').and.be.a.String()
                entry3.should.have.property('event', 'flows.set') // pipeline deployment
                entry3.should.have.property('data').and.be.an.Object()
            })

            describe('Pagination', function () {
                it('Should limit response', async function () {
                    const response = await app.inject({
                        method: 'GET',
                        url: `/api/v1/devices/${TestObjects.device.hashid}/history?limit=2`,
                        cookies: { sid: TestObjects.tokens.bob }
                    })
                    response.statusCode.should.equal(200)
                    const body = response.json()
                    body.should.have.property('count', 2)
                })

                it('Should use cursor', async function () {
                    const response = await app.inject({
                        method: 'GET',
                        url: `/api/v1/devices/${TestObjects.device.hashid}/history?limit=1`,
                        cookies: { sid: TestObjects.tokens.bob }
                    })
                    response.statusCode.should.equal(200)
                    const body1 = response.json()
                    body1.meta.should.have.property('next_cursor')

                    const response2 = await app.inject({
                        method: 'GET',
                        url: `/api/v1/devices/${TestObjects.device.hashid}/history?cursor=${body1.meta.next_cursor}&limit=2`,
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
})
