/* eslint-disable no-prototype-builtins */

// third-party
import { marked } from 'marked'

// local
import directives from './directives'
import components from './components'
import './index.scss'

const markedMixin = {
    methods: {
        md: function (content) {
            return marked.parse(content)
        }
    }
}

const plugin = {
    install (Vue) {
        // third-party
        Vue.mixin(markedMixin)
        // Our Components & Directives
        for (const prop in components) {
            if (components.hasOwnProperty(prop)) {
                const component = components[prop]
                Vue.component(component.name, component)
            }
        }
        for (const prop in directives) {
            if (directives.hasOwnProperty(prop)) {
                const directive = directives[prop]
                Vue.directive(directive.name, directive)
            }
        }
    }
}

export default plugin
