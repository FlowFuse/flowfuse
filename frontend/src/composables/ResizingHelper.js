import { computed, ref } from 'vue'

export function useResizingHelper () {
    const viewportWidth = ref(window.innerWidth)
    const viewportHeight = ref(window.innerHeight)

    const MIN_WIDTH = ref(0)
    const MIN_HEIGHT = ref(0)
    const MAX_VIEWPORT_MARGIN_X = ref(0)
    const MAX_VIEWPORT_MARGIN_Y = ref(0)

    const MOBILE_BREAKPOINT = ref(0)
    const MAX_WIDTH_RATIO = ref(1)
    const MAX_HEIGHT_RATIO = ref(1)

    const resizing = ref(false)
    let startX = 0
    let startY = 0
    let startWidth = 0
    let startHeight = 0

    const width = ref(0)
    const height = ref(0)

    function startResize (e) {
        resizing.value = true
        startX = e.clientX
        startY = e.clientY

        startWidth = width.value
        startHeight = height.value

        document.addEventListener('mousemove', resize)
        document.addEventListener('mouseup', stopResize)
    }

    function stopResize () {
        resizing.value = false
        document.removeEventListener('mousemove', resize)
        document.removeEventListener('mouseup', stopResize)
    }

    function resize (e) {
        if (resizing.value) {
            const widthChange = e.clientX - startX
            const heightChange = e.clientY - startY

            const newWidth = startWidth + widthChange
            const newHeight = startHeight - heightChange

            width.value = Math.min(
                Math.max(MIN_WIDTH.value, newWidth),
                viewportWidth.value - MAX_VIEWPORT_MARGIN_X.value
            )
            height.value = Math.min(
                Math.max(MIN_HEIGHT.value, newHeight),
                viewportHeight.value - MAX_VIEWPORT_MARGIN_Y.value
            )
        }
    }

    function bindResizer ({
        component = null,
        initialWidth = 0,
        initialHeight = 0,
        minWidth,
        minHeight,
        maxViewportMarginX,
        maxViewportMarginY,
        mobileBreakpoint = 640,
        maxWidthRatio,
        maxHeightRatio
    } = {}) {
        let componentWidth = initialWidth
        let componentHeight = initialHeight

        if (component) {
            const element = component.$el || component

            if (element && element.getBoundingClientRect) {
                const rect = element.getBoundingClientRect()
                componentWidth = initialWidth || rect.width
                componentHeight = initialHeight || rect.height
            }
        }

        height.value = componentHeight
        width.value = componentWidth

        MIN_WIDTH.value = minWidth
        MIN_HEIGHT.value = minHeight
        MAX_VIEWPORT_MARGIN_X.value = maxViewportMarginX
        MAX_VIEWPORT_MARGIN_Y.value = maxViewportMarginY

        MOBILE_BREAKPOINT.value = mobileBreakpoint ?? 0
        MAX_WIDTH_RATIO.value = maxWidthRatio ?? 1
        MAX_HEIGHT_RATIO.value = maxHeightRatio ?? 1
    }

    function setWidth (newWidth) {
        width.value = newWidth
    }

    function setHeight (newHeight) {
        height.value = newHeight
    }

    const heightStyle = computed(() => {
        if (viewportHeight.value < MOBILE_BREAKPOINT.value) {
            return `${Math.min(height.value, viewportHeight.value)}px`
        }
        return `${Math.min(height.value, viewportHeight.value * MAX_HEIGHT_RATIO.value)}px`
    })

    const widthStyle = computed(() => {
        if (viewportWidth.value < MOBILE_BREAKPOINT.value) {
            return `${Math.min(width.value, viewportWidth.value)}px`
        }
        return `${Math.min(width.value, viewportWidth.value * MAX_WIDTH_RATIO.value)}px`
    })

    const isResizing = computed(() => resizing.value)

    return {
        heightStyle,
        widthStyle,
        isResizing,
        startResize,
        stopResize,
        bindResizer,
        setWidth,
        setHeight
    }
}
