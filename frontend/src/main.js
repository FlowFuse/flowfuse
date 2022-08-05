import { createApp } from 'vue'

import ForgeUIComponents from '@flowforge/forge-ui-components'
import '@flowforge/forge-ui-components/dist/forge-ui-components.css'
import LottieAnimation from 'lottie-web-vue'
import posthog from 'posthog-js'

import router from '@/routes'
import store from '@/store'
import App from '@/App.vue'
import '@/index.css'

// Globally available FF Components
import Loading from '@/components/Loading'

posthog.init('phc_U1yxTYD5mcd3yyQ8HGQQtwBjPfIeQrcuasvhm7RH367', { api_host: 'https://app.posthog.com', capture_pageview: false })

const app = createApp(App)
    .use(ForgeUIComponents)
    .use(LottieAnimation)
    .use(store)
    .use(router)

app.component('ff-loading', Loading)

app.config.globalProperties.$filters = {
    pluralize (amount, singular, plural = `${singular}s`) { return amount === 1 ? singular : plural }
}

app.mount('#app')
