const should = require('should') // eslint-disable-line
const setup = require('../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Team controller', function () {
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
    beforeEach(async function () {
        app = await setup()
    })

    afterEach(async function () {
        await app.close()
    })

    describe('add team member', function () {
        it('adds a member to a team', async function () {
            const team = await app.db.models.Team.byName('CTeam')
            const user = await app.db.models.User.byUsername('bob')

            await app.db.controllers.Team.addUser(team, user, Roles.Member)

            const role = await user.getTeamMembership(team.id)
            role.role.should.equal(Roles.Member)
        })

        it('prevents user being added twice to a team', async function () {
            const team = await app.db.models.Team.byName('ATeam')
            const user = await app.db.models.User.byUsername('bob')
            try {
                await app.db.controllers.Team.addUser(team, user, Roles.Member)
                return Promise.reject(new Error('allowed duplicate team member'))
            } catch (err) {
            }
        })

        it('prevents the team userLimit from being exceeded', async function () {
            // Use the migration to set userLimit to 3
            const updateTeam = FF_UTIL.require('forge/db/migrations/20220905-01-update-default-team-type-limits')
            await updateTeam.up(app.db.sequelize.getQueryInterface())

            const userDave = await app.db.models.User.create({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', email_verified: true, password: 'ddPassword' })
            const userChris = await app.db.models.User.byUsername('chris')
            const team = await app.db.models.Team.byName('ATeam')

            await app.db.controllers.Team.addUser(team, userChris, Roles.Member)

            try {
                await app.db.controllers.Team.addUser(team, userDave, Roles.Member)
                return Promise.reject(new Error('allowed team user limit to be exceeded'))
            } catch (err) {
            }
        })
    })

    describe('change member role', function () {
        it('changes a users role from member to owner', async function () {
            const team = await app.db.models.Team.byName('ATeam')
            const user = await app.db.models.User.byUsername('bob')
            const startingRole = await user.getTeamMembership(team.id)
            startingRole.role.should.equal(Roles.Member)
            await app.db.controllers.Team.changeUserRole(team.hashid, user.hashid, Roles.Owner)
            const endingRole = await user.getTeamMembership(team.id)
            endingRole.role.should.equal(Roles.Owner)
        })
        it('changes a users role from owner to member', async function () {
            // only if there are >1 owner
            const team = await app.db.models.Team.byName('BTeam')
            const user = await app.db.models.User.byUsername('bob')
            const startingRole = await user.getTeamMembership(team.id)
            startingRole.role.should.equal(Roles.Owner)
            await app.db.controllers.Team.changeUserRole(team.hashid, user.hashid, Roles.Member)
            const endingRole = await user.getTeamMembership(team.id)
            endingRole.role.should.equal(Roles.Member)
        })

        it('does not allow a team to be left without an owner', async function () {
            const team = await app.db.models.Team.byName('ATeam')
            const user = await app.db.models.User.byUsername('alice')
            const startingRole = await user.getTeamMembership(team.id)
            startingRole.role.should.equal(Roles.Owner)
            try {
                await app.db.controllers.Team.changeUserRole(team.hashid, user.hashid, Roles.Member)
            } catch (err) {
                // TODO: check the error code
                return
            }
            throw new Error('Allowed last owner to be removed')
        })
    })

    describe('remove from team', function () {
        // removeUser(team, userOrHashId, userRole)

        it('removes a user from a team', async function () {
            const team = await app.db.models.Team.byName('ATeam')
            const user = await app.db.models.User.byUsername('bob')
            const startingRole = await user.getTeamMembership(team.id)
            startingRole.role.should.equal(Roles.Member)

            await app.db.controllers.Team.removeUser(team, user, startingRole)

            const endingRole = await user.getTeamMembership(team.id)
            should.not.exist(endingRole)
        })
        it('removes an owner from a team', async function () {
            const team = await app.db.models.Team.byName('BTeam')
            const user = await app.db.models.User.byUsername('bob')
            const startingRole = await user.getTeamMembership(team.id)
            startingRole.role.should.equal(Roles.Owner)

            await app.db.controllers.Team.removeUser(team, user, startingRole)

            const endingRole = await user.getTeamMembership(team.id)
            should.not.exist(endingRole)
        })

        it('removes a user from a team - passing in user/role', async function () {
            // This is an optimisation in the code that saves looking up the
            // session user/role twice.
            const team = await app.db.models.Team.byName('ATeam')
            const user = await app.db.models.User.byUsername('bob')
            const startingRole = await user.getTeamMembership(team.id)
            startingRole.role.should.equal(Roles.Member)
            await app.db.controllers.Team.removeUser(team, user, startingRole)
            const endingRole = await user.getTeamMembership(team.id)
            should.not.exist(endingRole)
        })

        it('does not allow a team to be left without an owner', async function () {
            const team = await app.db.models.Team.byName('ATeam')
            const user = await app.db.models.User.byUsername('alice')
            try {
                await app.db.controllers.Team.removeUser(team, user.hashid)
            } catch (err) {
                // TODO: check the error code
                return
            }
            throw new Error('Allowed last owner to be removed')
        })
        it('does not allow a team to be left without an owner - passing in user/role', async function () {
            const team = await app.db.models.Team.byName('ATeam')
            const user = await app.db.models.User.byUsername('alice')
            const startingRole = await user.getTeamMembership(team.id)
            try {
                await app.db.controllers.Team.removeUser(team, user, startingRole)
            } catch (err) {
                // TODO: check the error code
                return
            }
            throw new Error('Allowed last owner to be removed')
        })
    })
})
