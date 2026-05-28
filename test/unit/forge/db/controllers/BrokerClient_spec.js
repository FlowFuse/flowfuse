const should = require('should')
const sinon = require('sinon')

const BrokerClient = require('../../../../../forge/db/controllers/BrokerClient')

describe('BrokerClient', function () {
    let app
    let sandbox

    beforeEach(function () {
        sandbox = sinon.createSandbox()
        app = {
            config: {
                broker: {
                    public_url: 'http://public.url'
                }
            },
            comms: true,
            db: {
                models: {
                    BrokerClient: {
                        create: sandbox.stub(),
                        destroy: sandbox.stub(),
                        findOne: sandbox.stub(),
                        findOrCreate: sandbox.stub(),
                        byUsername: sandbox.stub()
                    }
                }
            },
            settings: {
                set: sandbox.stub(),
                get: sandbox.stub()
            }
        }
    })

    afterEach(function () {
        sandbox.restore()
    })

    function fakeBrokerClient ({ teamId = 1, teamHash = 'teamHash', ownerId = null, ownerType = null, username = '', password = 'pass', suspended = false, featureEnabled = true } = {}) {
        const { hash } = require('../../../../../forge/db/utils')
        return {
            ownerType,
            ownerId,
            username,
            password: hash(password),
            Team: {
                id: teamId,
                hashid: teamHash
            },
            destroy: sinon.stub().resolves(),
            save: sinon.stub().resolves()
        }
    }

    describe('authenticateCredentials', function () {
        it('should return true if password matches', async function () {
            app.db.models.BrokerClient.findOne.resolves(fakeBrokerClient({ username: 'expert-client:abc123:sess123', password: 'pass123' }))
            const result = await BrokerClient.authenticateCredentials(app, 'expert-client:abc123:sess123', 'pass123')
            should(result).be.true()
        })
        it('should return false if password does not match', async function () {
            app.db.models.BrokerClient.findOne.resolves(fakeBrokerClient({ username: 'expert-client:abc123:sess123', password: 'pass123' }))
            const result = await BrokerClient.authenticateCredentials(app, 'expert-client:abc123:sess123', 'wrongpass')
            should(result).be.false()
        })
        it('should return false if user not found', async function () {
            app.db.models.BrokerClient.findOne.resolves(null)
            const result = await BrokerClient.authenticateCredentials(app, 'expert-client:abc123:sess123', 'pass123')
            should(result).be.false()
        })
        it('should return false if password is missing', async function () {
            app.db.models.BrokerClient.findOne.resolves(fakeBrokerClient({ username: 'expert-client:abc123:sess123', password: 'pass123' }))
            const result = await BrokerClient.authenticateCredentials(app, 'expert-client:abc123:sess123', null)
            should(result).be.false()
        })
        it('should delete broker client if username starts with frontend: and password is correct', async function () {
            const fakeClient = fakeBrokerClient({ username: 'frontend:abc123:sess123', password: 'pass123' })
            app.db.models.BrokerClient.findOne.resolves(fakeClient)
            const result = await BrokerClient.authenticateCredentials(app, 'frontend:abc123:sess123', 'pass123')
            should(result).be.true()
            fakeClient.destroy.called.should.be.true()
        })
        it('should delete broker client if username starts with expert-client: and password is correct', async function () {
            const fakeClient = fakeBrokerClient({ username: 'expert-client:abc123:sess123', password: 'pass123' })
            app.db.models.BrokerClient.findOne.resolves(fakeClient)
            const result = await BrokerClient.authenticateCredentials(app, 'expert-client:abc123:sess123', 'pass123')
            should(result).be.true()
            fakeClient.destroy.called.should.be.true()
        })
    })

    describe('createClientForExpertAgent', function () {
        it('should create broker client and return username and password', async function () {
            const fakeClient = fakeBrokerClient()
            app.db.models.BrokerClient.findOrCreate.resolves([fakeClient, true])
            const result = await BrokerClient.createClientForExpertAgent(app)
            should(result).have.property('username', 'expert-agent:api:v1')
            should(result).have.property('password')
            result.password.should.match(/^ffbea_/) // check it has the right prefix
            fakeClient.save.called.should.be.false() // should not have saved since it was created
            app.settings.set.calledWith('platform:expert-agent:creds', true).should.be.true() // should have set the setting to true
        })
        it('should update password if client already exists', async function () {
            const fakeClient = fakeBrokerClient()
            app.db.models.BrokerClient.findOrCreate.resolves([fakeClient, false]) // not created, so should update
            const result = await BrokerClient.createClientForExpertAgent(app)
            should(result).have.property('username', 'expert-agent:api:v1')
            should(result).have.property('password')
            result.password.should.match(/^ffbea_/) // check it has the right prefix
            fakeClient.save.called.should.be.true() // should have saved the updated password
            app.settings.set.calledWith('platform:expert-agent:creds', true).should.be.true() // should have set the setting to true
        })
        it('should return null if app.comms is not available', async function () {
            app.comms = null
            const result = await BrokerClient.createClientForExpertAgent(app)
            should(result).be.null()
        })
    })
    describe('removeClientForExpertAgent', function () {
        it('should remove broker client', async function () {
            app.db.models.BrokerClient.destroy.resolves()
            await BrokerClient.removeClientForExpertAgent(app, 'expert-client:abc123:sess123')
            app.db.models.BrokerClient.destroy.calledWith({
                where: {
                    username: 'expert-agent:api:v1'
                }
            }).should.be.true()
            app.settings.set.calledWith('platform:expert-agent:creds', false).should.be.true()
        })
    })
    describe('createClientForTeamFrontend', function () {
        it('should create broker client for team frontend', async function () {
            const fakeClient = fakeBrokerClient()
            app.db.models.BrokerClient.findOne.resolves(null)
            app.db.models.BrokerClient.create.resolves(fakeClient)
            const user = { id: 7, hashid: 'userHash' }
            const team = { id: 11, hashid: 'teamHash' }
            const sessionId = 'tab-1234567890'
            const result = await BrokerClient.createClientForTeamFrontend(app, user, team, sessionId)
            const expectedUsername = `team-frontend:${user.hashid}:${team.hashid}:${sessionId}`
            should(result).have.property('username', expectedUsername)
            should(result).have.property('password')
            result.password.should.match(/^ffbtf_/)
            should(result).have.property('url', 'http://public.url')
            app.db.models.BrokerClient.create.calledWith({
                username: expectedUsername,
                password: result.password,
                ownerId: '' + user.id,
                ownerType: 'team-frontend'
            }).should.be.true()
        })
        it('should destroy existing client for same session before creating a new one', async function () {
            const existingClient = fakeBrokerClient()
            app.db.models.BrokerClient.findOne.resolves(existingClient)
            app.db.models.BrokerClient.create.resolves(fakeBrokerClient())
            const user = { id: 7, hashid: 'userHash' }
            const team = { id: 11, hashid: 'teamHash' }
            const result = await BrokerClient.createClientForTeamFrontend(app, user, team, 'tab-1234567890')
            existingClient.destroy.called.should.be.true()
            should(result).have.property('username', `team-frontend:${user.hashid}:${team.hashid}:tab-1234567890`)
        })
        it('should look up existing client scoped to the full username (including sessionId) so different tabs do not revoke each other', async function () {
            app.db.models.BrokerClient.findOne.resolves(null)
            app.db.models.BrokerClient.create.resolves(fakeBrokerClient())
            const user = { id: 7, hashid: 'userHash' }
            const team = { id: 11, hashid: 'teamHash' }
            await BrokerClient.createClientForTeamFrontend(app, user, team, 'tab-A')
            const findOneArgs = app.db.models.BrokerClient.findOne.firstCall.args[0]
            findOneArgs.should.have.property('where')
            findOneArgs.where.should.have.property('username', `team-frontend:${user.hashid}:${team.hashid}:tab-A`)
        })
        it('should return null if app.comms is not available', async function () {
            app.comms = null
            const result = await BrokerClient.createClientForTeamFrontend(app, { id: 7, hashid: 'userHash' }, { id: 11, hashid: 'teamHash' }, 'tab-1234567890')
            should(result).be.null()
        })
    })
    describe('createClientForExpertClient', function () {
        it('should create broker client for expert client', async function () {
            const fakeClient = fakeBrokerClient()
            app.db.models.BrokerClient.findOne.resolves(null) // no existing client
            app.db.models.BrokerClient.create.resolves(fakeClient)
            const user = { id: 123, hashid: 'abc123' }
            const sessionId = 'sess123'
            const result = await BrokerClient.createClientForExpertClient(app, user, sessionId)
            const expectedUsername = `expert-client:${user.hashid}:${sessionId}`
            should(result).have.property('username', expectedUsername)
            should(result).have.property('password')
            result.password.should.match(/^ffbec_/) // check it has the right prefix
            app.db.models.BrokerClient.create.calledWith({
                username: expectedUsername,
                password: result.password,
                ownerId: '' + user.id,
                ownerType: 'expert-user'
            }).should.be.true()
        })
        it('should destroy existing client before creating new one', async function () {
            const fakeClient = fakeBrokerClient()
            app.db.models.BrokerClient.findOne.resolves(fakeClient) // existing client found
            app.db.models.BrokerClient.create.resolves(fakeClient)
            const user = { id: 123, hashid: 'abc123' }
            const sessionId = 'sess123'
            const result = await BrokerClient.createClientForExpertClient(app, user, sessionId)
            const expectedUsername = `expert-client:${user.hashid}:${sessionId}`
            should(result).have.property('username', expectedUsername)
            should(result).have.property('password')
            result.password.should.match(/^ffbec_/) // check it has the right prefix
            fakeClient.destroy.called.should.be.true() // should have destroyed existing client
            app.db.models.BrokerClient.create.calledWith({
                username: expectedUsername,
                password: result.password,
                ownerId: '' + user.id,
                ownerType: 'expert-user'
            }).should.be.true()
        })
        it('should return null if app.comms is not available', async function () {
            app.comms = null
            const result = await BrokerClient.createClientForExpertClient(app, { id: 123, hashid: 'abc123' }, 'sess123')
            should(result).be.null()
        })
    })
})
