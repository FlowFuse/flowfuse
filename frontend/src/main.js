import { createApp } from 'vue'
import { AxiosError } from 'axios'

import ForgeUIComponents from '@flowforge/forge-ui-components'
import '@flowforge/forge-ui-components/dist/forge-ui-components.css'
import LottieAnimation from 'lottie-web-vue'

import router from '@/routes'
import Alerts from '@/services/alerts'
import store from '@/store'
import App from '@/App.vue'
import '@/index.css'

// Globally available FF Components
import Loading from '@/components/Loading'

const app = createApp(App)
    .use(ForgeUIComponents)
    .use(LottieAnimation)
    .use(store)
    .use(router)

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
