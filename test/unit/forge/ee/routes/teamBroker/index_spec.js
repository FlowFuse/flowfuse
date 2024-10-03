const should = require('should') // eslint-disable-line

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')

describe('Team Broker API', function () {
    let app
    const TestObjects = { tokens: {} }

    before(async function () {
        app = await setup()
        await login('alice', 'aaPassword')

        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
        const defaultTeamTypeProperties = defaultTeamType.properties

        if (defaultTeamTypeProperties.features) {
            defaultTeamTypeProperties.features.teamBroker = true
        } else {
            defaultTeamTypeProperties.features = {
                teamBroker: true
            }
        }
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()
    })

    after(async function () {
        await app.close()
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

    describe.only('Work with MQTT Broker Users', function () {
        it('Create MQTT Broker User', async function () {
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/teams/${app.team.hashid}/broker/user`,
                cookies: { sid: TestObjects.tokens.alice},
                body: {
                    username: 'alice',
                    acls: [
                        {
                            pattern: 'foo/#',
                            action: 'both'
                        }
                    ]
                }
            })
            response.statusCode.should.equal(201)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('username', 'alice')
        })

        it('Get all MQTT broker users for a team', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/broker/users`,
                cookies: { sid: TestObjects.tokens.alice}
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.a.lengthOf(1)
            result[0].should.have.property('username', 'alice')
        })

        it('Delete MQTT Broker User', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/teams/${app.team.hashid}/broker/user/alice`,
                cookies: { sid: TestObjects.tokens.alice}
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('status')
        })
    })
})