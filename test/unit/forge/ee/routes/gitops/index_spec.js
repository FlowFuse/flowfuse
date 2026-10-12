const should = require('should') // eslint-disable-line

const setup = require('../../setup')

describe('Git tokens API', function () {
    let app
    let aliceSid
    let enabledTeam
    let disabledTeam

    before(async function () {
        app = await setup()

        const login = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username: 'alice', password: 'aaPassword', remember: false }
        })
        aliceSid = login.cookies[0].value

        const enabledType = await app.factory.createTeamType({
            name: 'git-enabled-type',
            properties: { features: { gitIntegration: true } }
        })
        const disabledType = await app.factory.createTeamType({
            name: 'git-disabled-type',
            properties: { features: { gitIntegration: false } }
        })
        const alice = await app.db.models.User.byUsername('alice')
        enabledTeam = await app.factory.createTeam({ name: 'GitEnabledTeam', TeamTypeId: enabledType.id })
        await enabledTeam.addUser(alice, { through: { role: app.factory.Roles.Roles.Owner } })
        disabledTeam = await app.factory.createTeam({ name: 'GitDisabledTeam', TeamTypeId: disabledType.id })
        await disabledTeam.addUser(alice, { through: { role: app.factory.Roles.Roles.Owner } })
    })

    after(async function () {
        await app.close()
    })

    function request (method, teamId, payload) {
        return app.inject({
            method,
            url: `/api/v1/teams/${teamId}/git/tokens`,
            payload,
            cookies: { sid: aliceSid }
        })
    }

    it('lists tokens when the feature is enabled for the team', async function () {
        const response = await request('GET', enabledTeam.hashid)
        response.statusCode.should.equal(200)
    })

    it('names the disabled feature in the 404 when git integration is not enabled', async function () {
        const list = await request('GET', disabledTeam.hashid)
        list.statusCode.should.equal(404)
        list.json().should.have.property('code', 'not_found')
        list.json().should.have.property('error', 'Not Found - Git integration is not enabled for this team')

        const create = await request('POST', disabledTeam.hashid, { name: 'tok', token: 'abc' })
        create.statusCode.should.equal(404)
        create.json().should.have.property('error', 'Not Found - Git integration is not enabled for this team')
    })

    it('returns the generic 404 for an unknown team', async function () {
        const response = await request('GET', 'unknown-team')
        response.statusCode.should.equal(404)
        response.json().should.have.property('error', 'Not Found')
    })
})
