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
                        findOrCreate: sandbox.stub()
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
