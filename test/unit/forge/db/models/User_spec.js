const should = require('should') // eslint-disable-line
const setup = require('../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('User model', function () {
    // Use standard test data.
    let app
    beforeEach(async function () {
        app = await setup()
    })

    afterEach(async function () {
        await app.close()
    })

    it('User email can be null', async function () {
        await app.db.models.User.create({ username: 'nullEmail', password: '12345678' })
        await app.db.models.User.create({ username: 'nullEmail2', password: '12345678' })
    })

    it('User email, if set, must be unique', async function () {
        await app.db.models.User.create({ username: 'duplicateEmail', email: 'duplicate@email.com', password: '12345678' })
        try {
            await app.db.models.User.create({ username: 'duplicateEmail2', email: 'duplicate@email.com', password: '12345678' })
            throw new Error('Created user with duplicate email')
        } catch (err) {
            /SequelizeUniqueConstraintError/.test(err.toString()).should.be.true()
        }
    })

    it('User email, if set, must be valid email', async function () {
        try {
            await app.db.models.User.create({ username: 'badEmail', email: 'not-n-email', password: '12345678' })
            throw new Error('Created user with invalid email')
        } catch (err) {
            /SequelizeValidationError/.test(err.toString()).should.be.true()
        }
    })

    it('User password must be at least 8 chars', async function () {
        try {
            await app.db.models.User.create({ username: 'shortPassword', email: 'a@b.com', password: '123' })
            throw new Error('Created user with short password')
        } catch (err) {
            / Password too short/.test(err.toString()).should.be.true()
        }
    })

    it('User password is hashed', async function () {
        const user = await app.db.models.User.create({ username: 'hashedPassword', email: 'a@b.com', password: '12345678' })
        user.password.should.not.equal('12345678')
    })

    it('User.admins returns all admin users', async function () {
        const admins = await app.db.models.User.admins()
        admins.should.have.length(1)
        admins[0].get('email').should.eql('alice@example.com')
    })

    it('getTeamMembership', async function () {
        const user = await app.db.models.User.byEmail('bob@example.com')
        const team1 = await app.db.models.Team.findOne({ where: { name: 'ATeam' } })
        const team2 = await app.db.models.Team.findOne({ where: { name: 'BTeam' } })
        const team3 = await app.db.models.Team.findOne({ where: { name: 'CTeam' } })

        const membership1 = await user.getTeamMembership(team1.id, true)
        should.equal(membership1.role, Roles.Member)
        should.equal(membership1.TeamId, team1.id)
        should.exist(membership1.Team)
        should.equal(membership1.Team.id, team1.id)
        should.equal(membership1.Team.name, 'ATeam')

        const membership2 = await user.getTeamMembership(team2.id)
        should.equal(membership2.role, Roles.Owner)
        should.not.exist(membership2.Team)

        const membership3 = await user.getTeamMembership(team3.id)
        should.not.exist(membership3)
    })

    it('User Real Name with URL', async function () {
        let user
        try {
            user = await app.db.models.User.create({
                username: 'foo',
                password: '123456abc',
                email: 'foo@example.com',
                name: 'http://example.com'
            })
        } catch (err) {
            // console.log(err)
        }

        should.not.exist(user)
    })

    // it("random", async function() {
    //     const user = await app.db.models.User.byEmail("chris@example.com");
    //     const proj = await app.db.models.Project.findOne({where:{name:"project2"}});
    //     const membership = await user.getTeamMembership(proj.TeamId);
    //     console.log(user.name, proj.name, membership.role);
    // })

    // it("User.inTeam returns all users in a team", async function() {
    //     const team1Members = await app.db.models.User.inTeam('ATeam');
    //     team1Members.should.have.length(3);
    //
    //     console.log(team1Members[0].get('Teams'));
    //
    //     const team2Members = await app.db.models.User.inTeam('BTeam');
    //     team2Members.should.have.length(2);
    //
    //     const team3Members = await app.db.models.User.inTeam('CTeam');
    //     team3Members.should.have.length(2);
    // })
})
