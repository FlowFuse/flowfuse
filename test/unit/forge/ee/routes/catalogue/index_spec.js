const should = require('should') // eslint-disable-line
const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Team Catalogue', function () {
    describe('Enabled', function () {
        let app
        const TestObjects = { tokens: {} }
        let httpServer
        before(async function () {
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'
            app = await setup({
                license,
                npmRegistry: {
                    enabled: true,
                    url: 'http://localhost:9752',
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

            const userChris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
            await app.team.addUser(userChris, { through: { role: Roles.Member } })
            await login('chris', 'ccPassword')

            const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const defaultTeamTypeProperties = defaultTeamType.properties

            if (defaultTeamTypeProperties.features) {
                defaultTeamTypeProperties.features.npm = true
            } else {
                defaultTeamTypeProperties.features = {
                    npm: true
                }
            }

            app.device = await app.factory.createDevice({
                name: 'device1',
                mode: 'developer'
            }, app.team, app.instance)

            app.defaultTeamType.properties = defaultTeamTypeProperties
            await app.defaultTeamType.save()

            httpServer = require('http').createServer((req, res) => {
                if (/^\/-\/all/.test(req.url)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    const retVal = {
                        _updated: 99999
                    }
                    retVal[`@${app.team.hashid}/one`] = {
                        name: `@${app.team.hashid}/one`,
                        'dist-tags': {
                            latest: '1.0.0'
                        },
                        time: {
                            modified: '2025-02-18T10:13:18.950Z'
                        },
                        license: 'Apache-2.0',
                        versions: {
                            '1.0.0': 'latest'
                        }
                    }
                    retVal[`@${app.team.hashid}/two`] = {
                        name: `@${app.team.hashid}/two`,
                        'dist-tags': {
                            latest: '1.0.0'
                        },
                        time: {
                            modified: '2025-02-18T10:13:18.950Z'
                        },
                        license: 'Apache-2.0',
                        versions: {
                            '1.0.0': 'latest'
                        }
                    }
                    retVal['@foo/two'] = {
                        name: '@foo/two',
                        'dist-tags': {
                            latest: '1.0.0'
                        },
                        time: {
                            modified: '2025-02-18T10:13:18.950Z'
                        },
                        license: 'Apache-2.0',
                        versions: {
                            '1.0.0': 'latest'
                        }
                    }
                    res.end(JSON.stringify(retVal))
                }
            })
            httpServer.listen(9752)
        })

        after(async function () {
            httpServer.close()
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
        it('Get Team Catalogue (instance)', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/npm/catalogue?instance=${app.instance.id}`
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('name', `FlowFuse Team ${app.team.name} catalogue`)
            result.should.have.property('modules')
            result.modules.should.have.a.lengthOf(2)
            result.modules[0].should.have.property('id', `@${app.team.hashid}/one`)
        })
        it('Get Team Catalogue (device)', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/npm/catalogue?device=${app.device.hashid}`
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('name', `FlowFuse Team ${app.team.name} catalogue`)
            result.should.have.property('modules')
            result.modules.should.have.a.lengthOf(2)
            result.modules[0].should.have.property('id', `@${app.team.hashid}/one`)
        })
        it('Get Team Packages by Owner', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/npm/packages`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property(`@${app.team.hashid}/one`)
            result[`@${app.team.hashid}/one`].should.have.property('name', `@${app.team.hashid}/one`)
            result[`@${app.team.hashid}/one`].should.have.property('license', 'Apache-2.0')
        })
        it('Get Team Packages by Member', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/npm/packages`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(200)
        })
    })
    describe('Not Enabled for Team', function () {
        let app
        const TestObjects = { tokens: {} }
        before(async function () {
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'
            app = await setup({
                license,
                npmRegistry: {
                    enabled: true,
                    url: 'http://localhost:9752',
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
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/npm/catalogue?teamId=${app.team.hashid}`
            })
            response.statusCode.should.equal(404)
        })
        it('Get Team Packages by Owner', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${app.team.hashid}/npm/packages`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(404)
        })
    })
})
