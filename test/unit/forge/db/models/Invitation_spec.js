const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Invitation model', function () {
    let app
    let alice
    let team

    before(async function () {
        app = await setup()
        alice = await app.db.models.User.byUsername('alice')
        team = await app.db.models.Team.byName('ATeam')
    })

    after(async function () {
        await app.close()
    })

    afterEach(async function () {
        await app.db.models.Invitation.destroy({ where: {} })
    })

    describe('forExternalEmail', function () {
        async function createExternalInvite (email, expiresAt) {
            const invite = await app.db.models.Invitation.create({ external: true, email, invitorId: alice.id, teamId: team.id })
            if (expiresAt !== undefined) {
                await app.db.models.Invitation.update({ expiresAt }, { where: { id: invite.id } })
            }
            return invite
        }

        it('returns current invitations for the email', async function () {
            await createExternalInvite('dave@example.com')
            const invites = await app.db.models.Invitation.forExternalEmail('DAVE@example.com')
            invites.should.have.length(1)
        })

        it('returns invitations with no expiry', async function () {
            await createExternalInvite('dave@example.com', null)
            const invites = await app.db.models.Invitation.forExternalEmail('dave@example.com')
            invites.should.have.length(1)
        })

        it('ignores expired invitations', async function () {
            await createExternalInvite('dave@example.com', Date.now() - 1000)
            const invites = await app.db.models.Invitation.forExternalEmail('dave@example.com')
            invites.should.have.length(0)
        })
    })
})
