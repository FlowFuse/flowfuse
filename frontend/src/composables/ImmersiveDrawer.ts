import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useUxDrawersStore } from '@/stores/ux-drawers.js'

const DRAWER_MIN_WIDTH = 310
const DRAWER_MAX_VIEWPORT_MARGIN = 200
const DRAWER_MAX_WIDTH_RATIO = 0.9

interface ImmersiveDrawerOptions {
    onResizingChange?: (resizing: boolean) => void
}

export function useImmersiveDrawer (options: ImmersiveDrawerOptions = {}) {
    const { onResizingChange } = options
    const drawersStore = useUxDrawersStore()
    const { editorImmersiveDrawer } = storeToRefs(drawersStore)
    const route = useRoute()

    const resizing = ref(false)
    const startX = ref(0)
    const startWidth = ref(0)
    const windowWidth = ref(window.innerWidth)

    const isResizing = computed(() => resizing.value)

    const drawerStyle = computed(() => {
        if (!editorImmersiveDrawer.value.state) return {}
        const width = Math.min(
            editorImmersiveDrawer.value.width,
            windowWidth.value * DRAWER_MAX_WIDTH_RATIO,
            windowWidth.value - DRAWER_MAX_VIEWPORT_MARGIN
        )
        return { width: `${width}px`, order: editorImmersiveDrawer.value.side === 'right' ? 1 : -1 }
    })

    const hasStackedView = computed(() => editorImmersiveDrawer.value.viewStack.length > 0)
    const currentStackView = computed(() => {
        const stack = editorImmersiveDrawer.value.viewStack
        return stack[stack.length - 1] || null
    })
    const stackedActions = computed(() => {
        const view = currentStackView.value
        if (!view?.actions) return []
        return view.actions.filter((action: { hidden?: unknown }) => {
            if (typeof action.hidden === 'function') return !action.hidden()
            return !action.hidden
        })
    })

    function handleResize (e: MouseEvent) {
        if (!resizing.value) return
        const isLeftSide = editorImmersiveDrawer.value.side === 'left'
        const delta = isLeftSide ? e.clientX - startX.value : startX.value - e.clientX
        const newWidth = Math.min(
            Math.max(DRAWER_MIN_WIDTH, startWidth.value + delta),
            window.innerWidth * DRAWER_MAX_WIDTH_RATIO,
            window.innerWidth - DRAWER_MAX_VIEWPORT_MARGIN
        )
        drawersStore.setEditorImmersiveDrawerWidth(newWidth)
    }

    function stopResize () {
        resizing.value = false
        onResizingChange?.(false)
        document.removeEventListener('mousemove', handleResize)
        document.removeEventListener('mouseup', stopResize)
    }

    function startResize (e: MouseEvent) {
        resizing.value = true
        onResizingChange?.(true)
        startX.value = e.clientX
        startWidth.value = editorImmersiveDrawer.value.width
        document.addEventListener('mousemove', handleResize)
        document.addEventListener('mouseup', stopResize)
    }

    function onWindowResize () {
        windowWidth.value = window.innerWidth
    }

    watch(() => route.name, () => {
        drawersStore.clearEditorImmersiveViewStack()
    })

    onMounted(() => {
        drawersStore.setEditorImmersiveActive(true)
        window.addEventListener('resize', onWindowResize)
    })

    onUnmounted(() => {
        drawersStore.setEditorImmersiveActive(false)
        drawersStore.clearEditorImmersiveViewStack()
        window.removeEventListener('resize', onWindowResize)
        document.removeEventListener('mousemove', handleResize)
        document.removeEventListener('mouseup', stopResize)
    })

    return {
        drawersStore,
        editorImmersiveDrawer,
        isResizing,
        drawerStyle,
        hasStackedView,
        currentStackView,
        stackedActions,
        startResize
    }
}
