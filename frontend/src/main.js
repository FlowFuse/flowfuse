import { createApp } from 'vue'

import ForgeUIComponents from '@flowforge/forge-ui-components'
import '@flowforge/forge-ui-components/dist/forge-ui-components.css'

import router from '@/routes'
import store from '@/store'
import App from '@/App.vue'
import '@/index.css'

const app = createApp(App)
    .use(ForgeUIComponents)
    .use(store)
    .use(router)

app.config.globalProperties.$filters = {
    pluralize (amount, singular, plural = `${singular}s`) { return amount === 1 ? singular : plural }
}

app.mount('#app')
