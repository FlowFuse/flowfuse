const should = require('should') // eslint-disable-line
const setup = require('../setup')

async function clearUserNotifications (app, user) {
    const notifications = await app.db.models.Notification.forUser(user)
    if (notifications) {
        notifications.notifications.forEach(n => n.destroy())
    }
}

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
        TestObjects.colin = await app.db.models.User.create({ username: 'colin', name: 'Colin Solo', email: 'colin@example.com', email_verified: true, password: 'ccPassword', admin: false, sso_enabled: true })

        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('colin', 'ccPassword')
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

        it('Updates notification when options.upsert is set', async function () {
            const notificationType = 'crashed'
            const notificationRef = `${notificationType}:${TestObjects.Project1.id}`

            // get current count of notifications for bob
            const bobNotifications0 = await getNotifications(TestObjects.tokens.bob)
            const bobCurrentCount = bobNotifications0.count

            // args: (user, type, data, reference = null, options = null)
            await app.notifications.send(TestObjects.bob, notificationType, { user: 'bob', i: 1 }, notificationRef, { upsert: true })

            const bobNotifications1 = await getNotifications(TestObjects.tokens.bob)
            bobNotifications1.should.have.property('count', bobCurrentCount + 1)
            bobNotifications1.notifications[0].should.have.property('type', notificationType)
            bobNotifications1.notifications[0].should.have.property('read', false)
            const counter = bobNotifications1.notifications[0].data?.meta?.counter || 0
            counter.should.equal(0) // first occurrence is not counted

            await app.notifications.send(TestObjects.bob, notificationType, { user: 'bob', i: 2 }, notificationRef, { upsert: true })

            const bobNotifications2 = await getNotifications(TestObjects.tokens.bob)
            bobNotifications2.should.have.property('count', bobCurrentCount + 1) // should not create a new notification
            bobNotifications2.notifications[0].should.have.property('type', notificationType)
            bobNotifications2.notifications[0].should.have.property('read', false)
            const counter2 = bobNotifications2.notifications[0].data?.meta?.counter || 0
            counter2.should.equal(2) // second occurrence IS counted
            // data should have been updated
            bobNotifications2.notifications[0].data.should.have.property('user', 'bob')
            bobNotifications2.notifications[0].data.should.have.property('i', 2)
        })

        it('Updates notification when options.supersede is set', async function () {
            const notificationType = 'crashed'
            const notificationRef = `${notificationType}:${TestObjects.Project1.id}`

            // get current count of notifications for bob
            const bobNotifications0 = await getNotifications(TestObjects.tokens.bob)
            const bobCurrentCount = bobNotifications0.count

            // args: (user, type, data, reference = null, options = null)
            await app.notifications.send(TestObjects.bob, notificationType, { user: 'bob', i: 0 }, notificationRef, { supersede: true })

            const bobNotifications1 = await getNotifications(TestObjects.tokens.bob)
            bobNotifications1.should.have.property('count', bobCurrentCount + 1)
            bobNotifications1.notifications[0].should.have.property('type', notificationType)
            bobNotifications1.notifications[0].should.have.property('read', false)

            await app.notifications.send(TestObjects.bob, notificationType, { user: 'bob', i: 1 }, notificationRef, { supersede: true })

            const bobNotifications2 = await getNotifications(TestObjects.tokens.bob)

            bobNotifications2.should.have.property('count', bobCurrentCount + 2) // should create a new notification and mark the old one as read
            bobNotifications2.notifications[0].should.have.property('type', notificationType)
            bobNotifications2.notifications[0].should.have.property('read', false)
            bobNotifications2.notifications[1].should.have.property('type', notificationType)
            bobNotifications2.notifications[1].should.have.property('read', true)
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
        it('user can mark notification as read/unread in bulk', async function () {
            const notificationType = 'crashed'
            const notificationRef = `${notificationType}:${TestObjects.Project1.id}`
            await app.notifications.send(TestObjects.colin, notificationType, { user: 'colin', i: 1 }, notificationRef, { upsert: false })
            await app.notifications.send(TestObjects.colin, notificationType, { user: 'colin', i: 1 }, notificationRef, { upsert: false })

            const colinNotifications = await getNotifications(TestObjects.tokens.colin)
            colinNotifications.should.have.property('count', 2)

            const ids = colinNotifications.notifications.map(n => n.id)
            const response1 = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/notifications/',
                payload: { read: true, ids },
                cookies: { sid: TestObjects.tokens.colin }
            })
            response1.statusCode.should.equal(200)

            const colinNotifications2 = await getNotifications(TestObjects.tokens.colin)
            colinNotifications2.notifications[0].should.have.property('read', true)
            colinNotifications2.notifications[1].should.have.property('read', true)

            const response2 = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/notifications/',
                payload: { read: false, ids },
                cookies: { sid: TestObjects.tokens.colin }
            })
            response2.statusCode.should.equal(200)

            const colinNotifications3 = await getNotifications(TestObjects.tokens.colin)
            colinNotifications3.notifications[0].should.have.property('read', false)
            colinNotifications3.notifications[1].should.have.property('read', false)
        })
        it('will return a 400 response if receives an incorrect payload', async () => {
            await clearUserNotifications(app, TestObjects.colin)

            const notificationType = 'crashed'
            const notificationRef = `${notificationType}:${TestObjects.Project1.id}`
            await app.notifications.send(TestObjects.colin, notificationType, { user: 'colin', i: 1 }, notificationRef, { upsert: false })
            await app.notifications.send(TestObjects.colin, notificationType, { user: 'colin', i: 1 }, notificationRef, { upsert: false })

            const colinNotifications = await getNotifications(TestObjects.tokens.colin)
            colinNotifications.should.have.property('count', 2)
            const ids = [{}]

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/notifications/',
                payload: { read: true, ids },
                cookies: { sid: TestObjects.tokens.colin }
            })
            response.statusCode.should.equal(400)
        })
        it('can handle invalid notifications ids', async () => {
            await clearUserNotifications(app, TestObjects.colin)

            const notificationType = 'crashed'
            const notificationRef = `${notificationType}:${TestObjects.Project1.id}`
            await app.notifications.send(TestObjects.colin, notificationType, { user: 'colin', i: 1 }, notificationRef, { upsert: false })
            await app.notifications.send(TestObjects.colin, notificationType, { user: 'colin', i: 1 }, notificationRef, { upsert: false })

            const colinNotifications = await getNotifications(TestObjects.tokens.colin)
            colinNotifications.should.have.property('count', 2)
            const ids = ['non-existing', 92828292, null, undefined, false, true]

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/user/notifications/',
                payload: { read: true, ids },
                cookies: { sid: TestObjects.tokens.colin }
            })
            response.statusCode.should.equal(200)
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
