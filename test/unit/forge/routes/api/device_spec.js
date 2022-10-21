const should = require('should') // eslint-disable-line
const setup = require('../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const dbUtils = FF_UTIL.require('forge/db/utils')
/** @type {import("mocha").describe} */
describe('Device API', async function () {
    let app
    const TestObjects = {}

    async function createDevice (options) {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/devices',
            body: {
                name: options.name,
                type: options.type,
                team: options.team
            },
            cookies: { sid: options.as }
        })
        return response.json()
    }

    beforeEach(async function () {
        const setupConfig = { }
        if (this.currentTest.license) {
            setupConfig.license = this.currentTest.license
        }
        app = await setup(setupConfig)

        // alice : admin
        // bob
        // chris

        // ATeam ( alice  (owner), bob (owner), chris)
        // BTeam ( bob (owner), chris)
        // CTeam ( chris (owner) )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        TestObjects.CTeam = await app.db.models.Team.create({ name: 'CTeam', TeamTypeId: app.defaultTeamType.id })

        // Alice set as ATeam owner in setup()
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.ATeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.CTeam.addUser(TestObjects.chris, { through: { role: Roles.Owner } })

        TestObjects.defaultTeamType = app.defaultTeamType

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')
    })

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

    async function createSnapshot (projectId, name, token) {
        return await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${projectId}/snapshots`,
            payload: {
                name
            },
            cookies: { sid: token }
        })
    }

    afterEach(async function () {
        await app.close()
    })
    describe('Create device', async function () {
        // POST /api/v1/devices
        // - Admin/Owner
        it('rejects if team not included in request', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: 'my device',
                    type: 'test device'
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
            response.body.should.match(/body must have required property 'team'/)
        })
        it('rejects if user not the team owner', async function () {
            // Chris (member) cannot create device in BTeam
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: 'my device',
                    type: 'test device',
                    team: TestObjects.BTeam.hashid
                },
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
        })

        it('rejects if user not in the team', async function () {
            // Bob (non-member) cannot create device in CTeam
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: 'my device',
                    type: 'test device',
                    team: TestObjects.CTeam.hashid
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })

        it('creates a device in the team', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/devices',
                body: {
                    name: 'my device',
                    type: 'test device',
                    team: TestObjects.ATeam.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'my device')
            result.should.have.property('type', 'test device')
            result.should.have.property('links')
            result.should.have.property('team')
            result.team.should.have.property('id', TestObjects.ATeam.hashid)
            result.should.not.have.property('project')

            result.should.have.property('credentials')
            result.credentials.should.have.property('token')
        })

        it('limits how many devices can be added to a team according to TeamType', async function () {
            // Set TeamType deviceLimit = 2
            const existingTeamTypeProps = TestObjects.defaultTeamType.properties
            existingTeamTypeProps.deviceLimit = 2
            TestObjects.defaultTeamType.properties = existingTeamTypeProps
            await TestObjects.defaultTeamType.save()

            ;(await TestObjects.ATeam.deviceCount()).should.equal(0)
            for (let i = 0; i < 2; i++) {
                const response = await createDevice({ name: `D${i + 1}`, type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                response.should.have.property('id')
            }
            ;(await TestObjects.ATeam.deviceCount()).should.equal(2)

            const response = await createDevice({ name: 'D3', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            response.should.have.property('error')
            response.error.should.match(/limit reached/)
        })

        const licenseTest = it('limits how many devices can be created according to license', async function () {
            // Check we're at the starting point we expect
            ;(await app.db.models.Device.count()).should.equal(0)

            for (let i = 0; i < 2; i++) {
                const response = await createDevice({ name: `D${i + 1}`, type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                response.should.have.property('id')
            }

            ;(await app.db.models.Device.count()).should.equal(2)

            const response = await createDevice({ name: 'D3', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            response.should.have.property('error')
            response.error.should.match(/license limit/)
        })
        // Limited to 2 devices
        licenseTest.license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A'
    })
    describe('Get device details', async function () {
        it('provides device details including project and team', async function () {
            TestObjects.deviceOne = await app.db.models.Device.create({ name: 'deviceOne', type: 'something', credentialSecret: 'deviceKey' })
            TestObjects.deviceProject = await app.db.models.Project.create({ name: 'deviceProject', type: '', url: '' })
            await TestObjects.deviceOne.setTeam(TestObjects.ATeam)
            await TestObjects.deviceOne.setProject(TestObjects.deviceProject)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${TestObjects.deviceOne.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.should.have.property('id', TestObjects.deviceOne.hashid)
            result.should.have.property('name', 'deviceOne')
            result.should.have.property('type', 'something')
            result.should.have.property('links')
            result.should.have.property('team')
            result.should.not.have.property('accessToken')

            result.team.should.have.property('id', TestObjects.ATeam.hashid)
            result.should.have.property('project')
            result.project.should.have.property('id', TestObjects.deviceProject.id)
        })

        it('provides device details - unassigned project', async function () {
            TestObjects.deviceOne = await app.db.models.Device.create({ name: 'deviceOne', type: 'something', credentialSecret: 'deviceKey' })
            TestObjects.deviceProject = await app.db.models.Project.create({ name: 'deviceProject', type: '', url: '' })
            await TestObjects.deviceOne.setTeam(TestObjects.ATeam)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${TestObjects.deviceOne.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.should.have.property('id', TestObjects.deviceOne.hashid)
            result.should.have.property('name', 'deviceOne')
            result.should.have.property('type', 'something')
            result.should.have.property('links')
            result.should.have.property('team')
            result.should.have.property('targetSnapshot')
            result.should.have.property('activeSnapshot')
            result.team.should.have.property('id', TestObjects.ATeam.hashid)
            result.should.not.have.property('project')
        })

        // GET /api/v1/devices/:deviceId
        // - Must be admin or team owner/member
    })

    describe('Edit device details', async function () {
        // PUT /api/v1/devices/:deviceId
        // - Admin/Owner

        it('basic properties can be edited', async function () {
            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/devices/${device.id}`,
                body: {
                    name: 'newName',
                    type: 'newType'
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()

            result.should.have.property('name', 'newName')
            result.should.have.property('type', 'newType')
        })

        it('non-team owner cannot edit properties', async function () {
            // Chris (member, not owner) cannot modify device properties
            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/devices/${device.id}`,
                body: {
                    name: 'newName',
                    type: 'newType'
                },
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
        })
        describe('assign to project', function () {
            async function setupProjectWithSnapshot (setActive) {
                TestObjects.deviceProject = await app.db.models.Project.create({ name: 'deviceProject', type: '', url: '' })
                TestObjects.deviceProject.setTeam(TestObjects.ATeam)
                // Create a snapshot
                TestObjects.deviceProjectSnapshot = (await createSnapshot(TestObjects.deviceProject.id, 'test-snapshot', TestObjects.tokens.alice)).json()
                if (setActive) {
                    // Set snapshot as active
                    await app.inject({
                        method: 'POST',
                        url: `/api/v1/projects/${TestObjects.deviceProject.id}/devices/settings`,
                        body: {
                            targetSnapshot: TestObjects.deviceProjectSnapshot.id
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })
                }
            }

            it('can assign to a project - no active snapshot', async function () {
                // Create a project
                await setupProjectWithSnapshot(false)

                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        project: TestObjects.deviceProject.id
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                const result = response.json()
                result.should.have.property('project')
                result.should.have.property('targetSnapshot', null)
                result.project.should.have.property('id', TestObjects.deviceProject.id)
            })
            it('can assign to a project - with active snapshot', async function () {
                // Create a project
                await setupProjectWithSnapshot(true)

                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        project: TestObjects.deviceProject.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const result = response.json()
                result.should.have.property('project')
                result.should.have.property('targetSnapshot')
                result.targetSnapshot.should.have.property('id', TestObjects.deviceProjectSnapshot.id)
                result.project.should.have.property('id', TestObjects.deviceProject.id)
            })
            it('can unassign from a project', async function () {
                await setupProjectWithSnapshot(true)

                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        project: TestObjects.deviceProject.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const result = response.json()
                result.should.have.property('project')
                result.project.should.have.property('id', TestObjects.deviceProject.id)
                result.should.have.property('targetSnapshot')
                result.targetSnapshot.should.have.property('id', TestObjects.deviceProjectSnapshot.id)

                const response2 = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        project: null
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const result2 = response2.json()
                result2.should.not.have.property('project')
                // Check the targetSnapshot has been cleared
                result2.should.have.property('targetSnapshot', null)
            })

            it('non-owner cannot assign to a project', async function () {
                // Chris (member) cannot assign to project
                TestObjects.deviceProject = await app.db.models.Project.create({ name: 'deviceProject', type: '', url: '' })
                TestObjects.deviceProject.setTeam(TestObjects.ATeam)

                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        project: TestObjects.deviceProject.id
                    },
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response.statusCode.should.equal(403)
            })
            it('cannot assign to a project in a different team', async function () {
                // Device (ATeam) cannot be assign to Project (BTeam)
                TestObjects.deviceProject = await app.db.models.Project.create({ name: 'deviceProject', type: '', url: '' })
                TestObjects.deviceProject.setTeam(TestObjects.BTeam)

                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}`,
                    body: {
                        project: TestObjects.deviceProject.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
            })
        })

        describe('edit device settings', function () {
            it('can set env vars for the device', async function () {
                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}/settings`,
                    body: {
                        env: [{ name: 'a', value: 'foo' }],
                        invalid: 'do-not-set'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                response.json().should.have.property('status', 'okay')

                const settingsResponse = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}/settings`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const settings = settingsResponse.json()
                settings.should.have.property('env')
                const nonPlatformVars = settings.env.filter(e => !e.name.startsWith('FF_')) // ignore platform defined vars
                nonPlatformVars.should.have.length(1)
                nonPlatformVars[0].should.have.property('name', 'a')
                nonPlatformVars[0].should.have.property('value', 'foo')
                settings.should.not.have.property('invalid')
            })
            it('non team owner can set env vars for the device', async function () {
                const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/devices/${device.id}/settings`,
                    body: {
                        env: [{ name: 'a', value: 'foo' }],
                        invalid: 'do-not-set'
                    },
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response.statusCode.should.equal(200)
                response.json().should.have.property('status', 'okay')

                const settingsResponse = await app.inject({
                    method: 'GET',
                    url: `/api/v1/devices/${device.id}/settings`,
                    cookies: { sid: TestObjects.tokens.alice }
                })

                const settings = settingsResponse.json()
                settings.should.have.property('env')
                const nonPlatformVars = settings.env.filter(e => !e.name.startsWith('FF_')) // ignore platform defined vars
                nonPlatformVars.should.have.length(1)
                nonPlatformVars[0].should.have.property('name', 'a')
                nonPlatformVars[0].should.have.property('value', 'foo')
                settings.should.not.have.property('invalid')
            })
        })
    })

    describe('Delete device', async function () {
        // DELETE /api/v1/devices/:deviceId
        // - Admin/Owner/Member
        it('team owner can delete device', async function () {
            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const startTokenCount = await app.db.models.AccessToken.count()
            startTokenCount.should.equal(1)
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/devices/${device.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const endTokenCount = await app.db.models.AccessToken.count()
            endTokenCount.should.equal(0)
        })

        it('team member cannot delete device', async function () {
            // Chris (member) cannot delete from ATeam
            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/devices/${device.id}`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
        })
    })

    describe('Device Actions', async function () {
        // POST /api/v1/devices/:deviceId/actions/:action
    })

    describe('Device Checkin', async function () {
        async function setupProjectWithSnapshot (setActive) {
            TestObjects.deviceProject = await app.db.models.Project.create({ name: 'deviceProject', type: '', url: '' })
            TestObjects.deviceProject.setTeam(TestObjects.ATeam)
            // Create a snapshot
            TestObjects.deviceProjectSnapshot = (await createSnapshot(TestObjects.deviceProject.id, 'test-snapshot', TestObjects.tokens.alice)).json()
            if (setActive) {
                // Set snapshot as active
                await app.inject({
                    method: 'POST',
                    url: `/api/v1/projects/${TestObjects.deviceProject.id}/devices/settings`,
                    body: {
                        targetSnapshot: TestObjects.deviceProjectSnapshot.id
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
            }
        }
        it('device checks in with no snapshot', async function () {
            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/live/state`,
                headers: {
                    authorization: `Bearer ${device.credentials.token}`
                },
                payload: {
                    state: 'running',
                    health: {
                        uptime: 1,
                        snapshotRestartCount: 0
                    }
                }
            })
            response.statusCode.should.equal(409)
        })
        it('device checks in with a valid snapshot and settingsHash', async function () {
            await setupProjectWithSnapshot(true)

            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const dbDevice = await app.db.models.Device.byId(device.id)
            dbDevice.updateSettings({ settings: { env: [{ name: 'FOO', value: 'BAR' }] } })
            dbDevice.setProject(TestObjects.deviceProject)
            const deviceSettings = await TestObjects.deviceProject.getSetting('deviceSettings')
            dbDevice.targetSnapshotId = deviceSettings?.targetSnapshot
            await dbDevice.save()
            const settingsHash = dbDevice.settingsHash

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/live/state`,
                headers: {
                    authorization: `Bearer ${device.credentials.token}`
                },
                payload: {
                    snapshot: TestObjects.deviceProjectSnapshot.id,
                    settings: settingsHash,
                    state: 'running',
                    health: {
                        uptime: 1,
                        snapshotRestartCount: 0
                    }
                }
            })
            response.statusCode.should.equal(200)
        })
        it('device checks in with a invalid settingsHash', async function () {
            await setupProjectWithSnapshot(true)

            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const dbDevice = await app.db.models.Device.byId(device.id)
            dbDevice.updateSettings({ env: [{ name: 'FOO', value: 'BAR' }] })
            dbDevice.setProject(TestObjects.deviceProject)
            const deviceSettings = await TestObjects.deviceProject.getSetting('deviceSettings')
            dbDevice.targetSnapshotId = deviceSettings?.targetSnapshot
            await dbDevice.save()

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/live/state`,
                headers: {
                    authorization: `Bearer ${device.credentials.token}`
                },
                payload: {
                    snapshot: TestObjects.deviceProjectSnapshot.id,
                    settings: 'fooBar',
                    state: 'running',
                    health: {
                        uptime: 1,
                        snapshotRestartCount: 0
                    }
                }
            })
            response.statusCode.should.equal(409)
        })
        it('device checks in with a invalid snapshot id', async function () {
            await setupProjectWithSnapshot(true)

            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const dbDevice = await app.db.models.Device.byId(device.id)
            dbDevice.updateSettings({ env: [{ name: 'FOO', value: 'BAR' }] })
            dbDevice.setProject(TestObjects.deviceProject)
            const deviceSettings = await TestObjects.deviceProject.getSetting('deviceSettings')
            dbDevice.targetSnapshotId = deviceSettings?.targetSnapshot
            await dbDevice.save()

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/live/state`,
                headers: {
                    authorization: `Bearer ${device.credentials.token}`
                },
                payload: {
                    snapshot: dbUtils.getHashId('Device').encode(999),
                    settings: dbDevice.settingsHash,
                    state: 'running',
                    health: {
                        uptime: 1,
                        snapshotRestartCount: 0
                    }
                }
            })
            response.statusCode.should.equal(409)
        })
        it('device checks in with invalid token', async function () {
            await setupProjectWithSnapshot(true)

            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${device.id}/live/state`,
                headers: {
                    authorization: 'Bearer NotAValidToken'
                },
                payload: {
                    state: 'running',
                    health: {
                        uptime: 1,
                        snapshotRestartCount: 0
                    }
                }
            })
            response.statusCode.should.equal(401)
        })
        it('device downloads settings', async function () {
            await setupProjectWithSnapshot(true)

            const device = await createDevice({ name: 'Ad1', type: 'Ad1_type', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const dbDevice = await app.db.models.Device.byId(device.id)
            dbDevice.updateSettings({ env: [{ name: 'FOO', value: 'BAR' }] })
            dbDevice.setProject(TestObjects.deviceProject)
            const deviceSettings = await TestObjects.deviceProject.getSetting('deviceSettings')
            dbDevice.targetSnapshotId = deviceSettings?.targetSnapshot
            await dbDevice.save()

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/devices/${device.id}/live/settings`,
                headers: {
                    authorization: `Bearer ${device.credentials.token}`,
                    'content-type': 'application/json'
                }
            })
            const body = JSON.parse(response.body)
            response.statusCode.should.equal(200)
            body.should.have.property('hash').which.equal(dbDevice.settingsHash)
            body.should.have.property('env').which.have.property('FOO')
            body.should.have.property('env').which.have.property('FF_DEVICE_ID', device.id)
            body.should.have.property('env').which.have.property('FF_DEVICE_NAME', 'Ad1')
            body.should.have.property('env').which.have.property('FF_DEVICE_TYPE', 'Ad1_type')
        })
    })

    describe('Get list of a teams devices', async function () {
        async function listDevices (options) {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${options.team}/devices`,
                cookies: { sid: options.as }
            })
            return response.json()
        }
        it('lists devices in team', async function () {
            // GET /api/v1/team/:teamId/devices
            // - Admin/Owner/Member
            await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            await createDevice({ name: 'Ad2', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            await createDevice({ name: 'Ad3', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            await createDevice({ name: 'Bd1', type: '', team: TestObjects.BTeam.hashid, as: TestObjects.tokens.bob })
            await createDevice({ name: 'Bd2', type: '', team: TestObjects.BTeam.hashid, as: TestObjects.tokens.bob })

            const teamAList = await listDevices({ team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            teamAList.should.have.property('count', 3)

            const teamBList = await listDevices({ team: TestObjects.BTeam.hashid, as: TestObjects.tokens.bob })
            teamBList.should.have.property('count', 2)

            const teamCList = await listDevices({ team: TestObjects.CTeam.hashid, as: TestObjects.tokens.chris })
            teamCList.should.have.property('count', 0)
        })
    })
})
