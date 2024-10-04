const { compareHash } = require('../../../db/utils')

module.exports = {

    authenticateCredentials: async function (app, username, password) {
        const parts = username.split('@')
        if (parts.length === 2) {
            const user = await app.db.models.TeamBrokerUser.byUsername(parts[0], parts[1])
            if (!user) {
                return false
            }

            if (!password || password.length > 128) {
                return false
            }

            if (compareHash(password, user.password)) {
                return true
            }
        }

        return false
    }
}
