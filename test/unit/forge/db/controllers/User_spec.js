const jwt = require('jsonwebtoken')
const should = require('should') // eslint-disable-line
const setup = require('../setup')
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
    before(async function () {
        app = await setup()
        userController = app.db.controllers.User
        inbox = app.config.email.transport
    })
    after(async function () {
        await app.close()
    })
    afterEach(async function () {
        // Reset user details
        // - need to move bob's email sideways so alice can reclaim hers
        // - then restore bob's
        const bob = await app.db.models.User.byUsername('bob')
        bob.email = 'bob-temp@example.com'
        bob.password_expired = false
        await bob.save()

        const alice = await app.db.models.User.byUsername('alice')
        alice.password = 'aaPassword'
        alice.email = 'alice@example.com'
        alice.password_expired = false
        await alice.save()

        bob.email = 'bob@example.com'
        await bob.save()

        const chris = await app.db.models.User.byUsername('chris')
        chris.password_expired = false
        chris.email_verified = false
        await chris.save()
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
            await app.db.controllers.User.changePassword(user, 'aaPassword', 'StapleBatteryHorse')
            user.password.should.not.equal('aaPassword')
            user.password.should.not.equal('StapleBatteryHorse')
            const finalPasswordCheck = await app.db.controllers.User.authenticateCredentials('alice', 'StapleBatteryHorse')
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
        it('fails changes a users password, too weak', async function () {
            const user = await app.db.models.User.byUsername('alice')
            const initialPasswordCheck = await app.db.controllers.User.authenticateCredentials('alice', 'aaPassword')
            initialPasswordCheck.should.be.true()
            try {
                await app.db.controllers.User.changePassword(user, 'aaPassword', 'ddPassword')
            } catch (err) {
                err.message.should.equal('Password Too Weak')
                return
            }
            throw new Error('Allowed bad password')
        })
        it('fails if password matches username or email', async function () {
            // Need a user with a username/email that'll pass the general length/weakness checks
            const userComplexUsername = await app.db.models.User.create({ username: 'BluePianoLampshade', name: '', email: 'BluePianoLampshade@example.com', email_verified: true, password: 'aaPassword' })
            try {
                await app.db.controllers.User.changePassword(userComplexUsername, 'aaPassword', 'BluePianoLampshade')
            } catch (err) {
                err.message.should.equal('Password must not match username')
            }
            try {
                await app.db.controllers.User.changePassword(userComplexUsername, 'aaPassword', 'BluePianoLampshade@example.com')
            } catch (err) {
                err.message.should.equal('Password must not match email')
            }
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
            // ensure "Confirm Change" Email is sent to the NEW email address
            const email = inbox.messages[0]
            email.should.have.property('to', newEmailAddress)
            email.text.should.containEql(alice.email)
            email.text.should.containEql(newEmailAddress)
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
        after(async function () {
            const bob = await app.db.models.User.byUsername('bob')
            bob.password_expired = false
            await bob.save()
        })
    })

    describe('invitation token handling', function () {
        it('generates a valid verification token for a user', async function () {
            // 'chris' does not have a verified email
            const user = await app.db.models.User.byUsername('chris')
            user.email_verified.should.be.false()
            const token = await app.db.controllers.User.generateEmailVerificationToken(user)
            ;/^\d\d\d\d\d\d$/.test(token.token).should.be.true()
        })
        it('validates a token for the provided user', async function () {
            // 'chris' does not have a verified email
            const user = await app.db.models.User.byUsername('chris')
            user.email_verified.should.be.false()
            const token = await app.db.controllers.User.generateEmailVerificationToken(user)

            await app.db.controllers.User.verifyEmailToken(user, token.token)

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
                await app.db.controllers.User.verifyEmailToken(otherUser, token.token)
            } catch (err) {
                const updatedUser = await app.db.models.User.byUsername('chris')
                updatedUser.email_verified.should.be.false()
                return
            }
            throw new Error('verifyEmailToken passed')
        })

        it('rejects invalid token', async function () {
            const user = await app.db.models.User.byUsername('chris')
            await app.db.controllers.User.generateEmailVerificationToken(user)
            try {
                await app.db.controllers.User.verifyEmailToken(user, '123123')
            } catch (err) {
                const updatedUser = await app.db.models.User.byUsername('chris')
                updatedUser.email_verified.should.be.false()
                return
            }
            throw new Error('verifyEmailToken passed')
        })

        it('rejects expired token', async function () {
            const user = await app.db.models.User.byUsername('chris')
            const token = await app.db.controllers.User.generateEmailVerificationToken(user)
            const dbToken = await app.db.models.AccessToken.findOne({
                where: {
                    ownerType: 'user',
                    ownerId: '' + user.id,
                    scope: 'email:verify'
                }
            })
            dbToken.expiresAt = new Date(Date.now() - 1000)
            await dbToken.save()
            try {
                await app.db.controllers.User.verifyEmailToken(user, token.token)
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
