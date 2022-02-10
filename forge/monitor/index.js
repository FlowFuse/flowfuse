const fp = require('fastify-plugin')
const cronosjs = require('cronosjs')
const fs = require('fs').promises
const path = require('path')
const axios = require('axios')

module.exports = fp(async function (app, _opts, next) {
    const PING_ENDPOINT = app.config.telemetry.url || 'https://ping.flowforge.com/ping'
    let pingEvent = null
    let startupEvent = null
    let pingAttempts = 0
    let pingRetryTimeout
    app.addHook('onClose', async (_) => {
        if (pingEvent) {
            pingEvent.stop()
        }
        if (pingRetryTimeout) {
            clearTimeout(pingRetryTimeout)
        }
        if (startupEvent) {
            clearTimeout(startupEvent)
        }
    })

    const randomInt = (min, max) => { return min + Math.floor(Math.random() * (max - min)) }
    const pingTime = `${randomInt(0, 60)} ${randomInt(0, 24)} * * *`
    app.log.trace('Monitor ping time set to "%s"', pingTime)

    pingEvent = cronosjs.scheduleTask(pingTime, async (_) => {
        pingAttempts = 0
        return ping()
    })
    startupEvent = setTimeout(ping, 10000)

    /**
     * Gather the metrics to send to the ping api
     */
    async function gather () {
        let metricFiles = await fs.readdir(path.join(__dirname, 'metrics'))
        metricFiles = metricFiles.filter(name => /^\d+-.*\.js$/.test(name))
        metricFiles.sort()

        const metrics = {}

        for (let i = 0, l = metricFiles.length; i < l; i++) {
            const metricModule = require(path.join(__dirname, 'metrics', metricFiles[i]))
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

    /**
     * Gathers metrics and delivers them to the Ping api if telemetry is enabled
     */
    async function ping () {
        // Only do the ping if:
        // - telemetry.enabled has not been set to false in yml file (this overrides any admin set value)
        // - setup:initialised is true - the system has been setup
        // - telemetry:enabled is true - the admin has not disabled the callback

        if (app.config.telemetry.enabled !== false && app.settings.get('setup:initialised') && app.settings.get('telemetry:enabled')) {
            const payload = await gather()
            try {
                app.log.trace('Sending ping callback')
                await axios.post(PING_ENDPOINT, payload, {
                    responseType: 'json'
                })
                app.log.trace('Sent ping callback')
            } catch (err) {
                // Try 3 times before abandoning
                if (pingAttempts === 2) {
                    app.log.error('Failed to send ping: %s', err)
                    pingAttempts = 0
                } else {
                    pingAttempts++
                    app.log.trace('Failed to send ping, retrying in %ds: %s', Math.floor((30000 * pingAttempts) / 1000), err)
                    pingRetryTimeout = setTimeout(ping, 30000 * pingAttempts)
                }
            }
        }
    }

    app.decorate('monitor', {
        gather,
        ping
    })
    next()
})
