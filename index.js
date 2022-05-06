/* eslint-disable no-prototype-builtins */
import directives from './directives'
import components from './components'
import './index.scss'

const plugin = {
    install (Vue) {
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
