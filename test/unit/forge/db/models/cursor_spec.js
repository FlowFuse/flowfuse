const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Pagination cursor', function () {
    let app, M, alice, team

    before(async function () {
        app = await setup()
        M = app.db.models
        alice = await M.User.byUsername('alice')
        team = await M.Team.byName('ATeam')
    })
    after(async function () {
        await app.close()
    })

    it('decodeCursor returns the id of a valid hashid', function () {
        M.User.decodeCursor(alice.hashid).should.equal(alice.id)
    })

    const finders = {
        'Notification.forUser': (cursor) => M.Notification.forUser(alice, { cursor }),
        'User.getAll': (cursor) => M.User.getAll({ cursor }),
        'ProjectType.getAll': (cursor) => M.ProjectType.getAll({ cursor }),
        'ProjectTemplate.getAll': (cursor) => M.ProjectTemplate.getAll({ cursor }),
        'DeviceGroup.getAll': (cursor) => M.DeviceGroup.getAll({ cursor }),
        'BrokerCredentials.byTeam': (cursor) => M.BrokerCredentials.byTeam(team.id, { cursor })
    }
    for (const [name, find] of Object.entries(finders)) {
        it(`${name} rejects an invalid cursor`, async function () {
            await find('abc').should.be.rejectedWith({ statusCode: 400, code: 'invalid_cursor' })
        })
    }

    it('User.getAll pages with a valid cursor', async function () {
        const all = await M.User.getAll({})
        const [first, ...rest] = all.users
        const page = await M.User.getAll({ cursor: first.hashid })
        page.users.map(u => u.id).should.eql(rest.map(u => u.id))
    })

    it('GET /api/v1/users returns 400 for an invalid cursor', async function () {
        const login = await app.inject({ method: 'POST', url: '/account/login', payload: { username: 'alice', password: 'aaPassword', remember: false } })
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/users?cursor=abc',
            cookies: { sid: login.cookies[0].value }
        })
        response.statusCode.should.equal(400)
        response.json().should.have.property('code', 'invalid_cursor')
    })
})
