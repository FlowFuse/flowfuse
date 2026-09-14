const { Op } = require('sequelize')

const { randomInt } = require('../utils')

const DASHBOARD_MODULE = '@flowfuse/node-red-dashboard'

module.exports = {
    name: 'dashboardAdoption',
    startup: 10000,
    schedule: `${randomInt(0, 59)} ${randomInt(0, 23)} * * *`,
    run: async function (app) {
        if (process.env.FF_TELEMETRY_DISABLED) {
            return
        }
        const isTelemetryEnabled = (app.config.telemetry.enabled !== false && app.settings.get('telemetry:enabled'))
        if (!app.settings.get('setup:initialised') || !isTelemetryEnabled) {
            return
        }
        const notSuspended = { state: { [Op.ne]: 'suspended' } }
        const total = await app.db.models.Project.count({ where: notSuspended })
        const candidates = await app.db.models.StorageSettings.findAll({
            attributes: ['ProjectId', 'settings'],
            where: { settings: { [Op.like]: `%${DASHBOARD_MODULE}%` } },
            include: [{
                model: app.db.models.Project,
                attributes: [],
                required: true,
                where: notSuspended
            }],
            raw: true
        })
        const withDashboard = new Set()
        for (const candidate of candidates) {
            try {
                const modules = app.db.controllers.StorageSettings.getLocalModules(candidate.settings)
                if (modules.some(module => module.name === DASHBOARD_MODULE)) {
                    withDashboard.add(candidate.ProjectId)
                }
            } catch (err) {
                app.log.warn(`Dashboard adoption: unparsable runtime settings for instance ${candidate.ProjectId}`)
            }
        }

        app.product.capture(app.settings.get('instanceId'), '$ff-dashboard-adoption', {
            with_dashboard: withDashboard.size,
            total,
            pct: total > 0 ? Math.round(1000 * withDashboard.size / total) / 10 : 0
        })
    }
}
