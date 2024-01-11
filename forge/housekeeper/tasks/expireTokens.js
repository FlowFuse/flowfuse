const { Op } = require('sequelize')

const randomInt = (min, max) => { return min + Math.floor(Math.random() * (max - min)) }

module.exports = {
    name: 'expireTokens',
    startup: true,
    // Pick a random hour/minute for this task to run at. If the application is
    // horizontal scaled, this will avoid two instances running at the same time
    schedule: `${randomInt(0, 60)} ${randomInt(0, 24)} * * *`,
    run: async function (app) {
        await app.db.models.Session.destroy({ where: { expiresAt: { [Op.lt]: Date.now() } } })
        await app.db.models.AccessToken.destroy({ where: { expiresAt: { [Op.lt]: Date.now() } } })
    }
}
