const fp = require('fastify-plugin')
// const cronosjs = require('cronosjs')
const fs = require('fs').promises
const path = require('path')
const axios = require('axios')

module.exports = fp(async function (app, _opts, next) {
    const PING_ENDPOINT = 'https://ping.flowforge.com/ping'

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
        if (PING_ENDPOINT !== false && app.settings.get('telemetry:enabled')) {
            const payload = await gather()
            try {
                app.log.trace('Sending ping callback')
                await axios.post(PING_ENDPOINT, payload, {
                    responseType: 'json'
                })
                app.log.trace('Sent ping callback')
            } catch (err) {
                app.log.error('Failed to send ping: %s', err)
            }
        }
    }

    app.decorate('monitor', {
        gather,
        ping
    })
    next()
})
