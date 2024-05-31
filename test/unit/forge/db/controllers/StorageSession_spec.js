const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../setup')

const FF_UTIL = require('flowforge-test-utils')
const stubDriver = FF_UTIL.require('forge/containers/stub/index.js')

describe('Storage Session controller', function () {
    // Use standard test data.
    let app
    before(async function () {
        app = await setup()
        sinon.stub(stubDriver, 'revokeUserToken').resolves()
    })

    after(async function () {
        await app.close()
        stubDriver.revokeUserToken.restore()
    })

    describe('removeUserFromSessions', function () {
        it('removes user from any existing storage session', async function () {
            const p1 = await app.db.models.Project.create({ name: 'testProject-01', type: '', url: '' })
            const p2 = await app.db.models.Project.create({ name: 'testProject-02', type: '', url: '' })
            const p3 = await app.db.models.Project.create({ name: 'testProject-03', type: '', url: '' })
            p3.state = 'suspended'
            await p3.save()

            // p1 - two active sessions for alice, one for bob
            // p2 - no sessions for alice
            // p3 - one session for alice, one for bob - suspended
            const s1 = await app.db.models.StorageSession.create({
                sessions: '{"token1":{"user":"alice","client":"node-red-editor","scope":["*"],"accessToken":"token1","expires":1676376174919},"token2":{"user":"alice","client":"node-red-editor","scope":["*"],"accessToken":"token2","expires":1676376174919},"token3":{"user":"bob","client":"node-red-editor","scope":["*"],"accessToken":"token3","expires":1676376174919}}',
                ProjectId: p1.id
            })
            const s2 = await app.db.models.StorageSession.create({
                sessions: '{"token4":{"user":"bob","client":"node-red-editor","scope":["*"],"accessToken":"token3","expires":1676376174919}}',
                ProjectId: p2.id
            })
            const s3 = await app.db.models.StorageSession.create({
                sessions: '{"token5":{"user":"alice","client":"node-red-editor","scope":["*"],"accessToken":"token5","expires":1676376174919}}',
                ProjectId: p3.id
            })

            stubDriver.revokeUserToken.callCount.should.equal(0)
            await app.db.controllers.StorageSession.removeUserFromSessions(app.TestObjects.userAlice)

            // Should have asked the container driver to revoke 2 sessions (both p1 alice sessions)
            stubDriver.revokeUserToken.callCount.should.equal(2)

            stubDriver.revokeUserToken.firstCall.args[0].should.have.property('id', p1.id)
            stubDriver.revokeUserToken.firstCall.args[1].should.equal('token1')
            stubDriver.revokeUserToken.secondCall.args[0].should.have.property('id', p1.id)
            stubDriver.revokeUserToken.secondCall.args[1].should.equal('token2')

            await Promise.all([
                s1.reload(),
                s2.reload(),
                s3.reload()
            ])

            const s1Sessions = JSON.parse(s1.sessions)
            const s2Sessions = JSON.parse(s2.sessions)
            const s3Sessions = JSON.parse(s3.sessions)

            s1Sessions.should.not.have.property('token1')
            s1Sessions.should.not.have.property('token2')
            s1Sessions.should.have.property('token3')
            s2Sessions.should.have.property('token4')
            s3Sessions.should.not.have.property('token5')
        })
    })

    describe('removeUserFromTeamSessions', function () {
        it('remove user sessions from a teams instance\'s', async function () {
            const projectType = await app.factory.createProjectType({
                name: 'projectType2',
                description: 'default project type',
                properties: { foo: 'bar' }
            })

            const template = await app.factory.createProjectTemplate({
                name: 'template1',
                settings: {
                    httpAdminRoot: '',
                    codeEditor: '',
                    palette: {
                        npmrc: 'example npmrc',
                        catalogue: ['https://example.com/catalog'],
                        modules: [
                            { name: 'node-red-dashboard', version: '3.0.0' },
                            { name: 'node-red-contrib-ping', version: '0.3.0' }
                        ]
                    }
                },
                policy: {
                    httpAdminRoot: true,
                    dashboardUI: true,
                    codeEditor: true
                }
            }, app.TestObjects.userAlice)
            const stack = await app.factory.createStack({ name: 'stack1' }, projectType)
            const application = await app.factory.createApplication({ name: 'application-1' }, app.TestObjects.team1)

            const p1 = await app.factory.createInstance(
                { name: 'project-1' },
                application,
                stack,
                template,
                projectType,
                { start: false }
            )
            const p2 = await app.factory.createInstance(
                { name: 'project-2' },
                application,
                stack,
                template,
                projectType,
                { start: false }
            )

            // p1 - two active sessions for alice, one for bob
            // p2 - no sessions for alice
            const s1 = await app.db.models.StorageSession.create({
                sessions: '{"token1":{"user":"alice","client":"node-red-editor","scope":["*"],"accessToken":"token1","expires":1676376174919},"token2":{"user":"alice","client":"node-red-editor","scope":["*"],"accessToken":"token2","expires":1676376174919},"token3":{"user":"bob","client":"node-red-editor","scope":["*"],"accessToken":"token3","expires":1676376174919}}',
                ProjectId: p1.id
            })
            const s2 = await app.db.models.StorageSession.create({
                sessions: '{"token4":{"user":"bob","client":"node-red-editor","scope":["*"],"accessToken":"token3","expires":1676376174919}}',
                ProjectId: p2.id
            })

            await app.db.controllers.StorageSession.removeUserFromTeamSessions(app.TestObjects.userAlice, app.TestObjects.team1)

            await Promise.all([
                s1.reload(),
                s2.reload()
            ])

            const s1Sessions = JSON.parse(s1.sessions)
            const s2Sessions = JSON.parse(s2.sessions)
            s1Sessions.should.not.have.property('token1')
            s1Sessions.should.not.have.property('token2')
            s1Sessions.should.have.property('token3')
            s2Sessions.should.have.property('token4')
        })
    })
})
