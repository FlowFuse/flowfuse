const instances = new Map()

/**
 * Adds a `v-click-outside` directive that can be used to trigger a callback when
 * the user clicks outside of the element.
 *
 * Used by Dropdown to close its menu when the user clicks out
 */

const directive = {
    name: 'click-outside',
    mounted (element, options) {
        const handler = function (evt) {
            if (!evt.target !== element && !element.contains(evt.target)) {
                return options.value()
            } else {
                return null
            }
        }
        document.addEventListener('click', handler, true)
        instances.set(element, handler)
    },
    unmounted (element) {
        const handler = instances.get(element)
        if (handler) {
            document.removeEventListener('click', handler, true)
        }
        instances.delete(element)
    }
}

export default directive
