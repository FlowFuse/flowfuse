const fp = require('fastify-plugin')
const { PostHog } = require('posthog-node')

module.exports = fp(async function (app, _opts) {
    let client
    if (_opts && _opts.apikey) {
        const apiHost = _opts?.apiurl || 'https://app.posthog.com'
        const apiKey = _opts?.apikey
        const options = {
            host: apiHost
        }

        client = new PostHog(apiKey, options)
    }

    function capture (distinctId, event, properties, groups) {
        if (client) {
            if (!properties) {
                properties = {}
            }
            client.capture({ distinctId, event, properties, groups })
        }
    }

    app.decorate('product', {
        capture
    })
}, { name: 'app.product' })
