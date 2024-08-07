const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('User Notifications API', async function () {
    let app
    const TestObjects = {}

    async function setupApp () {
        app = await setup()
        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        TestObjects.Project1 = app.project
        TestObjects.tokens = {}

        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword', admin: true, sso_enabled: true })

        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
    }

    before(async function () {
        return setupApp()
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

    async function getNotifications (token) {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/user/notifications',
            cookies: { sid: token }
        })
        response.statusCode.should.equal(200)
        const result = response.json()
        result.should.have.property('count')
        result.should.have.property('notifications')
        result.notifications.should.have.length(result.count)
        return result
    }

    describe('User notifications', async function () {
        it('lists the logged in users notifications', async function () {
            // Starts empty - alice
            const result = await getNotifications(TestObjects.tokens.alice)
            result.should.have.property('count', 0)

            // Starts empty - bob
            const result2 = await getNotifications(TestObjects.tokens.bob)
            result2.should.have.property('count', 0)

            await app.notifications.send(TestObjects.alice, 'alice-1', { user: 'alice', i: 0 })
            await app.notifications.send(TestObjects.alice, 'alice-2', { user: 'alice', i: 1 })
            await app.notifications.send(TestObjects.bob, 'bob-1', { user: 'bob', i: 2 })
            await app.notifications.send(TestObjects.bob, 'bob-2', { user: 'bob', i: 3 })

            const aliceNotifications = await getNotifications(TestObjects.tokens.alice)
            aliceNotifications.should.have.property('count', 2)

            // Verify:
            //  - most recent first
            //  - only expected properties
            //  - id is a hashid
            aliceNotifications.notifications[0].should.only.have.keys('id', 'type', 'data', 'createdAt', 'read')
            ;(typeof aliceNotifications.notifications[0].id).should.equal('string')

            aliceNotifications.notifications[0].should.have.property('type', 'alice-2')
            aliceNotifications.notifications[0].should.have.property('read', false)
            aliceNotifications.notifications[1].should.have.property('type', 'alice-1')
            aliceNotifications.notifications[1].should.have.property('read', false)

            const bobNotifications = await getNotifications(TestObjects.tokens.bob)
            bobNotifications.should.have.property('count', 2)
            // Return most recent first
            bobNotifications.notifications[0].should.have.property('type', 'bob-2')
            bobNotifications.notifications[0].should.have.property('read', false)
            bobNotifications.notifications[1].should.have.property('type', 'bob-1')
            bobNotifications.notifications[0].should.have.property('read', false)
        })

        it('user can mark notification as read', async function () {
            const aliceNotifications = await getNotifications(TestObjects.tokens.alice)
            aliceNotifications.should.have.property('count', 2)
            aliceNotifications.notifications[0].should.have.property('read', false)
            aliceNotifications.notifications[1].should.have.property('read', false)
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/user/notifications/${aliceNotifications.notifications[0].id}`,
                payload: { read: true },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)

            const aliceNotifications2 = await getNotifications(TestObjects.tokens.alice)
            aliceNotifications2.notifications[0].should.have.property('read', true)
            aliceNotifications2.notifications[1].should.have.property('read', false)

            await app.inject({
                method: 'PUT',
                url: `/api/v1/user/notifications/${aliceNotifications.notifications[0].id}`,
                payload: { read: false },
                cookies: { sid: TestObjects.tokens.alice }
            })
            const aliceNotifications3 = await getNotifications(TestObjects.tokens.alice)
            aliceNotifications3.notifications[0].should.have.property('read', false)
            aliceNotifications3.notifications[1].should.have.property('read', false)
        })
        it('user cannot modify another users notification', async function () {
            const aliceNotifications = await getNotifications(TestObjects.tokens.alice)
            // Try to update alice's notifications using bob
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/user/notifications/${aliceNotifications.notifications[0].id}`,
                payload: { read: true },
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(404)
        })

        it('user can delete notification', async function () {
            const aliceNotifications = await getNotifications(TestObjects.tokens.alice)
            aliceNotifications.should.have.property('count', 2)
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/user/notifications/${aliceNotifications.notifications[0].id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)

            const aliceNotifications2 = await getNotifications(TestObjects.tokens.alice)
            aliceNotifications2.should.have.property('count', 1)
            aliceNotifications2.notifications[0].should.have.property('id', aliceNotifications.notifications[1].id)
        })
        it('user cannot delete another users notification', async function () {
            const aliceNotifications = await getNotifications(TestObjects.tokens.alice)
            // Try to update alice's notifications using bob
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/user/notifications/${aliceNotifications.notifications[0].id}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(404)
        })
    })
})
