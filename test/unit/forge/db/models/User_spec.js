const should = require('should') // eslint-disable-line
const setup = require('../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('User model', function () {
    // Use standard test data.
    let app

    afterEach(async function () {
        if (app) {
            await app.close()
            app = null
        }
    })

    describe('Model properties', function () {
        beforeEach(async function () {
            app = await setup()
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

        it('Should not create a User where Real Name is a URL', async function () {
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
    })

    describe('License limits', function () {
        it('limits how many users can be created according to license', async function () {
            // This license has limit of 5 users (3 created by default test setup)
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTA4ODAwLCJleHAiOjc5ODY5ODg3OTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjo1LCJ0ZWFtcyI6NTAsInByb2plY3RzIjo1MCwiZGV2aWNlcyI6NTAsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNTQ4NjAyfQ.vvSw6pm-NP5e0NUL7yMOG-w0AgB8H3NRGGN7b5Dw_iW5DiIBbVQ4HVLEi3dyy9fk7WgKnloiCCkIFJvN79fK_g'
            app = await setup({ license })
            // Default setup creates 3 users
            ;(await app.db.models.User.count()).should.equal(3)

            await app.db.models.User.create({ username: 'u4', password: '12345678' })
            ;(await app.db.models.User.count()).should.equal(4)

            await app.db.models.User.create({ username: 'u5', password: '12345678' })
            ;(await app.db.models.User.count()).should.equal(5)
            try {
                await app.db.models.User.create({ username: 'u6', password: '12345678' })
                return Promise.reject(new Error('able to create user that exceeds limit'))
            } catch (err) { }

            await app.db.models.User.destroy({ where: { username: 'u4' } })
            ;(await app.db.models.User.count()).should.equal(4)

            await app.db.models.User.create({ username: 'u6', password: '12345678' })
            ;(await app.db.models.User.count()).should.equal(5)
        })
    })
})
