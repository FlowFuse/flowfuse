/**
 *
 * @param {Element} $el
 * @param {'auto' || 'instant' || 'smooth'} behavior
 * @param {number}  top - Specifies the number of pixels along the Y axis to scroll the window or element.
 * @param {number} left - Specifies the number of pixels along the X axis to scroll the window or element.
 */
export function scrollTo ($el, {
    behavior = 'smooth',
    top = 0,
    left = 0
} = {}) {
    $el.scrollTo({ behavior, top, left })
}

/**
 *
 * @param {Element} $el
 * @param {'auto' || 'instant' || 'smooth'} behavior
 * @param {'center' || 'end' || 'nearest' || 'start'}  block
 * @param {'center' || 'end' || 'nearest' || 'start'} inline
 */
export function scrollIntoView ($el, {
    behavior = 'smooth',
    block = 'start',
    inline = 'center'
} = {}) {
    $el.scrollIntoView({ behavior, block, inline })
}

/**
 *
 * @param {Element} $scrollTo
 * @param {Element} $highlight
 * @param {AnimationOptions} options
 *
 * @typedef {Object} AnimationOptions
 * @property {number} duration - The duration of the scroll animation in milliseconds.
 * @property {number} delay - The delay before the jiggle animation starts in milliseconds.
 * @property {number} count - The number of times the highlight element should jiggle.
 */
export function scrollToAndJiggleHighlight (
    $scrollTo,
    $highlight = $scrollTo,
    {
        duration = 300,
        delay = 800,
        count = 2
    } = {}
) {
    let animationCount = 0

    scrollIntoView($scrollTo)

    function runAnimation () {
        if (animationCount < count) {
            $highlight.classList.add('jiggle')
            setTimeout(() => {
                $highlight.classList.remove('jiggle')
                animationCount++
                setTimeout(runAnimation, delay)
            }, duration)
        }
    }
    setTimeout(runAnimation, delay)
}
