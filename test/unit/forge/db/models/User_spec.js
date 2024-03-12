const should = require('should') // eslint-disable-line
const setup = require('../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('User model', function () {
    // Use standard test data.
    let app

    describe('Model properties', function () {
        before(async function () {
            app = await setup({
                limits: {
                    users: 50
                }
            })
        })
        after(async function () {
            await app.close()
        })

        it('Username must be case-insensitive unique', async function () {
            try {
                await app.db.models.User.create({
                    username: 'ALiCE',
                    name: 'Alice Skywalker',
                    email: 'alice2@example.com',
                    email_verified: true,
                    password: 'aaPassword'
                })
            } catch (err) {
                /user_username_lower_unique/.test(err.parent.toString()).should.be.true()
                return
            }
            return Promise.reject(new Error('Able to create duplicate case-insensitive username'))
        })

        it('User email can be null', async function () {
            await app.db.models.User.create({ username: 'nullEmail', password: '12345678' })
            await app.db.models.User.create({ username: 'nullEmail2', password: '12345678' })
        })

        it('User email, if set, must be unique', async function () {
            await app.db.models.User.create({ username: 'duplicateEmail', email: 'duplicate@email.com', password: '12345678' })
            try {
                await app.db.models.User.create({ username: 'duplicateEmail2', email: 'duplicate@email.com', password: '12345678' })
                return Promise.reject(new Error('Created user with duplicate email'))
            } catch (err) {
                /SequelizeUniqueConstraintError/.test(err.toString()).should.be.true()
            }
            try {
                await app.db.models.User.create({ username: 'duplicateEmail2', email: 'DUPlicaTE@email.com', password: '12345678' })
                return Promise.reject(new Error('Created user with duplicate case-insensitive email'))
            } catch (err) {
                /user_email_lower_unique/.test(err.parent.toString()).should.be.true()
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
                // console.error(err)
            }

            should.not.exist(user)
        })

        describe('#getTeamMembership', function () {
            it('should return the team membership object for the passed team', async function () {
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
        })

        describe('#getTeamsOwned', function () {
            it('should return all teams this user is the owner of', async function () {
                const user = await app.db.models.User.byEmail('bob@example.com')
                const ownedTeam = await app.db.models.Team.findOne({ where: { name: 'BTeam' } })

                const teams = await user.getTeamsOwned()
                teams.length.should.equal(1)

                should.exist(teams[0].Team)
                should.equal(teams[0].Team.id, ownedTeam.id)
            })
        })

        describe('#teamCount', function () {
            it('should return the number of teams the user is a member of', async function () {
                const userAlice = await app.db.models.User.byEmail('alice@example.com')
                should.equal(await userAlice.teamCount(), 3)

                const userBob = await app.db.models.User.byEmail('bob@example.com')
                should.equal(await userBob.teamCount(), 2)

                const userChris = await app.db.models.User.byEmail('chris@example.com')
                should.equal(await userChris.teamCount(), 0)
            })
        })
    })

    describe('Class Finders', function () {
        before(async function () {
            app = await setup()
        })
        after(async function () {
            await app.close()
        })

        it('User.admins returns all admin users', async function () {
            const admins = await app.db.models.User.admins()
            admins.should.have.length(1)
            admins[0].get('email').should.eql('alice@example.com')
        })

        it('User.byUsername should be case insensitive', async function () {
            const user = await app.db.models.User.byUsername('ALiCE')
            should.exist(user)
            user.should.have.property('username', 'alice')
        })

        it('User.byEmail should be case insensitive', async function () {
            const user = await app.db.models.User.byEmail('ALiCE@exAmpLe.cOm')
            should.exist(user)
            user.should.have.property('username', 'alice')
        })

        it('User.byUsernameOrEmail should be case insensitive', async function () {
            let user = await app.db.models.User.byUsernameOrEmail('ALiCE@exAmpLe.cOm')
            should.exist(user)
            user.should.have.property('username', 'alice')

            user = await app.db.models.User.byUsernameOrEmail('aLiCe')
            should.exist(user)
            user.should.have.property('username', 'alice')
        })
        it('Should not remove last admin', async function () {
            const alice = await app.db.models.User.byEmail('alice@example.com')
            alice.admin = false
            try {
                await alice.save()
                throw new Error('expected changing last admin to a non-admin to throw an error')
            } catch (error) {
                /last admin/i.test(error.toString()).should.be.true('expected error to include "last admin"')
            }
        })

        it('Should not delete admin user', async function () {
            const alice = await app.db.models.User.byEmail('alice@example.com')
            try {
                await alice.destroy()
                throw new Error('expected deletion of an admin user to throw an error')
            } catch (error) {
                should(error.toString()).containEql('Cannot delete the last platform administrator')
            }
        })
    })

    describe('License limits', function () {
        afterEach(async function () {
            await app.close()
        })

        it('Permits overage when licensed', async function () {
            // This license has limit of 5 users (3 created by default test setup)
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTA4ODAwLCJleHAiOjc5ODY5ODg3OTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjo1LCJ0ZWFtcyI6NTAsInByb2plY3RzIjo1MCwiZGV2aWNlcyI6NTAsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNTQ4NjAyfQ.vvSw6pm-NP5e0NUL7yMOG-w0AgB8H3NRGGN7b5Dw_iW5DiIBbVQ4HVLEi3dyy9fk7WgKnloiCCkIFJvN79fK_g'
            app = await setup({ license })
            // Default setup creates 3 users
            ;(await app.db.models.User.count()).should.equal(3)

            await app.db.models.User.create({ username: 'u4', password: '12345678' })
            ;(await app.db.models.User.count()).should.equal(4)

            await app.db.models.User.create({ username: 'u5', password: '12345678' })
            ;(await app.db.models.User.count()).should.equal(5)

            await app.db.models.User.create({ username: 'u6', password: '12345678' })
            ;(await app.db.models.User.count()).should.equal(6)
        })
        it('Does not permit overage when unlicensed', async function () {
            app = await setup({ })
            app.license.defaults.users = 5 // override default

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
