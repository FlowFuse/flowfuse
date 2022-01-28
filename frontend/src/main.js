import { createApp } from 'vue'
import router from '@/routes'
import store from '@/store'
import App from '@/App.vue'
import '@/index.css'

const app = createApp(App).use(store).use(router)

app.config.globalProperties.$filters = {
    pluralize (amount, singular, plural = `${singular}s`) { return amount === 1 ? singular : plural }
}

app.mount('#app')
