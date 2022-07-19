/*
    App to host local design language document
*/

import { createApp } from 'vue'
import DesignLanguage from './DesignLanguage.vue'
import FlowForgeUIComponents from '../src'

createApp(DesignLanguage)
    .use(FlowForgeUIComponents)
    .mount('#app')
