import { LottieAnimation } from 'lottie-web-vue'

import * as Sentry from '@sentry/vue'
import { AxiosError } from 'axios'
import { createApp } from 'vue'

import './ui-components/index.scss'

import App from './App.vue'
import Loading from './components/Loading.vue'
import SectionNavigationHeader from './components/SectionNavigationHeader.vue'
import PageLayout from './layouts/Page.vue'
import router from './routes.js'
import Alerts from './services/alerts.js'
import store from './store/index.js'

import './index.css'

import ForgeUIComponents from './ui-components/index.js'

const app = createApp(App)
    .use(ForgeUIComponents)
    .use(store)
    .use(router)

Sentry.init({
    app,
    dsn: 'https://6a3f14c730324d745af15e247c24ca1a@o4505958485524480.ingest.sentry.io/4505958486441984',
    integrations: [
        new Sentry.BrowserTracing({
            // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
            tracePropagationTargets: ['127.0.0.1', /^https:\/\/forge.flowforge.dev\/api/, /^https:\/\/app.flowforge.com\//],
            routingInstrumentation: Sentry.vueRouterInstrumentation(router)
        }),
        new Sentry.Replay()
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0 // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
})

// Globally available FF Components
app.component('lottie-animation', LottieAnimation)
app.component('ff-page', PageLayout)
app.component('ff-page-header', SectionNavigationHeader)
app.component('ff-loading', Loading)

app.config.errorHandler = function (err, vm, info) {
    // Uncaught XHR errors bubble to here
    if (err instanceof AxiosError) {
        // API has returned error details
        const errorMessage =
            err.response?.data?.message ?? // deprecated format
            err.response?.data?.error // new format
        if (errorMessage) {
            return Alerts.emit(`Request Failed: ${errorMessage}`, 'warning')
        }

        // HTTP error only
        return Alerts.emit(`${err.message ?? 'Request Failed: Unknown error'}`, 'warning')
    }
}

app.config.globalProperties.$filters = {
    pluralize (amount, singular, plural = `${singular}s`) { return amount === 1 ? singular : plural }
}

app.mount('#app')
