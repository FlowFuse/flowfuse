const bcrypt = require('bcrypt');

module.exports = {
    /**
     * Validate the username/password
     */
    authenticateCredentials: async function(db, username, password) {
        const user = await db.models.User.findOne({
            where: { email: username },
            attributes: ['email','password']
        })
        // Always call compareSync, even if no user found, to ensure
        // constant timing in the response.
        if (bcrypt.compareSync(password||"", user?user.password:"")) {
            return true;
        }
        return false
    },

    changePassword: async function(db, user, oldPassword, newPassword) {
        if (bcrypt.compareSync(oldPassword,user.password)) {
            user.password = newPassword;
            return user.save()
        } else {
            throw new Error("Password Update Failed")
        }
    }
}
