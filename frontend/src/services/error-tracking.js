import {
    BrowserTracing,
    Replay,
    init,
    vueRouterInstrumentation
} from '@sentry/vue'

export const setupSentry = (app, router) => {
    if (!window.sentryConfig) {
        return
    }

    const dsn = window.sentryConfig.dsn

    init({
        app,
        dsn,
        integrations: [
            new BrowserTracing({
                routingInstrumentation: vueRouterInstrumentation(router),
                shouldCreateSpanForRequest: (url) => {
                    // Exclude broker status polling (fires every 5s). PUT/DELETE on
                    // the same URL pattern are also excluded — acceptable trade-off.
                    if (/\/brokers\/[^/]+$/.test(url)) {
                        return false
                    }
                    return true
                }
            }),
            new Replay()
        ],
        sendClientReports: true,

        // Current build info
        release: window.sentryConfig.version,
        environment: window.sentryConfig.environment,

        // Performance Monitoring
        tracesSampleRate: window.sentryConfig.production ? 0.05 : 0.5,

        // Which URLs distributed tracing should be enabled
        tracePropagationTargets: [
            /app\.flow(forge|fuse).com\/api/,
            /forge\.flow(forge|fuse).dev\/api/,
            /^\//
        ],

        // Session Replay
        replaysSessionSampleRate: window.sentryConfig.production ? 0.01 : 0.1,
        replaysOnErrorSampleRate: 0.1,

        // PostHog rrweb noise on cross-origin iframe teardown — see #7052
        ignoreErrors: [
            /bufferBelongsToIframe/
        ],

        // Skip localhost reporting
        beforeSend: (event) => {
            if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
                console.debug('Would send Sentry event:', event)
                return null
            }
            return event
        }
    })
}
