const crypto = require('crypto')

const should = require('should') // eslint-disable-line no-unused-vars

const { addFlowsToProject } = require('../../../../lib/Snapshots')
const TestModelFactory = require('../../../../lib/TestModelFactory')
const setup = require('../setup')

const FF_UTIL = require('flowforge-test-utils')

const { Roles } = FF_UTIL.require('forge/lib/roles')

function decryptCredentials (key, cipher) {
    let flows = cipher.$
    const initVector = Buffer.from(flows.substring(0, 32), 'hex')
    flows = flows.substring(32)
    const decipher = crypto.createDecipheriv('aes-256-ctr', key, initVector)
    const decrypted = decipher.update(flows, 'base64', 'utf8') + decipher.final('utf8')
    return JSON.parse(decrypted)
}

describe('Project Snapshots API', function () {
    let app
    let factory
    const TestObjects = {}

    before(async function () {
        app = await setup()
        factory = new TestModelFactory(app)

        TestObjects.project1 = app.project

        // Create the 2nd project here instead of have it as a base setup shared by many tests

        TestObjects.project2 = await factory.createInstance(
            { name: 'project2' },
            app.application,
            app.stack,
            app.template,
            app.projectType,
            { start: false }
        )

        // alice : admin
        // bob
        // chris

        // ATeam ( alice (owner), bob )

        // project1 owned by ATeam

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Member } })

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')

        // TestObjects.tokens.alice = (await app.db.controllers.AccessToken.createTokenForPasswordReset(TestObjects.alice)).token
        TestObjects.tokens.project = (await TestObjects.project1.refreshAuthTokens()).token
        TestObjects.tokens.project2 = (await TestObjects.project2.refreshAuthTokens()).token

        TestObjects.template1 = app.template
        TestObjects.stack1 = app.stack
    })
    after(async function () {
        await TestObjects.project2.destroy()
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

    after(async function () {
        await app.close()
    })

    async function exportSnapshot (projectId, snapshotId, key, cookie, credentials = null) {
        return await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${projectId}/snapshots/${snapshotId}/export`,
            ...(cookie ? { cookies: { sid: cookie } } : {}),
            payload: {
                credentialSecret: key,
                ...(credentials ? { credentials } : {})
            }
        })
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

    async function validateProjectSnapshotsBase (projectId,
        token,
        expectedSnapshotsNum,
        checkSpecificSnapshotId = null) {
        const projectSnapshots = (await listProjectSnapshots(projectId, token)).json()
        projectSnapshots.snapshots.should.have.lengthOf(expectedSnapshotsNum)

        // Question inline: Is this by design that there's no unique constraint among 'visible' snapshot's
        // identification data (name, or more compound {name + description} ?
        // Having such constraint would simplify version control using what operator can see in UX (name, description),
        // not just internal id (which they not only do not see but also do not control)
        if (checkSpecificSnapshotId) {
            const importedSnapshot = projectSnapshots.snapshots.filter(snap => snap.id === checkSpecificSnapshotId)
            importedSnapshot.should.have.lengthOf(1)
        }
    }

    /**
     * A flavor of 'create snapshot' while allow partial/full override of project's (denoted by "projectId") aspect,
     * one of the [flows, credentials, settings].
     * @param {String} projectId also known as "instance id" - id of project A
     * @param {String} token auth token
     * @param {String} credentialSecret credentials secret of project A
     * @param {Boolean} setAsTarget: indicates whether this snapshot should be set as target for project
     * @param {Object} snapshot the snapshot object
     * @param {Boolean} alt: boolean flag, indicates whether the snapshot object is in alternative format where flows and credentials are in separate objects
     * @return {Promise<*>}
     */
    async function importSnapshot (projectId,
        token,
        credentialSecret,
        setAsTarget,
        snapshot,
        alt = true) {
        if (!snapshot || !credentialSecret) {
            return { statusCode: 500 }
        }
        const proto = { ...snapshot }
        if (alt) {
            proto.credentials = proto.flows.credentials
            proto.flows = proto.flows.flows
        }

        return await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${projectId}/snapshots`,
            payload: {
                setAsTarget,
                ...proto,
                credentialSecret
            },
            cookies: { sid: token }
        })
    }

    async function listProjectSnapshots (projectId, token) {
        return await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${projectId}/snapshots`,
            cookies: { sid: token }
        })
    }

    describe('Create project snapshot', function () {
        it('Non-owner can create project snapshot', async function () {
            // Bob (non-owner) can create in ATeam
            const response = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.bob)
            response.statusCode.should.equal(200)
        })

        it('Non-member cannot create project snapshot', async function () {
            // Chris (non-member) cannot create in ATeam
            const response = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.chris)
            // 404 as a non member should not know the resource exists
            response.statusCode.should.equal(404)
        })

        it('Create a project snapshot - empty state', async function () {
            const response = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'test-project-snapshot-01')
            result.should.have.property('createdAt')
            result.should.have.property('updatedAt')
            result.should.have.property('user')
            result.user.should.have.property('id', TestObjects.alice.hashid)

            const snapshotObj = await app.db.models.ProjectSnapshot.byId(result.id)
            const snapshot = snapshotObj.toJSON()
            snapshot.flows.should.have.property('flows')
            snapshot.flows.flows.should.have.lengthOf(0)
            snapshot.flows.should.not.have.property('credentials')
            snapshot.settings.should.have.property('settings')
            snapshot.settings.should.have.property('env')
            snapshot.settings.should.have.property('modules')
        })

        it('Create a project snapshot - capture real state', async function () {
            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {
                    httpAdminRoot: '/test-red',
                    dashboardUI: '/test-dash',
                    env: [
                        { name: 'one', value: 'a' },
                        { name: 'two', value: 'b' }
                    ]
                }
            )
            const response = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'test-project-snapshot-01')
            result.should.have.property('createdAt')
            result.should.have.property('updatedAt')
            result.should.have.property('user')
            result.user.should.have.property('id', TestObjects.alice.hashid)

            const snapshotObj = await app.db.models.ProjectSnapshot.byId(result.id)
            const snapshot = snapshotObj.toJSON()
            snapshot.flows.should.have.property('flows')
            snapshot.flows.flows.should.have.lengthOf(1)
            snapshot.flows.flows[0].should.have.property('id', 'node1')
            snapshot.flows.should.have.property('credentials')
            snapshot.flows.credentials.should.have.property('$')
            snapshot.settings.should.have.property('settings')
            snapshot.settings.settings.should.have.property('httpAdminRoot', '/test-red')
            snapshot.settings.settings.should.have.property('dashboardUI', '/test-dash')
            snapshot.settings.should.have.property('env')
            snapshot.settings.env.should.have.property('one', 'a')
            snapshot.settings.env.should.have.property('two', 'b')
            snapshot.settings.should.have.property('modules')
        })

        it('Create a project snapshot - externally provided flows/creds/modules real state', async function () {
            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {
                    httpAdminRoot: '/test-red',
                    dashboardUI: '/test-dash',
                    env: [
                        { name: 'one', value: 'a' },
                        { name: 'two', value: 'b' }
                    ]
                }
            )
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${TestObjects.project1.id}/snapshots`,
                payload: {
                    name: 'test-project-snapshot-02',
                    flows: [{ id: 'nodeNew' }],
                    credentials: { nodeNew: { a: 1 } },
                    settings: {
                        modules: {
                            foo: '1.2'
                        }
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'test-project-snapshot-02')
            result.should.have.property('createdAt')
            result.should.have.property('updatedAt')
            result.should.have.property('user')
            result.user.should.have.property('id', TestObjects.alice.hashid)

            const snapshotObj = await app.db.models.ProjectSnapshot.byId(result.id)
            const snapshot = snapshotObj.toJSON()
            snapshot.flows.should.have.property('flows')
            snapshot.flows.flows.should.have.lengthOf(1)
            snapshot.flows.flows[0].should.have.property('id', 'nodeNew')
            snapshot.flows.should.have.property('credentials')
            snapshot.flows.credentials.should.have.property('$')
            snapshot.settings.should.have.property('settings')
            snapshot.settings.settings.should.have.property('httpAdminRoot', '/test-red')
            snapshot.settings.settings.should.have.property('dashboardUI', '/test-dash')
            snapshot.settings.should.have.property('env')
            snapshot.settings.env.should.have.property('one', 'a')
            snapshot.settings.env.should.have.property('two', 'b')
            snapshot.settings.should.have.property('modules')
            snapshot.settings.modules.should.have.property('foo', '1.2')
        })
    })

    describe('Export a snapshot', function () {
        const projectCredentialsSecretA = 'keyA'
        const projectCredentialsSecretB = 'keyB'
        afterEach(async function () {
            await app.db.models.ProjectSnapshot.destroy({ where: {} })
        })
        it('Non-team member cannot export project snapshot', async function () {
            // Chris (non-member) cannot export ("create" permission at the moment) in ATeam
            const response = await exportSnapshot(TestObjects.project1.id,
                'test-project-snapshot-03',
                projectCredentialsSecretB,
                TestObjects.tokens.chris)

            // 404 as a non member should not know the resource exists
            response.statusCode.should.equal(404)
        })
        it('Non-Team owner cannot export project snapshot', async function () {
            // Bob (regular member) cannot export ("create" permission at the moment) in ATeam
            const response = await exportSnapshot(TestObjects.project1.id,
                'test-project-snapshot-03',
                projectCredentialsSecretB,
                TestObjects.tokens.bob)

            // 404 as a non-owner should not know the resource exists
            response.statusCode.should.equal(404)
        })

        it('Export project A snapshot and apply it to project B', async function () {
            const aCreds = { testCreds: 'abc' }
            const bCredsRaw = { testCreds: 'def' }

            const aFlowSignificatorNodeId = 'node1'
            const bFlowSignificatorNodeId = 'node2'

            const aEnvSignificator = 'one'
            const bEnvSignificator = 'three'

            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: aFlowSignificatorNodeId }],
                aCreds,
                projectCredentialsSecretA,
                {
                    httpAdminRoot: '/test-red',
                    dashboardUI: '/test-dash',
                    env: [
                        { name: aEnvSignificator, value: 'a' },
                        { name: 'two', value: 'b' }
                    ]
                }
            )

            await addFlowsToProject(app,
                TestObjects.project2.id,
                TestObjects.tokens.project2,
                TestObjects.tokens.alice,
                [{ id: bFlowSignificatorNodeId }],
                bCredsRaw,
                projectCredentialsSecretB,
                {
                    httpAdminRoot: '/test-red-2',
                    dashboardUI: '/test-dash-2',
                    env: [
                        { name: bEnvSignificator, value: 'c' },
                        { name: 'four', value: 'd' }
                    ]
                }
            )

            const snapshotName = 'test-project-snapshot-03'
            const response = await createSnapshot(TestObjects.project1.id, snapshotName, TestObjects.tokens.alice)
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', snapshotName)
            result.should.have.property('createdAt')
            result.should.have.property('updatedAt')
            result.should.have.property('user')
            result.user.should.have.property('id', TestObjects.alice.hashid)

            const snapshotObj = await app.db.models.ProjectSnapshot.byId(result.id)
            const snapshot = snapshotObj.toJSON()
            snapshot.flows.should.have.property('flows')
            snapshot.flows.flows.should.have.lengthOf(1)
            snapshot.flows.flows[0].should.have.property('id', 'node1')
            snapshot.flows.should.have.property('credentials')
            snapshot.flows.credentials.should.have.property('$')
            snapshot.settings.should.have.property('settings')
            snapshot.settings.settings.should.have.property('httpAdminRoot', '/test-red')
            snapshot.settings.settings.should.have.property('dashboardUI', '/test-dash')
            snapshot.settings.should.have.property('env')
            snapshot.settings.env.should.have.property('one', 'a')
            snapshot.settings.env.should.have.property('two', 'b')
            snapshot.settings.should.have.property('modules')

            // we consider in this test that credentials of Project B will be used.
            // If credentials of Project A are fine, credentials can be left blank in request
            const exportResponse = await exportSnapshot(
                TestObjects.project1.id,
                result.id,
                projectCredentialsSecretB,
                TestObjects.tokens.alice,
                bCredsRaw)
            exportResponse.statusCode.should.equal(200)

            const exportResult = exportResponse.json()

            // verify the integrity of exported snapshot
            exportResult.should.have.property('id', result.id)
            exportResult.should.have.property('name', snapshotName)
            exportResult.should.have.property('createdAt')
            exportResult.should.have.property('updatedAt')
            exportResult.should.have.property('user')
            exportResult.user.should.have.property('id', TestObjects.alice.hashid)

            exportResult.should.have.property('flows').and.be.an.Object()
            exportResult.flows.should.have.property('flows').and.be.an.Array()
            exportResult.flows.flows.should.have.lengthOf(1)
            exportResult.flows.flows[0].should.have.property('id', 'node1')

            // verify credentials of exported snapshot. Should belong to Project B according to setup above
            exportResult.flows.should.have.property('credentials')
            exportResult.flows.credentials.should.have.only.keys('$')

            const credSecretB = await TestObjects.project2.getCredentialSecret()
            const keyHashB = crypto.createHash('sha256').update(credSecretB).digest()

            const decryptedCreds = decryptCredentials(keyHashB, exportResult.flows.credentials)
            JSON.stringify(decryptedCreds).should.equal(JSON.stringify(bCredsRaw))

            // time to create this snapshot on project B
            // check that public API works
            const importResponse = await importSnapshot(
                TestObjects.project2.id,
                TestObjects.tokens.alice,
                projectCredentialsSecretB,
                true,
                exportResult,
                false) // false means the snapshot objects flows and credentials are in the same object

            importResponse.statusCode.should.equal(200)
            const importResult = importResponse.json()
            importResult.should.have.property('id')
            importResult.should.have.property('name', snapshotName)

            await validateProjectSnapshotsBase(
                TestObjects.project2.id,
                TestObjects.tokens.alice,
                1,
                importResult.id
            )

            // create this snapshot once again via controller to verify the imported snapshot integrity
            const options = { ...exportResult, name: 'test-project-snapshot-04' }
            options.credentials = options.flows.credentials
            options.flows = options.flows.flows
            options.credentialSecret = credSecretB

            const snapshotViaController =
                await app.db.controllers.ProjectSnapshot.createSnapshot(
                    TestObjects.project2,
                    TestObjects.alice,
                    options)

            snapshotViaController.should.have.property('flows').and.be.an.Object()
            snapshotViaController.flows.should.have.only.keys('flows', 'credentials')
            snapshotViaController.flows.flows.should.be.an.Array().and.have.length(1)
            snapshotViaController.flows.flows[0].should.have.property('id', aFlowSignificatorNodeId)
            snapshotViaController.flows.credentials.should.be.an.Object().and.have.only.keys('$')
            snapshotViaController.should.have.property('settings').and.be.an.Object()
            snapshotViaController.settings.should.have.property('env')

            // verify result has the proper env
            snapshotViaController.settings.env.should.have.property(aEnvSignificator)
            snapshotViaController.settings.env.should.have.property(aEnvSignificator)
            snapshotViaController.settings.env.should.have.property('FF_INSTANCE_ID', TestObjects.project2.id)

            // verify that credentials belong to Project B
            const iDecryptedCreds = decryptCredentials(keyHashB, snapshotViaController.flows.credentials)
            JSON.stringify(iDecryptedCreds).should.equal(JSON.stringify(bCredsRaw))

            // verify we have expected number of snapshots now (2)
            await validateProjectSnapshotsBase(
                TestObjects.project2.id,
                TestObjects.tokens.alice,
                2
            )
        })
        it('Export project A snapshot and apply it to project B (Alt API format)', async function () {
            const aCreds = { testCreds: 'abc' }
            const bCredsRaw = { testCreds: 'def' }

            const aFlowSignificatorNodeId = 'node1alt'
            const bFlowSignificatorNodeId = 'node2alt'

            const aEnvSignificator = 'one'
            const bEnvSignificator = 'three'

            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: aFlowSignificatorNodeId }],
                aCreds,
                projectCredentialsSecretA,
                {
                    httpAdminRoot: '/test-red',
                    dashboardUI: '/test-dash',
                    env: [
                        { name: aEnvSignificator, value: 'a' },
                        { name: 'two', value: 'b' }
                    ]
                }
            )

            await addFlowsToProject(app,
                TestObjects.project2.id,
                TestObjects.tokens.project2,
                TestObjects.tokens.alice,
                [{ id: bFlowSignificatorNodeId }],
                bCredsRaw,
                projectCredentialsSecretB,
                {
                    httpAdminRoot: '/test-red-2',
                    dashboardUI: '/test-dash-2',
                    env: [
                        { name: bEnvSignificator, value: 'c' },
                        { name: 'four', value: 'd' }
                    ]
                }
            )

            const snapshotName = 'test-project-snapshot-03alt'
            const response = await createSnapshot(TestObjects.project1.id, snapshotName, TestObjects.tokens.alice)
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', snapshotName)
            result.should.have.property('createdAt')
            result.should.have.property('updatedAt')
            result.should.have.property('user')
            result.user.should.have.property('id', TestObjects.alice.hashid)

            const snapshotObj = await app.db.models.ProjectSnapshot.byId(result.id)
            const snapshot = snapshotObj.toJSON()
            snapshot.flows.should.have.property('flows')
            snapshot.flows.flows.should.have.lengthOf(1)
            snapshot.flows.flows[0].should.have.property('id', 'node1alt')
            snapshot.flows.should.have.property('credentials')
            snapshot.flows.credentials.should.have.property('$')
            snapshot.settings.should.have.property('settings')
            snapshot.settings.settings.should.have.property('httpAdminRoot', '/test-red')
            snapshot.settings.settings.should.have.property('dashboardUI', '/test-dash')
            snapshot.settings.should.have.property('env')
            snapshot.settings.env.should.have.property('one', 'a')
            snapshot.settings.env.should.have.property('two', 'b')
            snapshot.settings.should.have.property('modules')

            // we consider in this test that credentials of Project B will be used.
            // If credentials of Project A are fine, credentials can be left blank in request
            const exportResponse = await exportSnapshot(
                TestObjects.project1.id,
                result.id,
                projectCredentialsSecretB,
                TestObjects.tokens.alice,
                bCredsRaw)
            exportResponse.statusCode.should.equal(200)

            const exportResult = exportResponse.json()

            // verify the integrity of exported snapshot
            exportResult.should.have.property('id', result.id)
            exportResult.should.have.property('name', snapshotName)
            exportResult.should.have.property('createdAt')
            exportResult.should.have.property('updatedAt')
            exportResult.should.have.property('user')
            exportResult.user.should.have.property('id', TestObjects.alice.hashid)

            exportResult.should.have.property('flows').and.be.an.Object()
            exportResult.flows.should.have.property('flows').and.be.an.Array()
            exportResult.flows.flows.should.have.lengthOf(1)
            exportResult.flows.flows[0].should.have.property('id', 'node1alt')

            // verify credentials of exported snapshot. Should belong to Project B according to setup above
            exportResult.flows.should.have.property('credentials')
            exportResult.flows.credentials.should.have.only.keys('$')

            const credSecretB = await TestObjects.project2.getCredentialSecret()
            const keyHashB = crypto.createHash('sha256').update(credSecretB).digest()

            const decryptedCreds = decryptCredentials(keyHashB, exportResult.flows.credentials)
            JSON.stringify(decryptedCreds).should.equal(JSON.stringify(bCredsRaw))

            // time to create this snapshot on project B
            // check that public API works
            const importResponse = await importSnapshot(
                TestObjects.project2.id,
                TestObjects.tokens.alice,
                projectCredentialsSecretB,
                true,
                exportResult,
                true // true means the snapshot objects flows and credentials are nested in the flows object
            )
            importResponse.statusCode.should.equal(200)
            const importResult = importResponse.json()
            importResult.should.have.property('id')
            importResult.should.have.property('name', snapshotName)

            await validateProjectSnapshotsBase(
                TestObjects.project2.id,
                TestObjects.tokens.alice,
                1,
                importResult.id
            )

            // create this snapshot once again via controller to verify the imported snapshot integrity
            const options = { ...exportResult, name: 'test-project-snapshot-04alt' }
            options.credentials = options.flows.credentials
            options.flows = options.flows.flows
            options.credentialSecret = credSecretB

            const snapshotViaController =
                await app.db.controllers.ProjectSnapshot.createSnapshot(
                    TestObjects.project2,
                    TestObjects.alice,
                    options)

            snapshotViaController.should.have.property('flows').and.be.an.Object()
            snapshotViaController.flows.should.have.only.keys('flows', 'credentials')
            snapshotViaController.flows.flows.should.be.an.Array().and.have.length(1)
            snapshotViaController.flows.flows[0].should.have.property('id', aFlowSignificatorNodeId)
            snapshotViaController.flows.credentials.should.be.an.Object().and.have.only.keys('$')
            snapshotViaController.should.have.property('settings').and.be.an.Object()
            snapshotViaController.settings.should.have.property('env')

            // verify result has the proper env
            snapshotViaController.settings.env.should.have.property(aEnvSignificator)
            snapshotViaController.settings.env.should.have.property(aEnvSignificator)
            snapshotViaController.settings.env.should.have.property('FF_INSTANCE_ID', TestObjects.project2.id)

            // verify that credentials belong to Project B
            const iDecryptedCreds = decryptCredentials(keyHashB, snapshotViaController.flows.credentials)
            JSON.stringify(iDecryptedCreds).should.equal(JSON.stringify(bCredsRaw))

            // verify we have expected number of snapshots now (2)
            await validateProjectSnapshotsBase(
                TestObjects.project2.id,
                TestObjects.tokens.alice,
                2
            )
        })
    })

    describe('Rollback a snapshot', function () {
        it('Rolls back to a different snapshot', async function () {
            // Setup an initial configuration
            const setupResult = await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {
                    httpAdminRoot: '/test-red',
                    dashboardUI: '/test-dash',
                    palette: {
                        modules: [
                            { name: 'module1', version: '1.0.0' }
                        ]
                    },
                    env: [
                        { name: 'one', value: 'a' },
                        { name: 'two', value: 'b' }
                    ]
                }
            )
            // ensure setup was successful before generating a snapshot & performing rollback
            setupResult.flowsAddResponse.statusCode.should.equal(200)
            setupResult.credentialsCreateResponse.statusCode.should.equal(200)
            setupResult.storageSettingsResponse.statusCode.should.equal(200)
            setupResult.updateProjectSettingsResponse.statusCode.should.equal(200)

            // Generate a snapshot
            const response = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            response.statusCode.should.equal(200)
            const snapshot1 = response.json()

            // Change lots of things
            const changeResult = await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node2' }],
                { testCreds: 'def' },
                'key1',
                {
                    httpAdminRoot: '/test-red-2',
                    dashboardUI: '/test-dash-2',
                    palette: {
                        modules: [
                            { name: 'module2', version: '2.0.0' }
                        ]
                    },
                    env: [
                        { name: 'one', value: 'a2' },
                        { name: 'two', value: 'b2' }
                    ]
                }
            )
            changeResult.updateProjectSettingsResponse.statusCode.should.equal(200)

            // verify the changes were successful before performing rollback
            const settingsURL = `/api/v1/projects/${app.project.id}/settings`
            const changedSettingsResponse = await app.inject({
                method: 'GET',
                url: settingsURL,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.project}`
                }
            })
            const changedSettings = changedSettingsResponse.json()

            changedSettings.settings.httpAdminRoot.should.equal('/test-red-2') // was changed
            changedSettings.settings.dashboardUI.should.equal('/test-dash-2') // was changed
            changedSettings.settings.palette.modules.should.not.have.property('module1') // was removed (modules array are replaced not merged)
            changedSettings.settings.palette.modules.should.have.property('module2', '2.0.0') // was added
            changedSettings.env.should.have.property('one', 'a2') // was changed
            changedSettings.env.should.have.property('two', 'b2') // was changed

            // Rollback to the original snapshot
            const rollbackResponse = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${app.project.id}/actions/rollback`,
                payload: {
                    snapshot: snapshot1.id
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            rollbackResponse.statusCode.should.equal(200)

            // Get the new settings after rollback
            const rolledBackSettingsResponse = await app.inject({
                method: 'GET',
                url: settingsURL,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.project}`
                }
            })
            const rolledBackSettings = rolledBackSettingsResponse.json()

            // Validate the settings are correctly rolled back
            rolledBackSettings.settings.httpAdminRoot.should.equal('/test-red')
            rolledBackSettings.settings.dashboardUI.should.equal('/test-dash')
            rolledBackSettings.settings.palette.modules.should.have.property('module1', '1.0.0')
            rolledBackSettings.settings.palette.modules.should.not.have.property('module2', '2.0.0')
            rolledBackSettings.env.should.have.property('one', 'a')
            rolledBackSettings.env.should.have.property('two', 'b')
        })
    })

    describe('Get snapshot information', function () {
        it('Non-member cannot get project snapshot', async function () {
            // Chris (non-member) cannot create in ATeam

            // First alice creates one
            const snapshotResponse = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            const result = snapshotResponse.json()

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.project1.id}/snapshots/${result.id}`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            // 404 as a non member should not know the resource exists
            response.statusCode.should.equal(404)
        })
        it('Get snapshot', async function () {
            // First alice creates one
            const snapshotResponse = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            const snapshotResult = snapshotResponse.json()

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.project1.id}/snapshots/${snapshotResult.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.should.have.property('id', snapshotResult.id)
        })
        it('Cannot get snapshot for different instance', async function () {
            // First alice creates one
            const snapshotResponse = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            const snapshotResult = snapshotResponse.json()

            // Verify it cannot be retrieved under project2 api
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.project2.id}/snapshots/${snapshotResult.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(404)
        })
    })

    describe('Delete a snapshot', function () {
        it('Non-owner cannot delete a project snapshot', async function () {
            // Bob (non-owner) cannot delete in ATeam

            // First alice creates one
            const snapshotResponse = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            const result = snapshotResponse.json()

            // Then bob tries to delete it
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/projects/${TestObjects.project1.id}/snapshots/${result.id}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })
        it('Team owner can delete a project snapshot', async function () {
            // Alice (owner) can delete in ATeam

            // First alice creates one
            const snapshotResponse = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            const result = snapshotResponse.json()

            // Then alice tries to delete it
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/projects/${TestObjects.project1.id}/snapshots/${result.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)

            const snapshotList = (await listProjectSnapshots(TestObjects.project1.id, TestObjects.tokens.alice)).json()
            const snapshot = snapshotList.snapshots.filter(snap => snap.id === result.id)
            snapshot.should.have.lengthOf(0)
        })
    })
})
