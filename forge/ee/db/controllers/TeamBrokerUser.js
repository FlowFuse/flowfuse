const { compareHash } = require('../../../db/utils')

module.exports = {

    authenticateCredentials: async function (app, username, password) {
        const user = await app.db.models.TeamBrokerUser.byUsername(username)
        if (!user) {
            return false
        }

        if (!password || password.length > 128) {
            return false
        }

        if (compareHash(password, user.password)) {
            return true
        }

        return false
    }
}