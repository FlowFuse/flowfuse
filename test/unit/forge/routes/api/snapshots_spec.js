/// <reference types="should" />

const crypto = require('crypto')

const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')

const { Roles } = require('../../../../../forge/lib/roles')
const TestModelFactory = require('../../../../lib/TestModelFactory')
const setup = require('../setup')

function decryptCredentials (key, cipher) {
    let flows = cipher.$
    const initVector = Buffer.from(flows.substring(0, 32), 'hex')
    flows = flows.substring(32)
    const decipher = crypto.createDecipheriv('aes-256-ctr', key, initVector)
    const decrypted = decipher.update(flows, 'base64', 'utf8') + decipher.final('utf8')
    return JSON.parse(decrypted)
}

function encryptCredentials (secret, plain) {
    const key = crypto.createHash('sha256').update(secret).digest()
    const initVector = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-ctr', key, initVector)
    return { $: initVector.toString('hex') + cipher.update(JSON.stringify(plain), 'utf8', 'base64') + cipher.final('base64') }
}

describe('Snapshots API', function () {
    let app
    /** @type {TestModelFactory} */ let factory = null

    const TestObjects = {
        application1: null,
        application2: null,
        project1: null,
        device1: null,
        project2: null,
        device2: null,
        /** ATeam Owner & Admin */ alice: null,
        /** ATeam Owner */ dave: null,
        /** ATeam Member */ bob: null,
        /** ATeam Viewer */ verity: null,
        /** BTeam Owner */ chris: null,
        ATeam: null,
        BTeam: null,
        tokens: {
            project1: null,
            project2: null,
            device1: null,
            device2: null,
            /** ATeam Owner */ alice: null,
            /** ATeam Member */ bob: null,
            /** ATeam Viewer */ verity: null,
            /** BTeam Owner */ chris: null
        },
        template1: null,
        stack1: null,
        projectType1: null
    }
    before(async function () {
        app = await setup()
        factory = new TestModelFactory(app)

        TestObjects.application1 = app.application
        TestObjects.template1 = app.template
        TestObjects.stack1 = app.stack
        TestObjects.project1 = app.project
        TestObjects.projectType1 = app.projectType

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.verity = await app.db.models.User.create({ username: 'verity', name: 'Verity Viewer', email: 'verity@example.com', email_verified: true, password: 'vvPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'Dave Skywalker', email: 'dave@example.com', email_verified: true, password: 'ddPassword' })

        // Add Bob and Verity to ATeam
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Member } })
        await TestObjects.ATeam.addUser(TestObjects.verity, { through: { role: Roles.Viewer } })
        await TestObjects.ATeam.addUser(TestObjects.dave, { through: { role: Roles.Owner } })

        // Add BTeam and add Chris as owner
        TestObjects.BTeam = await factory.createTeam({ name: 'BTeam' })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Owner } })

        // create a device
        TestObjects.device1 = await factory.createDevice({ name: 'device-1' }, TestObjects.ATeam, null, TestObjects.application1)

        // Create an application for BTeam
        TestObjects.application2 = await factory.createApplication({ name: 'application-2' }, TestObjects.BTeam)

        // Create a project for BTeam
        TestObjects.project2 = await factory.createInstance({ name: 'project-2' }, TestObjects.application2, TestObjects.stack1, TestObjects.template1, TestObjects.projectType1)

        // Create a device for BTeam, application2
        TestObjects.device2 = await factory.createDevice({ name: 'device-2' }, TestObjects.BTeam, null, TestObjects.application2)

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')
        await login('verity', 'vvPassword')
        await login('dave', 'ddPassword')

        // TestObjects.tokens.alice = (await app.db.controllers.AccessToken.createTokenForPasswordReset(TestObjects.alice)).token
        TestObjects.tokens.project1 = (await TestObjects.project1.refreshAuthTokens()).token
        TestObjects.tokens.project2 = (await TestObjects.project2.refreshAuthTokens()).token

        await TestObjects.project1.updateSetting('credentialSecret', 'a-random-cred-secret')

        TestObjects.template1 = app.template
        TestObjects.stack1 = app.stack
    })
    afterEach(async function () {
        await app.db.models.ProjectSnapshot.destroy({ where: {} })

        // if app.comms.devices.sendCommandAwaitReply/sendCommand are stubbed, restore them
        if (app.comms.devices.sendCommandAwaitReply.restore) {
            app.comms.devices.sendCommandAwaitReply.restore()
        }
        if (app.comms.devices.sendCommand.restore) {
            app.comms.devices.sendCommand.restore()
        }
    })
    after(async function () {
        await app.close()
    })
    // after(async function () {
    //     await TestObjects.project2.destroy()
    // })
    const nameGenerator = (name) => `${name} ${Math.random().toString(36).substring(7)}`
    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        should(response.statusCode).equal(200)
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    async function createInstanceSnapshot (projectId, token, options) {
        projectId = projectId || TestObjects.project1.id
        token = token || TestObjects.tokens.alice
        options = options || {}
        const name = options.name || nameGenerator('instance-snapshot')
        const description = options.description || undefined
        return await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${projectId}/snapshots`,
            payload: {
                name,
                description
            },
            cookies: { sid: token }
        })
    }

    async function createAppDeviceSnapshot (deviceId, token, options, mockResponse) {
        mockResponse = mockResponse || {
            flows: [{ id: '123', type: 'newNode' }],
            credentials: { testCreds: 'abc' },
            package: {}
        }
        deviceId = deviceId || TestObjects.device1.hashid
        token = token || TestObjects.tokens.alice
        options = options || {}
        const name = options.name || nameGenerator('device-snapshot')
        const description = options.description || undefined

        sinon.stub(app.comms.devices, 'sendCommandAwaitReply').resolves(mockResponse)
        sinon.stub(app.comms.devices, 'sendCommand').resolves()
        return await app.inject({
            method: 'POST',
            url: `/api/v1/devices/${deviceId}/snapshots`,
            payload: {
                name,
                description
            },
            cookies: { sid: token }
        })
    }

    async function getSnapshot (snapshotId, token) {
        return await app.inject({
            method: 'GET',
            url: `/api/v1/snapshots/${snapshotId}`,
            ...(token ? { cookies: { sid: token } } : {})
        })
    }

    async function getFullSnapshot (snapshotId, token) {
        return await app.inject({
            method: 'GET',
            url: `/api/v1/snapshots/${snapshotId}/full`,
            ...(token ? { cookies: { sid: token } } : {})
        })
    }

    async function exportSnapshot (snapshotId, token, credentialSecret = undefined, credentials = undefined) {
        if (typeof credentialSecret === 'undefined') {
            credentialSecret = credentialSecret || nameGenerator('test-secret')
        }
        return await app.inject({
            method: 'POST',
            url: `/api/v1/snapshots/${snapshotId}/export`,
            ...(token ? { cookies: { sid: token } } : {}),
            payload: {
                credentialSecret,
                ...(credentials ? { credentials } : {})
            }
        })
    }

    async function importSnapshot (ownerId, ownerType, snapshot, credentialSecret, token) {
        const payload = {
            ownerId,
            ownerType,
            snapshot
        }
        if (credentialSecret) {
            payload.credentialSecret = credentialSecret
        }
        return await app.inject({
            method: 'POST',
            url: '/api/v1/snapshots/import',
            cookies: { sid: token },
            payload
        })
    }

    async function deleteSnapshot (snapshotId, token) {
        return await app.inject({
            method: 'DELETE',
            url: `/api/v1/snapshots/${snapshotId}`,
            ...(token ? { cookies: { sid: token } } : {})
        })
    }

    // Tests for GET /api/v1/snapshots/{snapshotId}
    // * Gets the snapshot metadata only.
    // * Include content of SnapshotSummary schema: see forge/db/views/ProjectSnapshot.js

    describe('Get snapshot meta', function () {
        /**
         * get snapshot summary/meta tests
         * @param {'instance' | 'device'} kind - 'instance' or 'device'
         */
        function tests (kind) {
            const createSnapshot = kind === 'instance' ? createInstanceSnapshot : createAppDeviceSnapshot

            it('Returns 404 for non-existent snapshot', async function () {
                const response = await getSnapshot('non-existent-snapshot-id', TestObjects.tokens.alice)
                response.statusCode.should.equal(404)
                response.json().should.have.property('code', 'not_found')
            })

            it('Non-member cannot get snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                // ensure it really exists before assuming the non-member cannot access it
                const ownerResponse = await getSnapshot(result.id, TestObjects.tokens.alice)
                ownerResponse.statusCode.should.equal(200)

                const response = await getSnapshot(result.id, TestObjects.tokens.chris)

                // 404 as a non member should not know the resource exists
                response.statusCode.should.equal(404)
                response.json().should.have.property('code', 'not_found')
            })

            it('Device Snapshot contains only meta data', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await getSnapshot(result.id, TestObjects.tokens.alice)

                response.statusCode.should.equal(200)
                const data = response.json()
                should(data).be.an.Object()
                if (kind === 'device') {
                    data.should.only.have.keys('id', 'name', 'description', 'createdAt', 'updatedAt', 'user', 'ownerType', 'modules', 'deviceId', 'device')
                } else {
                    data.should.only.have.keys('id', 'name', 'description', 'createdAt', 'updatedAt', 'user', 'ownerType', 'modules', 'projectId', 'project')
                }
                data.should.not.have.keys('settings', 'flows', 'credentialSecret')
                data.should.have.property('id', result.id)
                data.should.have.property('name', result.name)
                data.should.have.property('description', result.description)
            })

            it('Owner can get snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await getSnapshot(result.id, TestObjects.tokens.alice)

                response.statusCode.should.equal(200)
                response.json().should.have.property('name', result.name)
            })

            it('Member can get snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await getSnapshot(result.id, TestObjects.tokens.bob)

                response.statusCode.should.equal(200)
                response.json().should.have.property('name', result.name)
            })

            it('Viewer can get snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await getSnapshot(result.id, TestObjects.tokens.verity)

                response.statusCode.should.equal(200)
                response.json().should.have.property('name', result.name)
            })
        }
        describe('instance', function () {
            tests('instance')
        })
        describe('device', function () {
            tests('device')
        })
    })

    // Tests for GET /api/v1/snapshots/{snapshotId}/full
    // * Gets the full snapshot (flows, settings, etc.)
    // * Does not include credentials (that is the export endpoint)
    // * Does include content of FullSnapshot schema: see forge/db/views/ProjectSnapshot.js

    describe('Get full snapshot', function () {
        afterEach(async function () {
            await app.db.models.ProjectSnapshot.destroy({ where: {} })
        })

        /**
         * get full snapshot tests
         * @param {'instance' | 'device'} kind - 'instance' or 'device'
         */
        function tests (kind) {
            const createSnapshot = kind === 'instance' ? createInstanceSnapshot : createAppDeviceSnapshot

            it('Returns 404 for non-existent snapshot', async function () {
                const response = await getFullSnapshot('non-existent-snapshot-id', TestObjects.tokens.alice)
                response.statusCode.should.equal(404)
                response.json().should.have.property('code', 'not_found')
            })

            it('Non-member cannot get snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                // ensure it really exists before assuming the non-member cannot access it
                const ownerResponse = await getFullSnapshot(result.id, TestObjects.tokens.alice)
                ownerResponse.statusCode.should.equal(200)

                const response = await getFullSnapshot(result.id, TestObjects.tokens.chris)

                // 404 as a non member should not know the resource exists
                response.statusCode.should.equal(404)
                response.json().should.have.property('code', 'not_found')
            })

            it('Snapshot contains full data', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await getFullSnapshot(result.id, TestObjects.tokens.alice)

                response.statusCode.should.equal(200)
                const data = response.json()
                should(data).be.an.Object()
                data.should.have.keys('id', 'name', 'description', 'createdAt', 'updatedAt', 'ownerType', 'flows', 'settings')
                data.should.not.have.keys('credentialSecret', 'hashid', 'deviceId', 'projectId')
                data.should.have.property('id', result.id)
                data.should.have.property('name', result.name)
                data.should.have.property('description', result.description)
                data.settings.should.be.an.Object()
                data.settings.should.only.have.keys('settings', 'env', 'modules')
                data.settings.settings.should.be.an.Object()
                data.settings.env.should.be.an.Object()
                data.settings.modules.should.be.an.Object()
                data.flows.should.be.an.Object()
                data.flows.should.only.have.keys('flows')
                data.flows.flows.should.be.an.Array()
            })

            it('Owner can get snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await getFullSnapshot(result.id, TestObjects.tokens.alice)

                response.statusCode.should.equal(200)
                response.json().should.have.property('name', result.name)
            })

            it('Member can get snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await getFullSnapshot(result.id, TestObjects.tokens.bob)

                response.statusCode.should.equal(200)
                response.json().should.have.property('name', result.name)
            })

            it('Viewer cannot get snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                // ensure it really exists before assuming the non-member cannot access it
                const ownerResponse = await getFullSnapshot(result.id, TestObjects.tokens.alice)
                ownerResponse.statusCode.should.equal(200)

                const response = await getFullSnapshot(result.id, TestObjects.tokens.verity)

                response.statusCode.should.equal(403)
                response.json().should.have.property('code', 'unauthorized')
            })
        }
        describe('instance', function () {
            tests('instance')
        })
        describe('device', function () {
            tests('device')
        })
    })

    // Tests for POST /api/v1/snapshots/{snapshotId}/export
    // * Gets the full snapshot (flows, settings, etc.)
    // * Does include credentials
    // * Does include content of ExportedSnapshot schema: see forge/db/views/ProjectSnapshot.js

    describe('Export snapshot', function () {
        afterEach(async function () {
            await app.db.models.ProjectSnapshot.destroy({ where: {} })
        })

        /**
         * post export snapshot tests
         * @param {'instance' | 'device'} kind - 'instance' or 'device'
         */
        function tests (kind) {
            const createSnapshot = kind === 'instance' ? createInstanceSnapshot : createAppDeviceSnapshot

            it('Returns 404 for non-existent snapshot', async function () {
                const response = await exportSnapshot('non-existent-snapshot-id', TestObjects.tokens.alice)
                response.statusCode.should.equal(404)
                response.json().should.have.property('code', 'not_found')
            })

            it('Non-member cannot export snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                // ensure it really exists before assuming the non-member cannot access it
                const ownerResponse = await exportSnapshot(result.id, TestObjects.tokens.alice)
                ownerResponse.statusCode.should.equal(200)

                const response = await exportSnapshot(result.id, TestObjects.tokens.chris)

                // 404 as a non member should not know the resource exists
                response.statusCode.should.equal(404)
                response.json().should.have.property('code', 'not_found')
            })

            it('Cannot export snapshot without new credentialSecret', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await exportSnapshot(result.id, TestObjects.tokens.alice, null)
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'bad_request')
            })

            it('Snapshot contains export data', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await exportSnapshot(result.id, TestObjects.tokens.alice)

                response.statusCode.should.equal(200)
                const data = response.json()
                should(data).be.an.Object()
                data.should.have.keys('id', 'name', 'description', 'createdAt', 'updatedAt', 'user', 'exportedBy', 'ownerType', 'flows', 'settings')
                data.should.not.have.keys('credentialSecret', 'hashid', 'deviceId', 'projectId')
                data.should.have.property('id', result.id)
                data.should.have.property('name', result.name)
                data.should.have.property('description', result.description)
                data.settings.should.be.an.Object()
                data.settings.should.only.have.keys('settings', 'env', 'modules')
                data.settings.settings.should.be.an.Object()
                data.settings.env.should.be.an.Object()
                data.settings.modules.should.be.an.Object()
                data.flows.should.be.an.Object()
                data.flows.should.only.have.keys('flows', 'credentials')
                data.flows.flows.should.be.an.Array()
            })

            it('Owner can export snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await exportSnapshot(result.id, TestObjects.tokens.alice)

                response.statusCode.should.equal(200)
                response.json().should.have.property('name', result.name)
            })

            it('Member can export snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await exportSnapshot(result.id, TestObjects.tokens.bob)

                response.statusCode.should.equal(200)
                response.json().should.have.property('name', result.name)
            })

            it('Viewer cannot export snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await exportSnapshot(result.id, TestObjects.tokens.verity)

                response.statusCode.should.equal(403)
                response.json().should.have.property('code', 'unauthorized')
            })

            it('Exports provided credentials', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await exportSnapshot(result.id, TestObjects.tokens.bob, 'test-secret', { testCreds: 'abc' })

                response.statusCode.should.equal(200)
                const exportResult = response.json()

                const keyHash = crypto.createHash('sha256').update('test-secret').digest()
                const decrypted = decryptCredentials(keyHash, exportResult.flows.credentials)
                JSON.stringify(decrypted).should.equal(JSON.stringify({ testCreds: 'abc' }))
            })
        }
        describe('instance', function () {
            tests('instance')
        })
        describe('device', function () {
            tests('device')
        })
    })

    // Tests for POST /api/v1/snapshots/{snapshotId}/import
    // * Imports a project or device snapshot into a project or device

    describe('Import snapshot', function () {
        const dummySnapshot = (name, flows = [], settings = {}, env = {}, modules = {}, credentials = null) => {
            const _name = name === undefined ? nameGenerator('snapshot') : name
            const _settings = (settings || env || modules) ? {} : undefined
            if (settings !== null) {
                _settings.settings = settings
            }
            if (env !== null) {
                _settings.env = env
            }
            if (modules !== null) {
                _settings.modules = modules
            }
            const snapshot = {
                name: _name,
                description: 'dummy description',
                flows: {
                    flows
                },
                settings: _settings
            }
            if (credentials) {
                snapshot.flows.credentials = credentials
            }
            return snapshot
        }

        afterEach(async function () {
            await app.db.models.ProjectSnapshot.destroy({ where: {} })
        })

        /**
         * post import snapshot tests
         * @param {'instance' | 'device'} kind - 'instance' or 'device'
         */
        function tests (kind) {
            const modelType = kind === 'instance' ? 'project' : 'device'

            const getOwner = () => kind === 'instance' ? TestObjects.project1 : TestObjects.device1
            const getOwnerId = () => kind === 'instance' ? TestObjects.project1.id : TestObjects.device1.hashid
            const getTeamBOwnerId = () => kind === 'instance' ? TestObjects.project2.id : TestObjects.device2.hashid

            it('Owner can import snapshot with credentials', async function () {
                const ownerId = getOwnerId()
                const owner = getOwner()
                const ss = dummySnapshot('dummy', [{ id: '123' }], { testSetting: 123 }, { ONE: 'envOne' }, { module: '1.2.3' }, encryptCredentials('test-secret', { testCreds: 'abc' }))
                const response = await importSnapshot(ownerId, kind, ss, 'test-secret', TestObjects.tokens.alice)

                response.statusCode.should.equal(200)

                // check the result
                const result = response.json()
                result.should.have.property(modelType).and.be.an.Object() // should contain the project/device - for updating the snapshot table client-side without refreshing/reloading from the server
                result[modelType].should.have.property('id', ownerId) // id of owner should be the hash string
                result.should.have.property('user').and.be.an.Object() // should contain the user - for updating the snapshot table client-side without refreshing/reloading from the server
                result.should.have.property('id').and.be.a.String()
                result.should.have.property('name', 'dummy')

                // Validate the exported snapshot looks correct
                const exportResponse = await exportSnapshot(result.id, TestObjects.tokens.alice, 'new-secret')
                exportResponse.statusCode.should.equal(200)
                const data = exportResponse.json()
                should(data).be.an.Object()
                data.should.have.keys('id', 'name', 'description', 'createdAt', 'updatedAt', 'user', 'exportedBy', 'ownerType', 'flows', 'settings')
                data.should.not.have.keys('credentialSecret', 'hashid', 'deviceId', 'projectId')
                data.should.have.property('id', result.id)
                data.should.have.property('name', result.name)
                data.should.have.property('description', result.description)
                data.flows.flows.should.have.length(1)
                data.flows.flows[0].should.have.property('id')

                const keyHash = crypto.createHash('sha256').update('new-secret').digest()
                const decryptedCreds = decryptCredentials(keyHash, data.flows.credentials)
                decryptedCreds.should.have.property('testCreds', 'abc')

                data.settings.should.be.an.Object()
                data.settings.should.only.have.keys('settings', 'env', 'modules')
                data.settings.settings.should.be.an.Object()
                data.settings.settings.should.have.property('testSetting', 123)
                data.settings.env.should.be.an.Object()
                data.settings.env.should.have.property('ONE', 'envOne')
                data.settings.modules.should.be.an.Object()
                data.settings.modules.should.have.property('module', '1.2.3')

                data.flows.should.be.an.Object()
                data.flows.should.only.have.keys('flows', 'credentials')
                data.flows.flows.should.be.an.Array()

                // Validate the stored credentials have been re-encrypted with the owner credentialSecret
                const importedSnapshot = await app.db.models.ProjectSnapshot.byId(result.id)

                const targetCredSec = (owner.getCredentialSecret && await owner.getCredentialSecret()) || 'test-secret'
                const keyHash2 = crypto.createHash('sha256').update(targetCredSec).digest()
                const decryptedCreds2 = decryptCredentials(keyHash2, importedSnapshot.flows.credentials)
                decryptedCreds2.should.have.property('testCreds', 'abc')
            })

            it('Owner can import snapshot without credentials', async function () {
                const ownerId = getOwnerId()
                const ss = dummySnapshot('dummy-no-creds', [], {}, {}, {}, null)
                const response = await importSnapshot(ownerId, kind, ss, null, TestObjects.tokens.alice)

                response.statusCode.should.equal(200)

                const result = response.json()
                result.should.have.property(modelType).and.be.an.Object() // should contain the project/device - for updating the snapshot table client-side without refreshing/reloading from the server
                result[modelType].should.have.property('id', ownerId) // id of owner should be the hash string
                result.should.have.property('user').and.be.an.Object() // should contain the user - for updating the snapshot table client-side without refreshing/reloading from the server
                result.should.have.property('id').and.be.a.String()
                result.should.have.property('name', 'dummy-no-creds')
            })

            it('Returns 400 for missing snapshot', async function () {
                const response = await importSnapshot(getOwnerId(), kind, null, 'test-secret', TestObjects.tokens.alice)
                response.statusCode.should.equal(400)
                const result = response.json()
                result.should.have.property('code', 'FST_ERR_VALIDATION')
            })

            it(`Returns 404 for non-existant ${kind}`, async function () {
                const ss = dummySnapshot('dummy', [], {}, {}, {}, encryptCredentials('test-secret', { testCreds: 'abc' }))
                const response = await importSnapshot('non_existant-owner', kind, ss, 'test-secret', TestObjects.tokens.alice)
                response.statusCode.should.equal(404)
            })

            it('Returns 400 for missing credentialSecret', async function () {
                const ss = dummySnapshot('dummy', [], {}, {}, {}, encryptCredentials('test-secret', { testCreds: 'abc' }))
                const response = await importSnapshot(getOwnerId(), kind, ss, '', TestObjects.tokens.alice)
                response.statusCode.should.equal(400)
                const result = response.json()
                result.should.have.property('code', 'bad_request')
            })

            it('Returns 400 for bad/invalid snapshot (missing flows)', async function () {
                const ss = dummySnapshot('dummy', [], {}, {}, {}, encryptCredentials('test-secret', { testCreds: 'abc' }))
                delete ss.flows
                const response = await importSnapshot(getOwnerId(), kind, ss, '', TestObjects.tokens.alice)
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'FST_ERR_VALIDATION')
            })

            it('Returns 400 for bad/invalid snapshot (missing settings)', async function () {
                const ss = dummySnapshot('dummy', [], {}, {}, {}, encryptCredentials('test-secret', { testCreds: 'abc' }))
                delete ss.settings
                const response = await importSnapshot(getOwnerId(), kind, ss, '', TestObjects.tokens.alice)
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'FST_ERR_VALIDATION')
            })

            it('Returns 400 for incorrect credentialSecret', async function () {
                const ss = dummySnapshot('dummy', [], {}, {}, {}, encryptCredentials('test-secret', { testCreds: 'abc' }))
                const response = await importSnapshot(getOwnerId(), kind, ss, 'wrong-secret', TestObjects.tokens.alice)
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'bad_request')
            })

            it(`TeamB member cannot import snapshot for ${kind} belonging to TeamA - 404`, async function () {
                const ss = dummySnapshot('dummy', [], {}, {}, {}, null)
                // chris (TeamB member, non admin) will attempt to import a snapshot into a project/device belonging to TeamA
                const response = await importSnapshot(getOwnerId(), kind, ss, null, TestObjects.tokens.chris) // chris is not a member of TeamA where the project/device is
                // 404 as a non member should not know the resource exists
                response.statusCode.should.equal(404)
                response.json().should.have.property('code', 'not_found')
            })

            it(`TeamA Owner cannot import snapshot for ${kind} belonging to TeamB - 404`, async function () {
                const ss = dummySnapshot('dummy', [], {}, {}, {}, encryptCredentials('test-secret', { testCreds: 'abc' }))
                // dave (TeamA owner, non admin) will attempt to import a snapshot into a project/device belonging to TeamB
                const response = await importSnapshot(getTeamBOwnerId(), kind, ss, 'test-secret', TestObjects.tokens.dave) // dave is the owner of Team B where the project/device is
                response.statusCode.should.equal(404)
            })

            it('Member cannot import snapshot - 403', async function () {
                const ss = dummySnapshot('dummy', [], {}, {}, {}, null)
                const response = await importSnapshot(getOwnerId(), kind, ss, null, TestObjects.tokens.bob)
                response.statusCode.should.equal(403)
                response.json().should.have.property('code', 'unauthorized')
            })

            it('Viewer cannot import snapshot - 403', async function () {
                const ss = dummySnapshot('dummy', [], {}, {}, {}, null)
                const response = await importSnapshot(getOwnerId(), kind, ss, null, TestObjects.tokens.verity)
                response.statusCode.should.equal(403)
                response.json().should.have.property('code', 'unauthorized')
            })
        }
        describe('instance', function () {
            tests('instance')
        })
        describe('device', function () {
            tests('device')
        })
    })

    // Tests for DELETE /api/v1/snapshots/{snapshotId}
    // * Deletes a full snapshot

    describe('Delete snapshot', function () {
        afterEach(async function () {
            await app.db.models.ProjectSnapshot.destroy({ where: {} })
        })

        /**
         * delete snapshot tests
         * @param {'instance' | 'device'} kind - 'instance' or 'device'
         */
        function tests (kind) {
            const createSnapshot = kind === 'instance' ? createInstanceSnapshot : createAppDeviceSnapshot

            it('Returns 404 for non-existent snapshot', async function () {
                const response = await getSnapshot('non-existent-snapshot-id', TestObjects.tokens.alice)
                response.statusCode.should.equal(404)
                response.json().should.have.property('code', 'not_found')
            })

            it('Non-member cannot delete snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                // ensure it really exists before assuming the non-member cannot access it
                const ownerResponse = await deleteSnapshot(result.id, TestObjects.tokens.alice)
                ownerResponse.statusCode.should.equal(200)

                const response = await deleteSnapshot(result.id, TestObjects.tokens.chris)

                // 404 as a non member should not know the resource exists
                response.statusCode.should.equal(404)
                response.json().should.have.property('code', 'not_found')
            })

            it('Owner can delete snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await deleteSnapshot(result.id, TestObjects.tokens.alice)

                response.statusCode.should.equal(200)
            })

            it('Member cannot delete snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await deleteSnapshot(result.id, TestObjects.tokens.bob)

                response.statusCode.should.equal(403)
                response.json().should.have.property('code', 'unauthorized')
            })

            it('Viewer cannot delete snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await deleteSnapshot(result.id, TestObjects.tokens.verity)

                response.statusCode.should.equal(403)
                response.json().should.have.property('code', 'unauthorized')
            })
        }
        describe('instance', function () {
            tests('instance')
        })
        describe('device', function () {
            tests('device')
        })
    })

    // Tests for PUT /api/v1/snapshots/{snapshotId}
    // * Updates a snapshot

    describe('Update snapshot', function () {
        afterEach(async function () {
            await app.db.models.ProjectSnapshot.destroy({ where: {} })
        })

        /**
         * put snapshot tests
         * @param {'instance' | 'device'} kind - 'instance' or 'device'
         */
        function tests (kind) {
            const createSnapshot = kind === 'instance' ? createInstanceSnapshot : createAppDeviceSnapshot

            it('Returns 404 for non-existent snapshot', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/snapshots/non-existent-snapshot-id',
                    payload: { name: 'new-name' },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(404)
                response.json().should.have.property('code', 'not_found')
            })

            it('Non-member cannot update snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                // ensure it really exists before assuming the non-member cannot access it
                const ownerResponse = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/snapshots/${result.id}`,
                    payload: { name: 'new-name' },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                ownerResponse.statusCode.should.equal(200)

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/snapshots/${result.id}`,
                    payload: { name: 'new-name' },
                    cookies: { sid: TestObjects.tokens.chris }
                })

                // 404 as a non member should not know the resource exists
                response.statusCode.should.equal(404)
                response.json().should.have.property('code', 'not_found')
            })

            it('Owner can update snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/snapshots/${result.id}`,
                    payload: { name: 'new-name', description: 'new-description' },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response.statusCode.should.equal(200)
                response.json().should.have.property('name', 'new-name')
                response.json().should.have.property('description', 'new-description')
            })

            it('Can update name only', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/snapshots/${result.id}`,
                    payload: { name: 'new-name' },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response.statusCode.should.equal(200)
                response.json().should.have.property('name', 'new-name')
                response.json().should.have.property('description', result.description) // description should not change
            })

            it('Can update description only', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/snapshots/${result.id}`,
                    payload: { description: 'new-description' },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response.statusCode.should.equal(200)
                response.json().should.have.property('name', result.name) // name should not change
                response.json().should.have.property('description', 'new-description')
            })

            it('Member cannot update snapshot', async function () {
                const snapshotResponse = await createSnapshot()
                const result = snapshotResponse.json()

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/snapshots/${result.id}`,
                    payload: { name: 'new-name' },
                    cookies: { sid: TestObjects.tokens.bob }
                })

                response.statusCode.should.equal(403)
                response.json().should.have.property('code', 'unauthorized')
            })
        }
        describe('instance', function () {
            tests('instance')
        })

        describe('device', function () {
            tests('device')
        })
    })
})
