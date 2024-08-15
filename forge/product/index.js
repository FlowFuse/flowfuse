const fp = require('fastify-plugin')
const { PostHog } = require('posthog-node')

module.exports = fp(async function (app, _opts) {
    let client
    if (_opts) {
        const apiHost = _opts?.apiurl || 'https://app.posthog.com'
        const apiKey = _opts?.apikey
        const options = {
            api_host: apiHost
        }
        if ('capture_pageview' in _opts) {
            options.capture_pageview = _opts.capture_pageview
        }

        client = new PostHog(apiKey, options.opts)
    }

    function capture (event, properties, groups) {
        if (client) {
            // need to add in team data somehow?

            if (!properties) {
                properties = {}
            }
            if (groups) {
                properties.$groups = groups
            }
            // Get User E-Mail
            const distinctId = 'email-address'
            client.capture({ distinctId, event, properties })
        }
    }

    app.decorate('product', {
        capture
    })
}, { name: 'app.product' })
