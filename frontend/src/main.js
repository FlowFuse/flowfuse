import { createApp } from 'vue'

import ForgeUIComponents from '@flowforge/forge-ui-components'
import '@flowforge/forge-ui-components/dist/forge-ui-components.css'
import LottieAnimation from 'lottie-web-vue'

import router from '@/routes'
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

// make plausible available across the application
window.plausible = window.plausible || function () {
    (window.plausible.q = window.plausible.q || []).push(arguments)
}

// add global filters for formatting
app.config.globalProperties.$filters = {
    pluralize (amount, singular, plural = `${singular}s`) { return amount === 1 ? singular : plural }
}

app.mount('#app')
