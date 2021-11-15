const { compareHash, sha256 } = require("../utils")
const jwt = require('jsonwebtoken');

module.exports = {
    /**
     * Validate the username/password
     */
    authenticateCredentials: async function(db, username, password) {
        const user = await db.models.User.findOne({
            where: { username: username },
            attributes: ['password']
        })
        // Always call compareSync, even if no user found, to ensure
        // constant timing in the response.
        if (compareHash(password||"", user?user.password:"")) {
            return true;
        }
        return false
    },

    changePassword: async function(db, user, oldPassword, newPassword) {
        if (compareHash(oldPassword,user.password)) {
            user.password = newPassword;
            user.password_expired = false;
            return user.save()
        } else {
            throw new Error("Password Update Failed")
        }
    },

    expirePassword: async function(db, user) {
        if (user) {
            user.password_expired = true;
            return user.save();
        } else {
            await db.models.User.update({
                password_expired: true
            }, { where: { } })
        }
    },

    generateEmailVerificationToken: async function(db, user) {
        const TOKEN_EXPIRY = 1000*60*60*24*2; // 48 Hours
        const expiresAt = Math.floor((Date.now()+TOKEN_EXPIRY)/1000); // 48 hours
        const signingHash = sha256(user.password);
        return jwt.sign({ sub: user.email, exp: expiresAt}, signingHash);
    },

    verifyEmailToken: async function(db, user, token) {
        // Get the email from the token (.sub)
        const peekToken = jwt.decode(token);
        if (peekToken && peekToken.sub) {
            // Get the corresponding user
            const requestingUser = await db.models.User.byEmail(peekToken.sub);
            if (user && user.id !== requestingUser.id) {
                throw new Error("Invalid link");
            }
            if (requestingUser.email_verified) {
                throw new Error("Link expired");
            }
            if (requestingUser) {
                // Verify the token
                const signingHash = db.utils.sha256(requestingUser.password)
                try {
                    const decodedToken = jwt.verify(token, signingHash);
                    if (decodedToken) {
                        requestingUser.email_verified = true;
                        await requestingUser.save()
                        return;
                    }
                } catch(err) {
                    if (err.name === "TokenExpiredError") {
                        throw new Error("Link expired")
                    } else {
                        throw new Error("Invalid link")
                    }

                }
            }
        }
        throw new Error("Invalid link")
    }



}
