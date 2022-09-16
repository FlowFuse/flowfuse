const { compareHash, sha256 } = require('../utils')
const jwt = require('jsonwebtoken')
const { fn, col, where } = require('sequelize')

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
        // Always call compareSync, even if no user found, to ensure
        // constant timing in the response.
        if (compareHash(password || '', user ? user.password : '')) {
            return true
        }
        return false
    },

    changePassword: async function (app, user, oldPassword, newPassword) {
        if (compareHash(oldPassword, user.password)) {
            user.password = newPassword
            user.password_expired = false
            return user.save()
        } else {
            throw new Error('Password Update Failed')
        }
    },

    resetPassword: async function (app, user, newPassword) {
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

    suspend: async function (app, user) {
        user.suspended = true
        // log suspended user out of all projects they have access to
        const sessions = await app.db.models.StorageSession.byUsername(user.username)
        for (let index = 0; index < sessions.length; index++) {
            const session = sessions[index]
            const ProjectId = session.ProjectId
            const project = await app.db.models.Project.byId(ProjectId)
            for (let index = 0; index < session.sessions.length; index++) {
                const token = session.sessions[index].accessToken
                try {
                    await app.containers.revokeUserToken(project, token) // logout:nodered(step-2)
                } catch (error) {
                    app.log.warn(`Failed to revoke token for Project ${ProjectId}: ${error.toString()}`) // log error but continue to delete session
                }
            }
        }
        await user.save()
    }
}
