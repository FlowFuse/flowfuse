const { Op } = require('sequelize')

const { randomInt } = require('../utils')

module.exports = {
    name: 'expireTokens',
    startup: true,
    // Pick a random hour/minute for this task to run at. If the application is
    // horizontal scaled, this will avoid two instances running at the same time
    schedule: `${randomInt(0, 59)} ${randomInt(0, 23)} * * *`,
    run: async function (app) {
        await app.db.models.Session.destroy({ where: { expiresAt: { [Op.lt]: Date.now() } } })
        await app.db.models.AccessToken.destroy({ where: { expiresAt: { [Op.lt]: Date.now() } } })
        // Remove any OAuthSession objects that were created more than 5 minutes ago
        await app.db.models.OAuthSession.destroy({ where: { createdAt: { [Op.lt]: Date.now() - 1000 * 60 * 5 } } })
    }
}
