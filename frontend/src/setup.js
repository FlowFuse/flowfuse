import { createApp } from 'vue'

import App from './SetupApp.vue'
import ForgeUIComponents from './ui-components/index.js'
import './index.css'

createApp(App)
    .use(ForgeUIComponents)
    .mount('#app')
