const should = require('should') // eslint-disable-line
const setup = require('../setup')
const jwt = require('jsonwebtoken')
// create jsdoc typedef for userController
/**
 * @typedef {import('../../../../../forge/db/controllers/User')} userController
 * @typedef {import('flowforge-test-utils/forge/postoffice/localTransport.js')} localTransport
 */
describe('User controller', function () {
    // Use standard test data.
    let app
    /** @type {userController} */
    let userController = null
    /** @type {localTransport} */
    let inbox = null
    beforeEach(async function () {
        app = await setup()
        userController = app.db.controllers.User
        inbox = app.config.email.transport
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

    describe('change email address', function () {
        it('generates a token for Email Address change', async function () {
            const newEmailAddress = 'alice2@example.com'
            const alice = await app.db.models.User.byUsername('alice')
            const token = await userController.generatePendingEmailChangeToken(alice, newEmailAddress)
            const decodedToken = jwt.decode(token)
            // decodedToken should have the following properties: sub, id, aud, change
            decodedToken.should.have.property('sub', alice.email)
            decodedToken.should.have.property('id', alice.hashid)
            decodedToken.should.have.property('aud', 'update-user-email')
            decodedToken.should.have.property('change', newEmailAddress)
        })
        it('sends and Email Address change Email', async function () {
            const newEmailAddress = 'alice3@example.com'
            const alice = await app.db.models.User.byUsername('alice')
            await userController.sendPendingEmailChangeEmail(alice, newEmailAddress)
            inbox.messages.should.have.length(1)
            const email = inbox.messages[0]
            email.should.have.property('to', alice.email)
            email.text.should.containEql(alice.email)
            email.text.should.containEql(newEmailAddress)
            // email.text.includes(newEmailAddress).should.be.true('Email should contain new email address')
            // email.text should contain a link and token
            should(email.text).match(/account\/email_change\/[a-zA-Z0-9-_.]+/, 'Email should contain a link and token')
        })
        it('changes a users Email Address', async function () {
            const newEmailAddress = 'alice4@example.com'
            const alice = await app.db.models.User.byUsername('alice')
            const token = await userController.generatePendingEmailChangeToken(alice, newEmailAddress)
            await userController.applyPendingEmailChange(alice, token)
            await alice.reload()
            alice.email.should.equal(newEmailAddress)
        })
        it('fails if Email Address already in use', async function () {
            const newEmailAddress = (await app.db.models.User.byUsername('bob')).email
            const alice = await app.db.models.User.byUsername('alice')
            const originalEmail = alice.email
            const token = await userController.generatePendingEmailChangeToken(alice, newEmailAddress)
            try {
                await userController.applyPendingEmailChange(alice, token)
            } catch (error) {
                error.message.should.equal('Invalid link')
            }
            await alice.reload()
            alice.email.should.eql(originalEmail) // should be unchanged
        })
        it('fails if Users Email Address has changed since token was issued', async function () {
            const alice = await app.db.models.User.byUsername('alice')
            const token = await userController.generatePendingEmailChangeToken(alice, 'alice3@example.com')
            alice.email = 'alice2@example.com'
            alice.email_verified = true
            await alice.save()
            try {
                await userController.applyPendingEmailChange(alice, token)
            } catch (error) {
                error.message.should.equal('Invalid link')
            }
            await alice.reload()
            alice.email.should.eql('alice2@example.com') // unchanged since before token was issued
        })
        it('fails if Users ID differs from the hashid embedded in the token', async function () {
            const alice = await app.db.models.User.byUsername('alice')
            const aliceEmail = alice.email
            const bob = await app.db.models.User.byUsername('bob')
            const bobEmail = bob.email

            // generate pending email change token for alice (using alice's original email address)
            const token = await userController.generatePendingEmailChangeToken(alice, 'alice3@example.com')

            // swap alice and bob's email addresses
            alice.email = 'temp@example.com'
            alice.email_verified = true
            await alice.save()

            bob.email = aliceEmail
            bob.email_verified = true
            await bob.save()

            alice.email = bobEmail
            alice.email_verified = true
            await alice.save()

            // attempt to apply changes to alice (now with bob's original email) using the token
            // should fail as alice now has a different email to what the token was generated with
            try {
                await userController.applyPendingEmailChange(alice, token)
            } catch (error) {
                error.message.should.equal('Invalid link')
            }
            await alice.reload()
            alice.email.should.eql(bobEmail) // should not have changed to new email 'alice3@example.com'

            // attempt to apply changes to bob (now with alice's original email) using the token
            // should fail as bob has a different hashid to what the token was generated with
            try {
                await userController.applyPendingEmailChange(bob, token)
            } catch (error) {
                error.message.should.equal('Invalid link')
            }
            await bob.reload()
            bob.email.should.eql(aliceEmail) // should not have changed to new email 'alice3@example.com'
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
