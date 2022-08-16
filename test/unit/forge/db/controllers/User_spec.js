const should = require('should') // eslint-disable-line
const setup = require('../setup')
const jwt = require('jsonwebtoken')

describe('User controller', function () {
    // Use standard test data.
    let app
    beforeEach(async function () {
        app = await setup()
    })

    afterEach(async function () {
        await app.close()
    })

    describe('authenticateCredentials', function () {
        it('returns true for a valid username/password', async function () {
            const result = await app.db.controllers.User.authenticateCredentials('alice', 'aaPassword')
            result.should.be.true()
        })

        it('returns false for valid username/invalid password', async function () {
            const result = await app.db.controllers.User.authenticateCredentials('alice', 'invalid')
            result.should.be.false()
        })

        it('returns false for invalid username/password', async function () {
            const result = await app.db.controllers.User.authenticateCredentials('invalid', 'invalid')
            result.should.be.false()
        })

        it('returns true for a valid email/password', async function () {
            const result = await app.db.controllers.User.authenticateCredentials('alice@example.com', 'aaPassword')
            result.should.be.true()
        })

        it('returns false for valid email/invalid password', async function () {
            const result = await app.db.controllers.User.authenticateCredentials('alice@example.com', 'invalid')
            result.should.be.false()
        })

        it('returns false for invalid email/password', async function () {
            const result = await app.db.controllers.User.authenticateCredentials('alice@invalid.com', 'invalid')
            result.should.be.false()
        })
    })

    describe('changePassword', function () {
        it('changes a users password', async function () {
            const user = await app.db.models.User.byUsername('alice')
            const initialPasswordCheck = await app.db.controllers.User.authenticateCredentials('alice', 'aaPassword')
            initialPasswordCheck.should.be.true()
            await app.db.controllers.User.changePassword(user, 'aaPassword', 'aNewPassword')
            user.password.should.not.equal('aaPassword')
            user.password.should.not.equal('aNewPassword')
            const finalPasswordCheck = await app.db.controllers.User.authenticateCredentials('alice', 'aNewPassword')
            finalPasswordCheck.should.be.true()
        })
        it('fails if existing password not provided', async function () {
            const user = await app.db.models.User.byUsername('alice')
            try {
                await app.db.controllers.User.changePassword(user, 'invalidPassword', 'aNewPassword')
            } catch (err) {
                // Check the password hasn't changed
                const initialPasswordCheck = await app.db.controllers.User.authenticateCredentials('alice', 'aaPassword')
                initialPasswordCheck.should.be.true()
                return
            }
            throw new Error('Password changed with invalid oldPassword')
        })
    })

    describe('expirePassword', function () {
        it('expires a users password', async function () {
            const user = await app.db.models.User.byUsername('alice')
            user.password_expired.should.be.false()
            await app.db.controllers.User.expirePassword(user)
            user.password_expired.should.be.true()

            const otherUser = await app.db.models.User.byUsername('bob')
            otherUser.password_expired.should.be.false()
        })
        it('expires all users passwords', async function () {
            let user = await app.db.models.User.byUsername('alice')
            user.password_expired.should.be.false()
            await app.db.controllers.User.expirePassword()

            user = await app.db.models.User.byUsername('alice')
            user.password_expired.should.be.true()

            const otherUser = await app.db.models.User.byUsername('bob')
            otherUser.password_expired.should.be.true()
        })
    })

    describe('invitation token handling', function () {
        it('generates a valid verification token for a user', async function () {
            // 'chris' does not have a verified email
            const user = await app.db.models.User.byUsername('chris')
            user.email_verified.should.be.false()
            const now = Math.floor(Date.now() / 1000)
            const token = await app.db.controllers.User.generateEmailVerificationToken(user)

            const decoded = jwt.decode(token)
            const expiresInDays = Math.floor((decoded.exp - now) / (60 * 60 * 24))
            expiresInDays.should.equal(2)
            decoded.sub.should.equal('chris@example.com')
        })
        it('validates a token for pending user', async function () {
            // 'chris' does not have a verified email
            const user = await app.db.models.User.byUsername('chris')
            user.email_verified.should.be.false()
            const token = await app.db.controllers.User.generateEmailVerificationToken(user)

            await app.db.controllers.User.verifyEmailToken(null, token)

            const updatedUser = await app.db.models.User.byUsername('chris')
            updatedUser.email_verified.should.be.true()
        })
        it('validates a token for the provided user', async function () {
            // 'chris' does not have a verified email
            const user = await app.db.models.User.byUsername('chris')
            user.email_verified.should.be.false()
            const token = await app.db.controllers.User.generateEmailVerificationToken(user)

            await app.db.controllers.User.verifyEmailToken(user, token)

            const updatedUser = await app.db.models.User.byUsername('chris')
            updatedUser.email_verified.should.be.true()
        })
        it('rejects valid token if verified against different user', async function () {
            // 'chris' does not have a verified email
            const user = await app.db.models.User.byUsername('chris')
            user.email_verified.should.be.false()
            const token = await app.db.controllers.User.generateEmailVerificationToken(user)

            const otherUser = await app.db.models.User.byUsername('alice')

            try {
                await app.db.controllers.User.verifyEmailToken(otherUser, token)
            } catch (err) {
                const updatedUser = await app.db.models.User.byUsername('chris')
                updatedUser.email_verified.should.be.false()
                return
            }
            throw new Error('verifyEmailToken passed')
        })

        it('rejects invalid token', async function () {
            const token = app.db.controllers.User.generateEmailVerificationToken({
                email: 'chris@example.com',
                password: 'invalid-hash'
            })
            try {
                await app.db.controllers.User.verifyEmailToken(null, token)
            } catch (err) {
                const updatedUser = await app.db.models.User.byUsername('chris')
                updatedUser.email_verified.should.be.false()
                return
            }
            throw new Error('verifyEmailToken passed')
        })

        it('rejects expired token', async function () {
            // Token generated for 'chris@example.com' with expiring in the past
            const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjaHJpc0BleGFtcGxlLmNvbSIsImV4cCI6MTYzNjkwNzUxNywiaWF0IjoxNjM3MDgwMzE3fQ.ClTQzbResx3WB2wkhS2sc_WGDKGXdWQmlkfloup7mmc'
            try {
                await app.db.controllers.User.verifyEmailToken(null, token)
            } catch (err) {
                const updatedUser = await app.db.models.User.byUsername('chris')
                updatedUser.email_verified.should.be.false()
                return
            }
            throw new Error('verifyEmailToken passed')
        })

        it('rejects valid token if user is already verified', async function () {
            // 'bob' does have a verified email
            const user = await app.db.models.User.byUsername('bob')
            user.email_verified.should.be.true()
            const token = await app.db.controllers.User.generateEmailVerificationToken(user)

            try {
                await app.db.controllers.User.verifyEmailToken(null, token)
            } catch (err) {
                return
            }
            throw new Error('verifyEmailToken passed')
        })
    })
})
