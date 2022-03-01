/*
    App to host local design language document
*/

import { createApp } from 'vue'
import DesignLanguage from './DesignLanguage.vue'
import FlowForgeUIComponents from '../src'

import { marked } from 'marked'

const markedMixin = {
    methods: {
        md: function (content) {
            return marked(content)
        }
    }
}

createApp(DesignLanguage)
    .mixin(markedMixin)
    .use(FlowForgeUIComponents)
    .mount('#app')
