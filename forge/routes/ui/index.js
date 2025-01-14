/**
 * Routes that serve the forge frontend web app
 *
 * - `/`
 * - `/index.html`
 * - `/app/*`
 *
 * The src code for the ui is under the `frontend` directory. It is built using
 * webpack into the `frontend/dist` directory.
 *
 * This code checks that exists and logs an error if its missing.
 *
 * @namespace ui
 * @memberof forge.routes
 */
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')

const Avatar = require('./avatar')

module.exports = async function (app) {
    const frontendAssetsDir = path.join(__dirname, '../../../frontend/dist/')

    /**
     * Inject Analytics Tools
     * feConfig - the 'frontend' portion of our flowforge.yml
     */
    async function injectAnalytics (config) {
        if (!cachedIndex) {
            const telemetry = config.telemetry
            const support = config.support
            const filepath = path.join(frontendAssetsDir, 'index.html')
            const data = await fsp.readFile(filepath, 'utf8')

            let injection = ''

            // check which tools we are using
            if (telemetry.frontend.posthog?.apikey) {
                // add to frontend
                const apihost = telemetry.frontend.posthog.apiurl || 'https://app.posthog.com'
                const apikey = telemetry.frontend.posthog.apikey
                const options = {
                    api_host: apihost
                }
                if ('capture_pageview' in telemetry.frontend.posthog) {
                    options.capture_pageview = telemetry.frontend.posthog.capture_pageview
                }
                // TODO: object to string in the injection script
                injection += `<script>
                !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
                posthog.init('${apikey}', ${JSON.stringify(options)})
            </script>`
            }

            if (telemetry.frontend.google?.tag) {
                const tag = telemetry.frontend.google.tag
                injection += `<script async src="https://www.googletagmanager.com/gtag/js?id=${tag}"></script>`
                injection += `<script> window.dataLayer = window.dataLayer || []; let gtag = window.gtag = function (){dataLayer.push(arguments);}; gtag('js', new Date()); gtag('config', '${tag}'); </script>`
            }

            if (support?.enabled && support.frontend?.hubspot?.trackingcode) {
                const trackingCode = support.frontend.hubspot.trackingcode
                injection += `<!-- Start of HubSpot Embed Code -->
                <script type="text/javascript">window._ffhstc = "${trackingCode}"</script>
                <script type="text/javascript" id="hs-script-loader" async defer src="//js-eu1.hs-scripts.com/${trackingCode}.js"></script>
              <!-- End of HubSpot Embed Code -->`
            }

            if (telemetry.frontend?.sentry?.dsn) {
                injection += `<script>window.sentryConfig = { dsn: "${telemetry.frontend.sentry.dsn}", production_mode: ${telemetry.frontend.sentry.production_mode ?? true}, version: "flowfuse@${config.version}", environment: "${process.env.SENTRY_ENV ?? (process.env.NODE_ENV ?? 'unknown')}" }</script>`
            }

            // inject into index.html
            cachedIndex = data.replace(/<script>\/\*inject-ff-scripts\*\/<\/script>/g, injection)
        }
        return cachedIndex
    }

    async function getIndexFile (request, reply, app) {
        if (app.config.telemetry?.frontend) {
            let injectedContent = await injectAnalytics(app.config)
            injectedContent = updateSEOTags(request, injectedContent)

            return reply.type('text/html').send(injectedContent)
        } else {
            const filepath = path.join(frontendAssetsDir, 'index.html')
            let data = await fsp.readFile(filepath, 'utf8')
            data = updateSEOTags(request, data)

            return reply.type('text/html').send(data)
        }
    }

    function updateSEOTags (request, data) {
        switch (true) {
        case !request.sid && request.raw.url === '/':
            // We can safely assume that unauthenticated users reaching the root endpoint are on the login page
            // so we can safely replace tags used by crawlers to serve them statically for ease of indexing
            data = data.replace(
                '<title>FlowFuse</title>',
                '<title>Log in - FlowFuse</title>'
            )
            data = data.replace(
                '<meta name="description" content="Build applications, integrate data and manage your Node-RED instances with enterprise-grade security.">',
                '<meta name="description" content="Log in to FlowFuse to access your industrial data, manage Node-RED instances, and continue building powerful integrations with enterprise-grade security.">'
            )
            return data
        case !request.sid && request.raw.url.includes('/account/create'):
            // We can safely assume that unauthenticated users reaching the root endpoint are on the account creation page
            // so we can safely replace tags used by crawlers to serve them statically for ease of indexing
            data = data.replace(
                '<title>FlowFuse</title>',
                '<title>Sign up - FlowFuse</title>'
            )
            data = data.replace(
                '<meta name="description" content="Build applications, integrate data and manage your Node-RED instances with enterprise-grade security.">',
                '<meta name="description" content="Sign up for FlowFuse and start building applications, integrating data, and managing your Node-RED instances with enterprise-grade security.">'
            )
            return data
        default:
            return data
        }
    }

    let cachedIndex = null

    // Check the frontend has been built
    if (!fs.existsSync(path.join(frontendAssetsDir, 'index.html'))) {
        throw new Error("'/frontend/dist/index.html' not found. Have you run `npm run build`?")
    }

    app.register(Avatar, { prefix: '/avatar' })

    // Setup static file serving for the UI assets.
    app.register(require('@fastify/static'), {
        index: false,
        root: frontendAssetsDir
    })

    app.get('/', async (request, reply) => {
        if (!app.settings.get('setup:initialised')) {
            reply.redirect('/setup')
            return
        }

        return await getIndexFile(request, reply, app)
    })

    // Any requests not handled by this time get served `index.html`.
    // This allows the frontend vue router to change the browser URL and we cope
    // if the user then hits reload
    app.setNotFoundHandler(async (request, reply) => {
        if (request.method === 'GET' && !request.url.startsWith('/api')) {
            return await getIndexFile(request, reply, app)
        } else {
            return reply.status(404).send()
        }
    })
}
