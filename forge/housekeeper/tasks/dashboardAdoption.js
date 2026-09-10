const { randomInt } = require('../utils')

const DASHBOARD_MODULE = '@flowfuse/node-red-dashboard'

const QUERIES = {
    postgres: `
        SELECT
            COUNT(*) FILTER (
                WHERE (s.settings::jsonb -> 'nodes' -> :module ->> 'local')::boolean IS TRUE
            ) AS with_dashboard,
            COUNT(*) AS total
        FROM "StorageSettings" s
        JOIN "Projects" p ON p.id = s."ProjectId"
        WHERE p.state <> 'suspended'`,
    sqlite: `
        SELECT
            SUM(CASE
                WHEN json_extract(s.settings, '$.nodes."' || :module || '".local') = 1 THEN 1
                ELSE 0
            END) AS with_dashboard,
            COUNT(*) AS total
        FROM "StorageSettings" s
        JOIN "Projects" p ON p.id = s."ProjectId"
        WHERE p.state <> 'suspended'`
}

module.exports = {
    name: 'dashboardAdoption',
    schedule: `${randomInt(0, 59)} ${randomInt(0, 23)} * * *`,
    run: async function (app) {
        if (process.env.FF_TELEMETRY_DISABLED) {
            return
        }
        const isLicensed = app.license.active()
        const isTelemetryEnabled = (app.config.telemetry.enabled !== false && app.settings.get('telemetry:enabled'))
        if (!app.settings.get('setup:initialised') || !(isLicensed || isTelemetryEnabled)) {
            return
        }
        if (!app.config.telemetry?.frontend?.posthog?.apikey) {
            return
        }
        const query = QUERIES[app.db.sequelize.getDialect()]
        if (!query) {
            return
        }
        const [result] = await app.db.sequelize.query(query, {
            replacements: { module: DASHBOARD_MODULE },
            type: app.db.sequelize.QueryTypes.SELECT
        })
        const withDashboard = Number(result.with_dashboard) || 0
        const total = Number(result.total) || 0

        app.product.capture(app.settings.get('instanceId'), '$ff-dashboard-adoption', {
            with_dashboard: withDashboard,
            total,
            pct: total > 0 ? Math.round(1000 * withDashboard / total) / 10 : 0
        })
    }
}
