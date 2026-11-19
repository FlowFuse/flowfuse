const { ensureSecret } = require('./credentials')
const { Timeseries } = require('./wrapper')

/**
 * The driver named in flowforge.yml. Configs written before drivers existed have a
 * `timeseries.questdb` block for one shared server, which is the static driver.
 */
function driverType (config) {
    if (config.driver?.type) {
        return config.driver.type
    }
    if (config.questdb) {
        return 'static'
    }
    return null
}

/**
 * Team suspend, unsuspend and team type changes move a team's managed server with them. A
 * failure here is logged and never fails the team operation.
 */
function wrapTeamHooks (app, timeseries) {
    const Team = app.db.models.Team

    async function safely (description, team, fn) {
        try {
            await fn()
        } catch (err) {
            app.log.error(`Timeseries ${description} failed for team ${team.hashid}: ${err.message}`)
        }
    }

    const suspend = Team.prototype.suspend
    Team.prototype.suspend = async function (...args) {
        const result = await suspend.apply(this, args)
        await safely('suspend', this, () => timeseries.suspendTeam(this, 'team_suspended'))
        return result
    }

    const unsuspend = Team.prototype.unsuspend
    Team.prototype.unsuspend = async function (...args) {
        const result = await unsuspend.apply(this, args)
        await safely('resume', this, () => timeseries.resumeTeam(this, 'team_suspended'))
        return result
    }

    const updateTeamType = Team.prototype.updateTeamType
    Team.prototype.updateTeamType = async function (...args) {
        const result = await updateTeamType.apply(this, args)
        await safely('feature check', this, () => timeseries.syncFeature(this))
        return result
    }
}

module.exports.init = async function (app) {
    const config = app.config.timeseries || {}
    app.config.features.register('timeseries', true, true)

    const type = driverType(config)
    if (!type) {
        app.log.warn('Timeseries is enabled but no driver is configured')
        return null
    }
    if (type === 'static' && !config.driver) {
        config.driver = { type: 'static', options: { questdb: config.questdb } }
    }

    await ensureSecret(app)

    let driver
    try {
        driver = require(`./drivers/${type}.js`)
    } catch (err) {
        app.log.error(`Failed to load the timeseries driver: ${type}`)
        throw err
    }
    const timeseries = new Timeseries(app, driver, config)
    await timeseries.init()
    if (timeseries.canManage) {
        wrapTeamHooks(app, timeseries)
    }
    app.addHook('onClose', async () => {
        app.log.info(`Timeseries driver ${type} shutdown`)
        await timeseries.shutdown()
    })
    app.log.info(`Timeseries driver initialized: ${type}`)
    return timeseries
}
