import { init } from '@sentry/vue'

export const setupSentry = (app) => {
    if (!window.sentryConfig) {
        return
    }

    const dsn = window.sentryConfig.dsn

    init({
        app,
        dsn,
        sendClientReports: true,

        // Current build info
        release: window.sentryConfig.version,
        environment: window.sentryConfig.environment,

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
