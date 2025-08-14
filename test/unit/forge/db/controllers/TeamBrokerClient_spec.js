const should = require('should')
const sinon = require('sinon')

const TeamBrokerClient = require('../../../../../forge/db/controllers/TeamBrokerClient')

describe('TeamBrokerClient', function () {
    let app
    let sandbox

    beforeEach(function () {
        sandbox = sinon.createSandbox()
        app = {
            db: {
                models: {
                    TeamBrokerClient: {
                        byUsername: sandbox.stub()
                    }
                }
            }
        }
    })

    afterEach(function () {
        sandbox.restore()
    })

    describe('authenticateCredentials', function () {
        function fakeBrokerClient ({ teamId = 1, teamHash = 'teamHash', ownerId = null, ownerType = null, password = 'pass', suspended = false, featureEnabled = true } = {}) {
            const { hash } = require('../../../../../forge/db/utils')
            return {
                ownerType,
                ownerId,
                Team: { id: teamId, hashid: teamHash, suspended, TeamType: { properties: { features: { teamBroker: featureEnabled } }, hashid: teamHash } },
                password: hash(password)
            }
        }
        it('should return true if password matches', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient({ password: 'pass123' }))
            const result = await TeamBrokerClient.authenticateCredentials(app, 'user@team', 'pass123')
            should(result).be.true()
        })

        it('should return false if password does not match', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient({ password: 'pass123' }))
            const result = await TeamBrokerClient.authenticateCredentials(app, 'user@team', 'wrongpass')
            should(result).be.false()
        })

        it('should return false if username is not in correct format', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient())
            const result = await TeamBrokerClient.authenticateCredentials(app, 'badusername', 'pass')
            should(result).be.false()
        })

        it('should return false if user not found', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(null)
            const result = await TeamBrokerClient.authenticateCredentials(app, 'user@team', 'pass')
            should(result).be.false()
        })

        it('should return false if team is suspended', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient({ suspended: true }))
            const result = await TeamBrokerClient.authenticateCredentials(app, 'user@team', 'pass')
            should(result).be.false()
        })

        it('should return false if teamBroker feature is not enabled', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient({ featureEnabled: false }))
            const result = await TeamBrokerClient.authenticateCredentials(app, 'user@team', 'pass')
            should(result).be.false()
        })

        it('should return false if password is missing or too long', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient({ password: 'a'.repeat(129) }))
            let result = await TeamBrokerClient.authenticateCredentials(app, 'user@team', null)
            should(result).be.false()
            result = await TeamBrokerClient.authenticateCredentials(app, 'user@team', 'a'.repeat(129))
            should(result).be.false()
        })
    })

    describe('authenticateNrMqttNodeUser', function () {
        function fakeBrokerClient ({ teamId = 1, teamHash = 'teamHash', ownerId = 'oid', ownerType = 'project', password = 'pass', suspended = false, featureEnabled = true } = {}) {
            const { hash } = require('../../../../../forge/db/utils')
            return {
                ownerType,
                ownerId,
                Team: { id: teamId, hashid: teamHash, suspended, TeamType: { properties: { features: { teamBroker: featureEnabled } }, hashid: teamHash } },
                Device: ownerType === 'device' ? { hashid: ownerId, id: 1, name: 'Device Name', type: 'deviceType' } : null,
                Project: ownerType === 'project' ? { id: ownerId, name: 'Project Name' } : null,
                password: hash(password)
            }
        }
        it('should return user details if all checks pass', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient())
            const result = await TeamBrokerClient.authenticateNrMqttNodeUser(app, 'mq:hosted:teamHash:oid', 'mq:hosted:teamHash:oid', 'pass')
            result.should.have.property('username', 'instance:oid')
            result.should.have.property('teamId', 'teamHash')
            result.should.have.property('clientIdValid', true)
        })

        it('should return user details for an instance when client includes HA id', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient())
            const result = await TeamBrokerClient.authenticateNrMqttNodeUser(app, 'mq:hosted:teamHash:oid', 'mq:hosted:teamHash:oid:haid1', 'pass')
            should(result).be.an.Object()
            should(result).have.property('username', 'instance:oid')
            should(result).have.property('teamId', 'teamHash')
            should(result).have.property('clientIdValid', true)
        })

        it('should return false for an device with a HA id', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient())
            const result = await TeamBrokerClient.authenticateNrMqttNodeUser(app, 'mq:remote:teamHash:oid', 'mq:remote:teamHash:oid:haid1', 'pass')
            should(result).be.false()
        })

        it('should return false for invalid username or clientId', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient())
            const result1 = await TeamBrokerClient.authenticateNrMqttNodeUser(app, 'bad:user:name:here', 'mq:hosted:teamHash:oid', 'pass')
            should(result1).be.false()
            const result2 = await TeamBrokerClient.authenticateNrMqttNodeUser(app, 'mq:hosted:teamHash:oid', 'bad:client:id:here', 'pass')
            should(result2).be.false()
        })

        it('should return false if clientId and username do not match', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient({ ownerId: 'oid1', ownerType: 'project' }))
            const result1 = await TeamBrokerClient.authenticateNrMqttNodeUser(app, 'mq:hosted:teamHash:oid1', 'mq:hosted:teamHash:oid2', 'pass')
            should(result1).be.false()
        })

        it('should return false if clientId and username do not match (with HA id)', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient({ ownerId: 'oid1', ownerType: 'project' }))
            const result1 = await TeamBrokerClient.authenticateNrMqttNodeUser(app, 'mq:hosted:teamHash:oid1', 'mq:hosted:teamHash:oid2:haid1', 'pass')
            should(result1).be.false()
        })

        it('should return false if user not found', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(null)
            const result = await TeamBrokerClient.authenticateNrMqttNodeUser(app, 'mq:hosted:teamHash:oid', 'mq:hosted:teamHash:oid', 'pass')
            should(result).be.false()
        })

        it('should return false if ownerType or ownerId do not match', async function () {
            const { hash } = require('../../../../../forge/db/utils')
            // setup a "remote" (device)
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient({ ownerType: 'device', ownerId: 'oid', password: hash('pass') }))
            // Now try to authenticate with the "hosted" (instance) credentials
            const result = await TeamBrokerClient.authenticateNrMqttNodeUser(app, 'mq:hosted:teamHash:oid', 'mq:hosted:teamHash:oid', 'pass')
            should(result).be.false('Owner type should not match')

            // since the point `byUsername` is called is after the basic checks and this, test should get there
            // therefore we can assert this by checking the call parameters
            app.db.models.TeamBrokerClient.byUsername.calledOnce.should.be.true()
            app.db.models.TeamBrokerClient.byUsername.calledWith('instance:oid', 'teamHash', true, true).should.be.true()

            app.db.models.TeamBrokerClient.byUsername.resetHistory()
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient({ ownerType: 'project', ownerId: 'different-oid' }))
            const result2 = await TeamBrokerClient.authenticateNrMqttNodeUser(app, 'mq:hosted:teamHash:oid', 'mq:hosted:teamHash:oid', 'pass')
            should(result2).be.false('Owner ID should not match')

            app.db.models.TeamBrokerClient.byUsername.calledOnce.should.be.true()
            app.db.models.TeamBrokerClient.byUsername.calledWith('instance:oid', 'teamHash', true, true).should.be.true()
        })

        it('should return false if team is suspended', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient({ suspended: true }))
            const result = await TeamBrokerClient.authenticateNrMqttNodeUser(app, 'mq:hosted:teamHash:oid', 'mq:hosted:teamHash:oid', 'pass')
            should(result).be.false()
        })

        it('should return false if teamBroker feature is not enabled', async function () {
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient({ featureEnabled: false }))
            const result = await TeamBrokerClient.authenticateNrMqttNodeUser(app, 'mq:hosted:teamHash:oid', 'mq:hosted:teamHash:oid', 'pass')
            should(result).be.false()
        })

        it('should return false if password does not match', async function () {
            const { hash } = require('../../../../../forge/db/utils')
            app.db.models.TeamBrokerClient.byUsername.resolves(fakeBrokerClient({ password: hash('pass123') }))
            const result = await TeamBrokerClient.authenticateNrMqttNodeUser(app, 'mq:hosted:teamHash:oid', 'mq:hosted:teamHash:oid', 'wrong-pass')
            should(result).be.false()
        })
    })

    describe('updateNtMqttNodeUserPassword', function () {
        it('should update password if client exists', async function () {
            const saveStub = sandbox.stub().resolves()
            app.db.models.TeamBrokerClient.byUsername.resolves({
                password: 'old',
                save: saveStub
            })
            const result = await TeamBrokerClient.updateNtMqttNodeUserPassword(app, 'teamId', 'instance', 'ownerId', 'newpass')
            should(result).be.true()
            saveStub.calledOnce.should.be.true()
        })
        it('should return false if client does not exist', async function () {
            const saveStub = sandbox.stub().resolves()
            app.db.models.TeamBrokerClient.byUsername.resolves(null)
            const result = await TeamBrokerClient.updateNtMqttNodeUserPassword(app, 'teamId', 'instance', 'ownerId', 'newpass')
            should(result).be.false()
            saveStub.called.should.be.false()
        })
    })
})
