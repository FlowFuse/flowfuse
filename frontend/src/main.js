import { LottieAnimation } from 'lottie-web-vue'

import ForgeUIComponents from '@flowforge/forge-ui-components'
import { AxiosError } from 'axios'
import { createApp } from 'vue'

import '@flowforge/forge-ui-components/dist/forge-ui-components.css'

import App from './App.vue'
import Loading from './components/Loading.vue'
import router from './routes.js'
import Alerts from './services/alerts.js'
import store from './store/index.js'
import './index.css'

const app = createApp(App)
    .use(ForgeUIComponents)
    .use(store)
    .use(router)

// Globally available FF Components
app.component('lottie-animation', LottieAnimation)
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
