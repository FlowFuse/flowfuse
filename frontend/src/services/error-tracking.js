export const setupSentry = async (app, router) => {
    if (!window.sentryConfig) {
        debugger
        return
    }

    const dsn = window.sentryConfig.dsn

    const {
        init,
        BrowserTracing,
        vueRouterInstrumentation,
        Replay

    } = await import('@sentry/vue')

    init({
        app,
        dsn,
        integrations: [
            new BrowserTracing({
                // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
                tracePropagationTargets: ['127.0.0.1', /^https:\/\/forge.flowforge.dev\/api/, /^https:\/\/app.flowforge.com\//],
                routingInstrumentation: vueRouterInstrumentation(router)
            }),
            new Replay()
        ],

        // Performance Monitoring
        tracesSampleRate: window.sentryConfig.production ? 1.0 : 0.1,

        // Session Replay
        replaysSessionSampleRate: window.sentryConfig.production ? 0.1 : 0.5,
        replaysOnErrorSampleRate: 1.0
    })
}
