const fs = require('fs/promises')
const path = require('path')

const axios = require('axios')

const { randomInt } = require('../utils')

const METRICS_DIR = path.join(__dirname, 'telemetryMetrics')

// Pick a random time to run the ping on
const PING_TIME = `${randomInt(0, 59)} ${randomInt(0, 23)} * * *`

/**
 * Gather the metrics to send to the ping api
 */
async function gather (app) {
    let metricFiles = await fs.readdir(METRICS_DIR)
    metricFiles = metricFiles.filter(name => /^\d+-.*\.js$/.test(name))
    metricFiles.sort()

    const metrics = {}

    for (let i = 0, l = metricFiles.length; i < l; i++) {
        const metricModule = require(path.join(METRICS_DIR, metricFiles[i]))
        let result = metricModule(app)
        if (!!result && (typeof result === 'object' || typeof result === 'function') && typeof result.then === 'function') {
            result = await result
        }
        const keys = Object.keys(result)
        keys.forEach(key => {
            const keyParts = key.split('.')
            let p = metrics
            keyParts.forEach((part, index) => {
                if (index < keyParts.length - 1) {
                    if (!p[part]) {
                        p[part] = {}
                    }
                    p = p[part]
                } else {
                    p[part] = result[key]
                }
            })
        })
    }
    return metrics
}

async function ping (app) {
    if (process.env.FF_TELEMETRY_DISABLED) {
        // Allow our tests/CI to disable telemetry
        return
    }
    // Only do the ping if:
    // - The licence is active (EE)
    // OR
    // - telemetry.enabled has not been set to false in yml file (this overrides any admin set value)
    // - setup:initialised is true - the system has been setup
    // - telemetry:enabled is true - the admin has not disabled the callback

    const PING_ENDPOINT = app.config.telemetry.url || 'https://ping.flowforge.com/ping'

    const isLicensed = app.license.active()
    const isInitialised = app.settings.get('setup:initialised')
    const isTelemetryEnabled = (app.config.telemetry.enabled !== false && app.settings.get('telemetry:enabled'))

    if (isInitialised && (isLicensed || isTelemetryEnabled)) {
        const payload = await gather(app)
        try {
            app.log.trace('Sending telemetry report')
            await axios.post(PING_ENDPOINT, payload, {
                responseType: 'json'
            })
            app.log.trace('Sent telemetry report')
        } catch (err) {
            app.log.error('Failed to send telemetry report: %s', err)
        }
    }
}

module.exports = {
    name: 'usageTelemetry',
    startup: 10000,
    schedule: PING_TIME,
    run: async function (app) {
        return ping(app)
    }
}
