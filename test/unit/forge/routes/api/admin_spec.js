const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Admin API', async function () {
    let app
    const TestObjects = {}

    async function setupApp (license) {
        const setupConfig = { features: { devices: true } }
        if (license) {
            setupConfig.license = license
        }
        app = await setup(setupConfig)

        // Non-admin user
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', password: 'ccPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        TestObjects.Project1 = app.project
        TestObjects.tokens = {}
    }

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

    describe('stats', async function () {
        before(async function () {
            return setupApp()
        })
        after(async function () {
            await app.close()
        })
        it('anonymous cannot access stats', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/admin/stats'
            })
            response.statusCode.should.equal(401)
        })
        it('non-admin cannot access stats', async function () {
            await login('chris', 'ccPassword')
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/admin/stats',
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(401)
        })
        it('admin can access stats - json format', async function () {
            await login('alice', 'aaPassword')
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/admin/stats',
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            // Not going to exhaustively check the stats.. just verify there's
            // at least one thing we expect to be there
            result.should.have.property('teamCount', 2)
        })

        it('admin can access stats - opemmetrics format', async function () {
            await login('alice', 'aaPassword')
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/admin/stats',
                headers: {
                    accept: 'application/openmetrics-text'
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.body
            // Not going to exhaustively check the stats.. just verify there's
            // at least one thing we expect to be there
            result.should.match(/flowforge_team_count 2\n/)

            // Check we have a newline at the end
            result.should.match(/\n$/)
        })

        describe('access token management', () => {
            async function getStatsAccessTokens () {
                return app.db.models.AccessToken.findAll({ where: { scope: 'platform:stats' } })
            }
            async function checkStatsAccess (token) {
                return await app.inject({
                    method: 'GET',
                    url: '/api/v1/admin/stats',
                    headers: {
                        authorization: `Bearer ${token}`
                    }
                })
            }
            it('generates a new stats token, replacing any existing one', async function () {
                await login('alice', 'aaPassword')
                // Validate the starting point
                ;(await getStatsAccessTokens()).should.have.length(0)
                app.settings.get('platform:stats:token').should.be.false()

                // 1. Create an initial token
                let response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/admin/stats-token',
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const initialToken = response.json()
                initialToken.should.have.property('token')
                app.settings.get('platform:stats:token').should.be.true()

                // Check the token works
                ;(await checkStatsAccess(initialToken.token)).statusCode.should.equal(200)

                const generatedTokens = await getStatsAccessTokens()
                generatedTokens.should.have.length(1)

                // Create a new token - check it replaces the initial token
                response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/admin/stats-token',
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const newToken = response.json()
                newToken.should.have.property('token')
                app.settings.get('platform:stats:token').should.be.true()
                initialToken.token.should.not.equal(newToken.token)

                // Check initial token no longer works
                ;(await checkStatsAccess(initialToken.token)).statusCode.should.equal(401)

                // Check new token works
                ;(await checkStatsAccess(newToken.token)).statusCode.should.equal(200)

                const newGeneratedTokens = await getStatsAccessTokens()
                newGeneratedTokens.should.have.length(1)

                generatedTokens[0].token.should.not.equal(newGeneratedTokens[0].token)

                // Delete the token
                response = await app.inject({
                    method: 'DELETE',
                    url: '/api/v1/admin/stats-token',
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                // Check its all cleared
                ;(await getStatsAccessTokens()).should.have.length(0)
                app.settings.get('platform:stats:token').should.be.false()

                // Check new token no longer works
                ;(await checkStatsAccess(newToken.token)).statusCode.should.equal(401)
            })
        })
    })

    describe.only('notifications', function () {
        after(async function () {
            await app.close()
        })
        afterEach(async function () {
            // Tidy up so we have a clean table to verify against
            await app.db.models.Notification.destroy({ where: { } })
        })
        before(async function () {
            await setupApp('eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg')
            await login('alice', 'aaPassword')
            // Create more users of different roles

            const createUser = async (name, admin = false) => await app.db.models.User.create({ username: name, name, admin, email: name + '@example.com', password: name + ';oaihegk.jeigaegioh' })

            TestObjects.notificationUser1 = await createUser('nu1')
            TestObjects.notificationUser2 = await createUser('nu2')
            TestObjects.notificationUser3 = await createUser('nu3')
            TestObjects.notificationUser4 = await createUser('nu4')
            // nu5 is an admin not added to a team
            TestObjects.notificationUser5 = await createUser('nu5', true)

            TestObjects.ATeam = await app.db.models.Team.byName('ATeam')

            TestObjects.secondTeamType = await app.db.models.TeamType.create({
                name: 'second team type',
                active: false,
                order: 1,
                description: '',
                properties: {}
            })
            TestObjects.CTeam = await app.db.models.Team.create({ name: 'CTeam', TeamTypeId: TestObjects.secondTeamType.id, suspended: false })
            // DTeam is suspended - does not qualify for notifications
            TestObjects.DTeam = await app.db.models.Team.create({ name: 'DTeAbCam', TeamTypeId: TestObjects.secondTeamType.id, suspended: true })

            await TestObjects.BTeam.addUser(TestObjects.notificationUser1, { through: { role: app.factory.Roles.Roles.Owner } })
            await TestObjects.BTeam.addUser(TestObjects.notificationUser2, { through: { role: app.factory.Roles.Roles.Member } })
            await TestObjects.BTeam.addUser(TestObjects.notificationUser3, { through: { role: app.factory.Roles.Roles.Viewer } })
            await TestObjects.CTeam.addUser(TestObjects.notificationUser3, { through: { role: app.factory.Roles.Roles.Viewer } })
            await TestObjects.CTeam.addUser(TestObjects.notificationUser4, { through: { role: app.factory.Roles.Roles.Dashboard } })

            await TestObjects.DTeam.addUser(TestObjects.notificationUser1, { through: { role: app.factory.Roles.Roles.Viewer } })
            await TestObjects.DTeam.addUser(TestObjects.notificationUser2, { through: { role: app.factory.Roles.Roles.Dashboard } })
        })

        async function sendNotification (payload) {
            return app.inject({
                method: 'POST',
                url: '/api/v1/admin/announcements',
                cookies: { sid: TestObjects.tokens.alice },
                payload
            })
        }
        it('send to admins only', async function () {
            const payload = {
                message: 'admin only message',
                title: 'admin only title',
                filter: { roles: [app.factory.Roles.Roles.Admin] },
                mock: true
            }
            let response = await sendNotification(payload)
            response.should.have.property('statusCode', 200)
            let result = response.json()
            result.should.have.property('mock', true)
            result.should.have.property('recipientCount', 2)

            // Resend without mock
            delete payload.mock
            response = await sendNotification(payload)
            response.should.have.property('statusCode', 200)
            result = response.json()
            result.should.not.have.property('mock')
            result.should.have.property('recipientCount', 2)

            const count = await app.db.models.Notification.count()
            count.should.equal(2)
        })

        it('send to member/viewer - any team type', async function () {
            const payload = {
                message: 'member/viewer only message',
                title: 'member/viewer only title',
                filter: { roles: [app.factory.Roles.Roles.Member, app.factory.Roles.Roles.Viewer] },
                mock: true
            }
            let response = await sendNotification(payload)
            response.should.have.property('statusCode', 200)
            let result = response.json()
            result.should.have.property('mock', true)
            result.should.have.property('recipientCount', 2)

            // Resend without mock
            delete payload.mock
            response = await sendNotification(payload)
            response.should.have.property('statusCode', 200)
            result = response.json()
            result.should.not.have.property('mock')
            result.should.have.property('recipientCount', 2)

            const notifications = await app.db.models.Notification.findAll()
            const count = notifications.length
            count.should.equal(2)

            ;(notifications[0].UserId === TestObjects.notificationUser2.id).should.be.true()
            ;(notifications[1].UserId === TestObjects.notificationUser3.id).should.be.true()
        })
        it('send to member/viewer - single team', async function () {
            const payload = {
                message: 'member/viewer only message',
                title: 'member/viewer only title',
                filter: {
                    roles: [app.factory.Roles.Roles.Member, app.factory.Roles.Roles.Viewer],
                    teamTypes: [TestObjects.secondTeamType.hashid]
                },
                mock: true
            }
            let response = await sendNotification(payload)
            response.should.have.property('statusCode', 200)
            let result = response.json()
            result.should.have.property('mock', true)
            result.should.have.property('recipientCount', 1)

            // Resend without mock
            delete payload.mock
            response = await sendNotification(payload)
            response.should.have.property('statusCode', 200)
            result = response.json()
            result.should.not.have.property('mock')
            result.should.have.property('recipientCount', 1)

            const notifications = await app.db.models.Notification.findAll()
            const count = notifications.length
            count.should.equal(1)

            ;(notifications[0].UserId === TestObjects.notificationUser3.id).should.be.true()
        })

        it('does not send duplicate notifications if filter matches multiple times', async function () {
            const payload = {
                message: 'admin/owner only message',
                title: 'admin/owner only title',
                filter: { roles: [app.factory.Roles.Roles.Admin, app.factory.Roles.Roles.Owner] },
                mock: true
            }
            let response = await sendNotification(payload)
            response.should.have.property('statusCode', 200)
            let result = response.json()
            result.should.have.property('mock', true)
            result.should.have.property('recipientCount', 3)

            // Resend without mock
            delete payload.mock
            response = await sendNotification(payload)
            response.should.have.property('statusCode', 200)
            result = response.json()
            result.should.not.have.property('mock')
            result.should.have.property('recipientCount', 3)

            const notifications = await app.db.models.Notification.findAll()
            const count = notifications.length
            count.should.equal(3)
            ;(notifications[0].UserId === app.adminUser.id).should.be.true()
            ;(notifications[1].UserId === TestObjects.notificationUser1.id).should.be.true()
            ;(notifications[2].UserId === TestObjects.notificationUser5.id).should.be.true()
        })
    })
})
