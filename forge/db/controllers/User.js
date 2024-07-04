const jwt = require('jsonwebtoken')
const { fn, col, where } = require('sequelize')
const zxcvbn = require('zxcvbn')

const { compareHash, sha256 } = require('../utils')

module.exports = {
    /**
     * Validate the username/password
     */
    authenticateCredentials: async function (app, username, password) {
        const column = /.+@.+/.test(username) ? 'email' : 'username'
        const user = await app.db.models.User.findOne({
            where: where(
                fn('lower', col(column)),
                username.toLowerCase()
            ),
            attributes: ['password']
        })
        // To avoid timing vulnerabilities to discover if a user is valid or not,
        // we always want to call the compareHash function, even if we want to reject
        // the request at this point. The `forceFailure` flag lets us do that.
        let forceFailure = false
        let userPassword = ''

        if (user) {
            userPassword = user.password
        } else {
            forceFailure = true
        }
        // Do not allow arbitary length passwords to be passed to compareHash
        if (!password || password.length > 128) {
            password = ''
            forceFailure = true
        }
        if (compareHash(password, userPassword)) {
            if (forceFailure) {
                // Don't care what the result is - we've already chosen to
                // reject the login attempt
                return false
            }
            return true
        }
        return false
    },

    changePassword: async function (app, user, oldPassword, newPassword) {
        if (oldPassword && oldPassword.length < 129 && compareHash(oldPassword, user.password)) {
            if (newPassword.length > 128) {
                throw new Error('Password Too Long (max 128)')
            }
            if (zxcvbn(newPassword).score < 3) {
                throw new Error('Password Too Weak')
            }
            if (newPassword === user.username) {
                throw new Error('Password must not match username')
            } else if (newPassword === user.email) {
                throw new Error('Password must not match email')
            } else if (newPassword === oldPassword) {
                throw new Error('Password must not match old password')
            }
            user.password = newPassword
            user.password_expired = false
            return user.save()
        } else {
            throw new Error('Password Update Failed')
        }
    },

    resetPassword: async function (app, user, newPassword) {
        if (newPassword.length > 128) {
            throw new Error('Password Too Long (max 128)')
        }
        if (zxcvbn(newPassword).score < 2) {
            throw new Error('Password Too Weak')
        }
        if (newPassword === user.username) {
            throw new Error('Password must not match username')
        } else if (newPassword === user.email) {
            throw new Error('Password must not match email')
        }
        user.password = newPassword
        user.password_expired = false
        return user.save()
    },

    expirePassword: async function (app, user) {
        if (user) {
            user.password_expired = true
            return user.save()
        } else {
            await app.db.models.User.update({
                password_expired: true
            }, { where: { } })
        }
    },

    generateEmailVerificationToken: async function (app, user) {
        const TOKEN_EXPIRY = 1000 * 60 * 60 * 24 * 2 // 48 Hours
        const expiresAt = Math.floor((Date.now() + TOKEN_EXPIRY) / 1000) // 48 hours
        const signingHash = sha256(user.password)
        return jwt.sign({ sub: user.email, exp: expiresAt }, signingHash)
    },

    verifyEmailToken: async function (app, user, token) {
        // Get the email from the token (.sub)
        const peekToken = jwt.decode(token)
        if (peekToken && peekToken.sub) {
            // Get the corresponding user
            const requestingUser = await app.db.models.User.byEmail(peekToken.sub)
            if (user && user.id !== requestingUser.id) {
                throw new Error('Invalid link')
            }
            if (requestingUser.email_verified) {
                throw new Error('Link expired')
            }
            if (requestingUser) {
                // Verify the token
                const signingHash = app.db.utils.sha256(requestingUser.password)
                try {
                    const decodedToken = jwt.verify(token, signingHash)
                    if (decodedToken) {
                        requestingUser.email_verified = true
                        await requestingUser.save()
                        return requestingUser
                    }
                } catch (err) {
                    if (err.name === 'TokenExpiredError') {
                        throw new Error('Link expired')
                    } else {
                        throw new Error('Invalid link')
                    }
                }
            }
        }
        throw new Error('Invalid link')
    },
    verifyMFAToken: async function (app, user, token) {
        if (!app.config.features.enabled('mfa')) {
            // Feature not enabled
            return false
        }
        if (!user.mfa_enabled) {
            // User does not have mfa configured
            return false
        }
        // Verify the token for this user
        return app.db.models.MFAToken.verifyTokenForUser(user, token)
    },
    generatePendingEmailChangeToken: async function (app, user, newEmailAddress) {
        const TOKEN_EXPIRY = 1000 * 60 * 60 * 24 * 2 // 48 Hours
        const expiresAt = Math.floor((Date.now() + TOKEN_EXPIRY) / 1000) // 48 hours
        const signingHash = sha256(user.password)
        return jwt.sign({ sub: user.email, id: user.hashid, change: newEmailAddress, aud: 'update-user-email', exp: expiresAt }, signingHash)
    },

    sendPendingEmailChangeEmail: async function (app, user, newEmailAddress) {
        const pendingEmailChangeToken = await app.db.controllers.User.generatePendingEmailChangeToken(user, newEmailAddress)
        const recipient = {
            name: user.name,
            email: newEmailAddress,
            id: user.id,
            hashid: user.hashid
        }
        await app.postoffice.send(
            recipient,
            'PendingEmailChange',
            {
                oldEmail: user.email,
                newEmail: newEmailAddress,
                confirmEmailLink: `${app.config.base_url}/account/email_change/${pendingEmailChangeToken}`
            }
        )
    },

    applyPendingEmailChange: async function (app, user, token) {
        // Get the email from the token (.sub)
        const peekToken = jwt.decode(token)
        if (!peekToken?.sub || peekToken?.aud !== 'update-user-email') {
            throw new Error('Invalid link')
        }

        // Get the corresponding user from the email in the token
        const requestingUser = await app.db.models.User.byEmail(peekToken.sub)
        // ensure the current user is the same as the one we are trying to change the email for
        if (!requestingUser || user?.id !== requestingUser?.id) {
            throw new Error('Invalid link')
        }
        if (user?.hashid !== peekToken?.id) {
            throw new Error('Invalid link')
        }
        // check that the users Email is the same as it was when the token was generated
        // and that the token contains a new email address that is different to the current one
        if (!requestingUser.email_verified || requestingUser.email !== peekToken.sub || user.email === peekToken.change) {
            throw new Error('Invalid link')
        }

        // Verify the token
        const signingHash = sha256(requestingUser.password)
        try {
            const decodedToken = jwt.verify(token, signingHash)
            if (!decodedToken) {
                throw new Error('Invalid link')
            }
            requestingUser.email = decodedToken.change // apply new Email Address
            requestingUser.email_verified = true
            await requestingUser.save()

            await app.db.controllers.AccessToken.deleteAllUserPasswordResetTokens(requestingUser)

            return requestingUser
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                throw new Error('Link expired')
            }
        }
        throw new Error('Invalid link')
    },

    sendEmailChangedEmail: async function (app, recipient, oldEmailAddress, newEmailAddress) {
        await app.postoffice.send(recipient,
            'EmailChanged',
            {
                oldEmail: oldEmailAddress,
                newEmail: newEmailAddress
            }
        )
    },

    suspend: async function (app, user) {
        user.suspended = true
        // log suspended user out of all projects they have access to
        await user.save()
        await app.db.controllers.User.logout(user)
    },

    logout: async function (app, user) {
        // Do a full logout.
        // - Clear all node-red login sessions
        // - Clear all accessTokens
        await app.db.controllers.StorageSession.removeUserFromSessions(user)
    }
}
