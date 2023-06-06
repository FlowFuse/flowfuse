import ForgeUIComponents from '@flowforge/forge-ui-components'
import { createApp } from 'vue'

import '@flowforge/forge-ui-components/dist/forge-ui-components.css'

import App from './SetupApp.vue'
import './index.css'

createApp(App)
    .use(ForgeUIComponents)
    .mount('#app')
