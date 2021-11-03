const { compareHash } = require("../utils")

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
    }
}
