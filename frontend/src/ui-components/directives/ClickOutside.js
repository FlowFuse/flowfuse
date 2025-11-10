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
            const excludedNodes = options.value.exclude || []
            const target = evt.target

            // check if target or any ancestor has data-click-exclude matching
            const excluded = target.closest('[data-click-exclude]')
            const excludedKey = excluded?.dataset?.clickExclude

            switch (true) {
            case target !== element && !element.contains(target) && typeof options.value === 'function':
                return options.value()
            case target !== element && !element.contains(target) && typeof options.value === 'object':
                return excludedKey && excludedNodes.includes(excludedKey)
                    ? null
                    : options.value.handler()
            default:
                return null
            }
        }
        document.addEventListener('pointerdown', handler, true)
        instances.set(element, handler)
    },
    unmounted (element) {
        const handler = instances.get(element)
        if (handler) {
            document.removeEventListener('pointerdown', handler, true)
        }
        instances.delete(element)
    }
}

export default directive
