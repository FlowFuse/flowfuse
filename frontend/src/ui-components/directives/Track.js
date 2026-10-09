import Product from '../../services/product.js'

const handlers = new Map()

/**
 * Adds a `v-ff-track` directive that captures an analytics event when the
 * element is clicked: `v-ff-track="'ff-instance-create-clicked'"`.
 *
 * Only the event name is passed. The team and the route ride along on every
 * event already, so they are not repeated here.
 */
const directive = {
    name: 'ff-track',
    mounted (el, binding) {
        el.dataset.ffTrack = binding.value
        const handler = () => {
            // Disabled native buttons never fire clicks, but anchors and
            // aria-disabled elements do
            if (!el.dataset.ffTrack || el.getAttribute('aria-disabled') === 'true') {
                return
            }
            Product.capture(el.dataset.ffTrack)
        }
        // Capture phase, so this runs before the element's own click handlers:
        // those often navigate, and on a real click the page can unmount (and
        // drop this listener) before a bubble phase listener gets its turn
        el.addEventListener('click', handler, true)
        handlers.set(el, handler)
    },
    updated (el, binding) {
        el.dataset.ffTrack = binding.value
    },
    unmounted (el) {
        el.removeEventListener('click', handlers.get(el), true)
        handlers.delete(el)
    }
}

export default directive
