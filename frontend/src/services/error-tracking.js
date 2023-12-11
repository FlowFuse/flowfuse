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
                routingInstrumentation: vueRouterInstrumentation(router)
            }),
            new Replay()
        ],
        sendClientReports: true,

        // Current build info
        release: window.sentryConfig.version,
        environment: window.sentryConfig.environment,

        // Performance Monitoring
        tracesSampleRate: window.sentryConfig.production ? 0.5 : 1.0,

        // Which URLs distributed tracing should be enabled
        tracePropagationTargets: [/^https:\/\/forge.flowforge.dev\/api/, /^https:\/\/app.flowforge.com\//],

        // Session Replay
        replaysSessionSampleRate: window.sentryConfig.production ? 0.05 : 0.25,
        replaysOnErrorSampleRate: 0.5,

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
