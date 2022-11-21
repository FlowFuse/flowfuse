const { Op } = require('sequelize')

module.exports = {
    name: 'expireTokens',
    startup: true,
    schedule: '@daily',
    run: async function (app) {
        await app.db.models.Session.destroy({ where: { expiresAt: { [Op.lt]: Date.now() } } })
        await app.db.models.AccessToken.destroy({ where: { expiresAt: { [Op.lt]: Date.now() } } })
    }
}
