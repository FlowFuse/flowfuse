import { onBeforeUnmount, ref, watch } from 'vue'

/**
 * Draws a long list a part at a time, so a list of thousands does not hold up the page.
 * Render the first `shown` items, and after them, while there are more, an element bound to `sentinel`:
 * each time that element scrolls into view, `shown` grows by `step`.
 */
export function useRevealMore (step: number) {
    // without a way to tell what is in view, everything is drawn
    const supported = typeof IntersectionObserver !== 'undefined'
    const shown = ref(supported ? step : Infinity)
    const sentinel = ref<Element | null>(null)

    const observer = supported
        ? new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) shown.value += step
        })
        : null

    // Watched again after every step: the sentinel may still be in view, and an observer only reports a change
    watch([sentinel, shown], () => {
        observer?.disconnect()
        if (sentinel.value) observer?.observe(sentinel.value)
    }, { flush: 'post' })

    onBeforeUnmount(() => observer?.disconnect())

    function reset () {
        if (supported) shown.value = step
    }

    return { shown, sentinel, reset }
}
