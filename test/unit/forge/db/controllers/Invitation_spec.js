const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Invitation controller', function () {
    // Use standard test data.

    /*
        alice (admin)
        bob
        chris (!email_verified)

        ATeam - alice(owner), bob(member)
        BTeam - bob(owner), alice(member)
        CTeam - alice(owner)
    */

    let app
    const TestObjects = {}

    before(async function () {
        app = await setup()
        app.settings.set('team:user:invite:external', true)
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.byUsername('bob')
        TestObjects.chris = await app.db.models.User.byUsername('chris')
    })

    after(async function () {
        await app.close()
    })

    afterEach(async function () {
        await app.db.models.Invitation.destroy({ where: {} })
    })

    function checkInvite (invite, invitorId, inviteeId, teamId) {
        const values = invite.get({ plain: true })
        values.external.should.be.false()
        values.should.have.property('id')
        // Check we have the fully populated team object
        values.should.have.property('teamId', teamId)
        values.should.have.property('team')
        values.team.should.have.property('id', teamId)

        // Check we have the fully populated invitee object
        values.should.have.property('inviteeId', inviteeId)
        values.should.have.property('invitee')
        values.invitee.should.have.property('id', inviteeId)

        // Check we have the fully populated invitor object
        values.should.have.property('invitorId', invitorId)
        values.should.have.property('invitor')
        values.invitor.should.have.property('id', invitorId)
    }
    function checkExternalInvite (invite, invitorId, inviteeEmail, teamId) {
        const values = invite.get({ plain: true })
        values.external.should.be.true()
        values.should.have.property('id')
        // Check we have the fully populated team object
        values.should.have.property('teamId', teamId)
        values.should.have.property('team')
        values.team.should.have.property('id', teamId)

        values.should.have.property('invitee', null)
        values.should.have.property('email', inviteeEmail)

        // Check we have the fully populated invitor object
        values.should.have.property('invitorId', invitorId)
        values.should.have.property('invitor')
        values.invitor.should.have.property('id', invitorId)
    }

    describe('createInvitations', function () {
        it('creates invitations for known users by username and email', async function () {
            const invitor = TestObjects.alice
            const team = await app.db.models.Team.byName('CTeam')

            let bobNotifications = await app.db.models.Notification.forUser(TestObjects.bob)
            bobNotifications.should.have.property('count', 0)

            let chrisNotifications = await app.db.models.Notification.forUser(TestObjects.chris)
            chrisNotifications.should.have.property('count', 0)

            const userList = ['bob', 'chris@example.com']
            const result = await app.db.controllers.Invitation.createInvitations(invitor, team, userList)
            Object.keys(result).should.have.length(2)
            result.should.have.property('bob')
            checkInvite(result.bob, 1, 2, team.id)
            checkInvite(result['chris@example.com'], 1, 3, team.id)

            bobNotifications = await app.db.models.Notification.forUser(TestObjects.bob)
            bobNotifications.should.have.property('count', 1)
            bobNotifications.notifications[0].should.have.property('type', 'team-invite')

            chrisNotifications = await app.db.models.Notification.forUser(TestObjects.chris)
            chrisNotifications.should.have.property('count', 1)
            chrisNotifications.notifications[0].should.have.property('type', 'team-invite')
        })
        it('rejects for users already in the team', async function () {
            const invitor = await app.db.models.User.byUsername('alice')
            const team = await app.db.models.Team.byName('ATeam')
            const userList = ['bob', 'chris@example.com']
            const result = await app.db.controllers.Invitation.createInvitations(invitor, team, userList)
            Object.keys(result).should.have.length(2);
            (typeof result.bob).should.equal('string')
            result.bob.should.equal('Already a member of the team')
            checkInvite(result['chris@example.com'], 1, 3, team.id)
        })
        it('rejects for users already invited to the team', async function () {
            const invitor = TestObjects.alice
            const team = await app.db.models.Team.byName('CTeam')
            // Invite bob to the team
            let userList = ['bob']
            const result = await app.db.controllers.Invitation.createInvitations(invitor, team, userList)
            Object.keys(result).should.have.length(1)
            checkInvite(result.bob, 1, 2, team.id)
            // Reinvite bob
            userList = ['bob@example.com', 'chris']
            const result2 = await app.db.controllers.Invitation.createInvitations(invitor, team, userList)
            Object.keys(result2).should.have.length(2);
            (typeof result2['bob@example.com']).should.equal('string')
            result2['bob@example.com'].should.equal('Already invited to the team')
            checkInvite(result2.chris, 1, 3, team.id)
        })
        it("rejects for unknown users that aren't emails", async function () {
            const invitor = TestObjects.alice
            const team = await app.db.models.Team.byName('CTeam')
            const userList = ['dave']
            const result = await app.db.controllers.Invitation.createInvitations(invitor, team, userList)
            Object.keys(result).should.have.length(1);
            (typeof result.dave).should.equal('string')
            result.dave.should.match(/Not an existing user/)
        })

        it('creates invitations for external users', async function () {
            const invitor = TestObjects.alice
            const team = await app.db.models.Team.byName('CTeam')
            const userList = ['dave@example.com']
            const result = await app.db.controllers.Invitation.createInvitations(invitor, team, userList)
            Object.keys(result).should.have.length(1)
            checkExternalInvite(result['dave@example.com'], 1, 'dave@example.com', team.id)
        })

        it('rejects if team user limit will be exceeded', async function () {
            const invitor = TestObjects.alice
            const teamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            const teamTypeProperties = { ...teamType.properties }
            teamTypeProperties.users.limit = 3
            teamType.properties = teamTypeProperties
            await teamType.save()

            const team = await app.db.models.Team.byName('ATeam')
            const userList = ['dave@example.com', 'edward@example.com']
            try {
                await app.db.controllers.Invitation.createInvitations(invitor, team, userList)
                return Promise.reject(new Error('allowed team user limit to be exceeded'))
            } catch (err) {}
        })
    })
})
