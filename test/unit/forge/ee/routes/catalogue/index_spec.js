const should = require('should') // eslint-disable-line
const setup = require('../../setup')

describe('Team Catalogue', function () {
    let app
    const TestObjects = { tokens: {} }
    let httpServer
    before(async function () {
        const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'
        app = await setup({
            license,
            npmRegistry: {
                enabled: true,
                url: 'http://localhost:4873',
                admin: {
                    username: 'admin',
                    password: 'secret'
                }
            }
        })

        await login('alice', 'aaPassword')

        const userBob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        app.userBob = userBob
        await app.team.addUser(userBob, { through: { role: Roles.Owner } })
        // Run all the tests with bob - non-admin Team Owner
        await login('bob', 'bbPassword')

        httpServer = require('http').createServer((req, res) => {
            if (/^\/-\/all/.test(req.url)) {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                const retVal = {
                    '_updated': 99999
                }
                retVal[`@${app.team.hashid}/one`] =  {
                    name: `@${app.team.hashid}/one`,
                    'dist-tags': {
                        'latest': '1.0.0'
                    },
                    'time': {
                        'modified': '2025-02-18T10:13:18.950Z'
                    },
                    'license': 'Apache-2.0',
                    'versions': {
                        '1.0.0': 'latest'
                    }
                  
                }
                retVal[`@${app.team.hashid}/two`] =  {
                    name: `@${app.team.hashid}/two`,
                    'dist-tags': {
                        'latest': '1.0.0'
                    },
                    'time': {
                        'modified': '2025-02-18T10:13:18.950Z'
                    },
                    'license': 'Apache-2.0',
                    'versions': {
                        '1.0.0': 'latest'
                    }
                  
                }
                res.end(JSON.stringify(retVal))
            }
        })
        httpserver.listen(9752)
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
    it('Get Team Catalogue', async function () {

    })
})