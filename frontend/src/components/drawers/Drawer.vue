<template>
    <section
        id="platform-drawer"
        ref="rootEl"
        v-click-outside="{handler: handleClickOutside, exclude: ['platform-drawer']}"
        :class="[
            `drawer drawer--${drawer.side}`,
            {
                open: drawer.state,
                fixed: isPinned,
                wider: topEntry?.wider,
                resizing: isResizing,
                'manually-resized': hasManuallyResized,
                pinning: isPinning,
                opening: isOpening && !isPinning,
                closing: isClosing,
                'has-stack': drawer.stack.length > 0
            }
        ]"
        :style="drawerStyle"
        :data-el="`${drawer.side}-drawer`"
    >
        <div
            class="resize-bar"
            @mousedown="startResize"
        />

        <div v-if="topEntry?.header" class="header flex items-center justify-between p-4 border-b gap-2">
            <button
                v-if="canGoBack"
                class="back-button mr-2"
                title="Back"
                aria-label="Back"
                @click="closeDrawer()"
            >
                <ArrowLeftIcon class="ff-icon" />
            </button>
            <div class="title clipped-overflow" :data-el="`${drawer.side}-drawer-header-title`">
                <h1 class="text-xl font-semibold mb-0" :title="topEntry.header.title">{{ topEntry.header.title }}</h1>
            </div>
            <div class="actions flex flex-row gap-2 items-center">
                <ff-button
                    v-for="(action, $key) in headerActions"
                    :key="action.label + $key"
                    :kind="action.kind ?? 'secondary'"
                    :disabled="typeof action.disabled === 'function' ? action.disabled() : action.disabled"
                    :has-left-icon="!!action.iconLeft"
                    v-bind="action.bind"
                    :title="typeof action.tooltip === 'function' ? action.tooltip() : action.tooltip"
                    @click="action.handler"
                >
                    <template v-if="!!action.iconLeft" #icon-left>
                        <component :is="action.iconLeft" />
                    </template>
                    {{ action.label }}
                </ff-button>
                <button
                    class="header-close-button"
                    title="Close drawer"
                    aria-label="Close drawer"
                    @click="closeDrawer()"
                >
                    <XIcon class="ff-icon" />
                </button>
            </div>
        </div>

        <!-- Default slot fallback (e.g. EditorPanel). Wrapper uses display:contents
             so it doesn't paint the drawer's grey behind the slot during open/close
             transitions; the slot child becomes a direct flex item of .drawer.
             Kept mounted (v-show) when a stack overlay is on top so the slot's
             component state survives. -->
        <div v-if="hasSlotContent" v-show="!topEntry" class="drawer-slot">
            <slot />
        </div>

        <!-- Stack overlay: render only the top entry. -->
        <div v-if="topEntry" class="drawer-stack-top">
            <component
                :is="topEntry.component"
                v-bind="topEntry.props"
                v-on="topEntry.on || {}"
            />
        </div>
    </section>
</template>

<script setup>
import { ArrowLeftIcon } from '@heroicons/vue/outline'
import { XIcon } from '@heroicons/vue/solid'
import { storeToRefs } from 'pinia'
import { computed, defineOptions, nextTick, onBeforeUnmount, onMounted, provide, ref, useSlots, watch } from 'vue'

import { useContextStore } from '@/stores/context.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

const DRAWER_MIN_WIDTH = 310
const DRAWER_DEFAULT_WIDTH = 400
const DRAWER_MAX_VIEWPORT_MARGIN = 200
const DRAWER_MAX_WIDTH_RATIO = 0.9
const VIEWPORT_PIN_THRESHOLD = 768

// Animation/transition timing
const TRANSITION_OPEN_CLOSE_MS = 350
const TRANSITION_PIN_MS = 50
const EXPERT_AUTO_PIN_DELAY_MS = 25
const EXPERT_AUTO_PIN_SETTLE_MS = 200
const VIEWPORT_RESIZE_DEBOUNCE_MS = 300
const PIN_RESIZE_SETTLE_MS = 300

defineOptions({ name: 'PlatformDrawer' })

const emit = defineEmits(['resizing'])

const slots = useSlots()

const drawersStore = useUxDrawersStore()
const { drawer } = storeToRefs(drawersStore)
const { closeDrawer, toggleDrawerPin, setDrawerWidth } = drawersStore

const contextStore = useContextStore()
const { isImmersiveEditor } = storeToRefs(contextStore)

const expertStore = useProductExpertStore()
const { openAssistantDrawer } = expertStore

const rootEl = ref(null)
const drawerWidth = ref(DRAWER_DEFAULT_WIDTH)
const isResizing = ref(false)
const hasManuallyResized = ref(false)
const viewportWidth = ref(window.innerWidth)
const isPinning = ref(false)
const isOpening = ref(false)
const isClosing = ref(false)
let resizeDebounceTimer = null
let resizeStartX = 0
let resizeStartWidth = 0

const topEntry = computed(() => {
    const stack = drawer.value.stack
    return stack.length > 0 ? stack[stack.length - 1] : null
})

// The drawer is "pinned" (= position: relative, flex sibling).
// Single source of truth: drawer.pinned in the store. Push actions that want
// to open pinned (e.g. ExpertDrawer with fixed:true) sync drawer.pinned at
// push time — see openDrawer in the store.
const isPinned = computed(() => drawer.value.pinned)

// Whether the consumer provided slot fallback content (e.g. an editor's
// tabs panel). Used to decide whether popping the last stack entry should
// auto-close the drawer.
const hasSlotContent = computed(() => !!slots.default)

// Show the back button when there's somewhere to go back to:
//  - More than one stack entry, OR
//  - One entry with slot content underneath
const canGoBack = computed(() => {
    const len = drawer.value.stack.length
    return len > 1 || (len === 1 && hasSlotContent.value)
})

const shouldAllowPinning = computed(() => viewportWidth.value >= VIEWPORT_PIN_THRESHOLD)

const headerActions = computed(() => {
    return (topEntry.value?.header?.actions ?? [])
        .filter(action => {
            if (typeof action.hidden === 'function') return !action.hidden()
            return !action.hidden
        })
})

const drawerStyle = computed(() => {
    const wantsWidth = drawer.value.state || isClosing.value || isPinned.value
    if (wantsWidth && (viewportWidth.value >= 480 || hasManuallyResized.value || isPinned.value)) {
        return { width: `${drawerWidth.value}px` }
    }
    return {}
})

provide('togglePinWithWidth', togglePinWithWidth)
provide('shouldAllowPinning', () => shouldAllowPinning.value)

watch(() => drawer.value.stack.length, (newLen, oldLen) => {
    // Stack just emptied. If there's no slot fallback to render (e.g.
    // when a snapshot was opened from a non-editor page), auto-close
    // the drawer. Editor pages provide slot content so the drawer stays
    // open and the slot becomes visible again.
    if (newLen === 0 && oldLen > 0 && !hasSlotContent.value && drawer.value.state) {
        closeDrawer()
    }
})

watch(() => drawer.value.state, (isOpen, wasOpen) => {
    let reopenExpert = false
    const isExpertDrawer = topEntry.value?.component?.name === 'ExpertDrawer'
    if (!isOpen && wasOpen && !isExpertDrawer) {
        reopenExpert = drawer.value.expertState?.pinned && drawer.value.expertState?.open
    }
    if (isOpen && !wasOpen) {
        isOpening.value = true
        isClosing.value = false
        isPinning.value = isExpertDrawer && isPinned.value
        setTimeout(() => { isOpening.value = false }, TRANSITION_OPEN_CLOSE_MS)
    }
    if (!isOpen && wasOpen) {
        isClosing.value = true
        setTimeout(() => {
            isClosing.value = false
            if (reopenExpert) {
                openAssistantDrawer({ openPinned: true })
            }
        }, TRANSITION_OPEN_CLOSE_MS)
    }
    if (!isOpen) {
        hasManuallyResized.value = false
        isOpening.value = false
    }
    const onEsc = (e) => {
        if (e.key === 'Escape' && !drawer.value.pinned) {
            closeDrawer()
        }
    }
    if (isOpen) window.addEventListener('keydown', onEsc)
    else window.removeEventListener('keydown', onEsc)
})

function handleClickOutside () {
    if (drawer.value.state && topEntry.value?.closeOnClickOutside) {
        closeDrawer()
    }
}

function onViewportResize () {
    if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer)
    resizeDebounceTimer = setTimeout(() => handleViewportResize(), VIEWPORT_RESIZE_DEBOUNCE_MS)
}

function handleViewportResize () {
    viewportWidth.value = window.innerWidth
    if (viewportWidth.value < 480) {
        hasManuallyResized.value = false
        drawerWidth.value = DRAWER_DEFAULT_WIDTH
    }
    if (viewportWidth.value < VIEWPORT_PIN_THRESHOLD && isPinned.value) {
        toggleDrawerPin()
        return
    }
    const maxWidth = computeMaxWidth()
    if (drawerWidth.value > maxWidth) drawerWidth.value = maxWidth
}

function computeMaxWidth () {
    const vw = viewportWidth.value
    if (vw < VIEWPORT_PIN_THRESHOLD) {
        return vw * DRAWER_MAX_WIDTH_RATIO
    }
    // Same cap whether pinned (flex sibling) or unpinned (overlay):
    // 90% of viewport, minus a 200px margin so the iframe always has
    // some breathing room. The old RightDrawer had an extra 50% cap on
    // pinned mode; the immersive editor never used that and it felt
    // restrictive — keep the looser cap consistent across both modes.
    return Math.min(vw * DRAWER_MAX_WIDTH_RATIO, vw - DRAWER_MAX_VIEWPORT_MARGIN)
}

function togglePinWithWidth () {
    if (!isPinned.value && rootEl.value) {
        const actualWidth = rootEl.value.getBoundingClientRect().width
        const maxPinnedWidth = computeMaxWidth()
        const constrainedWidth = Math.min(actualWidth, maxPinnedWidth)
        const needsResize = actualWidth > maxPinnedWidth

        if (needsResize) {
            drawerWidth.value = constrainedWidth
            setTimeout(() => {
                isPinning.value = true
                nextTick(() => {
                    toggleDrawerPin()
                    setTimeout(() => { isPinning.value = false }, TRANSITION_PIN_MS)
                })
            }, PIN_RESIZE_SETTLE_MS)
        } else {
            drawerWidth.value = constrainedWidth
            isPinning.value = true
            nextTick(() => {
                toggleDrawerPin()
                setTimeout(() => { isPinning.value = false }, TRANSITION_PIN_MS)
            })
        }
    } else {
        toggleDrawerPin()
    }
}

function startResize (event) {
    event.preventDefault()
    if (rootEl.value) {
        const actualWidth = rootEl.value.getBoundingClientRect().width
        drawerWidth.value = actualWidth
        resizeStartWidth = actualWidth
        resizeStartX = event.clientX
    }
    // Wait for Vue to apply the new width before changing the class.
    // This prevents jumping when CSS constraints are removed.
    nextTick(() => {
        isResizing.value = true
        hasManuallyResized.value = true
        // Notify the parent so it can disable pointer events on the
        // iframe — otherwise mousemove gets captured by the iframe and
        // resize stops working as soon as the cursor crosses into it.
        emit('resizing', true)
        document.addEventListener('mousemove', handleResize)
        document.addEventListener('mouseup', stopResize)
    })
}

function handleResize (event) {
    if (!isResizing.value) return
    // Drag math depends on side: left-drawer grows when dragging RIGHT,
    // right-drawer grows when dragging LEFT.
    const delta = drawer.value.side === 'left'
        ? event.clientX - resizeStartX
        : resizeStartX - event.clientX
    const newWidth = resizeStartWidth + delta
    const maxWidth = computeMaxWidth()
    const minWidth = Math.min(DRAWER_MIN_WIDTH, maxWidth * 0.8)
    drawerWidth.value = Math.max(minWidth, Math.min(newWidth, maxWidth))
}

function stopResize () {
    isResizing.value = false
    emit('resizing', false)
    setDrawerWidth({ width: drawerWidth.value })
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
}

onMounted(() => {
    // Clamp persisted width to the minimum so a stale localStorage value
    // (e.g. corrupted/dev-test data) can't make the drawer render too narrow.
    const persistedWidth = drawer.value.width || DRAWER_DEFAULT_WIDTH
    drawerWidth.value = Math.max(DRAWER_MIN_WIDTH, persistedWidth)
    window.addEventListener('resize', onViewportResize)

    // ExpertDrawer auto-restore: if the user previously had ExpertDrawer
    // pinned, re-open it on mount. Skipped while in the immersive editor —
    // the editor's slot content owns the drawer there.
    if (!isImmersiveEditor.value) {
        const openPinned = drawer.value.expertState?.open && drawer.value.expertState?.pinned
        if (openPinned && shouldAllowPinning.value) {
            isPinning.value = true
            setTimeout(() => {
                openAssistantDrawer({ openPinned: true })
                setTimeout(() => { isPinning.value = false }, EXPERT_AUTO_PIN_SETTLE_MS)
            }, EXPERT_AUTO_PIN_DELAY_MS)
        }
    }
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', onViewportResize)
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
    if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer)
})
</script>

<style lang="scss">
.drawer {
    position: fixed;
    background: $ff-grey-50;
    height: calc(100% - 60px);
    top: 60px;
    // Sits above page content/iframe, but below body-level popovers (z-50, etc.)
    // and modals (z-100+). This was z-110 on the old RightDrawer; lowered so
    // teleported popovers from ff-tabs and HeadlessUI render above the drawer
    // instead of being clipped by it.
    z-index: 20;
    // Drawer is the @container drawer for descendants — both slot content
    // (EditorPanel) and stack overlays (NotificationsDrawer, ExpertDrawer, etc.)
    // share this container so consumers like SectionTopMenu, DevicesBrowser,
    // ActionButton can use `@container drawer (...)` rules.
    container-type: inline-size;
    container-name: drawer;
    width: 100%;
    max-width: 0;
    min-width: 0;
    transition: left .3s ease-in-out, right .3s ease-in-out, width .3s ease-in-out, max-width .3s ease-in-out, min-width .3s ease-in-out, box-shadow .3s ease-in-out, border-color .3s ease-in-out;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    // Side-specific positioning ===========================================
    // Flex order keeps the drawer on the correct side regardless of its DOM
    // position. The single Drawer instance flips its side via store state.
    &--left { order: -1; }
    &--right { order: 1; }

    &--right {
        right: -1000px;
        border-left: 1px solid $ff-grey-300;
        box-shadow: -5px 4px 8px -4px rgba(0, 0, 0, 0.1);
        &:not(.open) { border-left-color: transparent; }
        @media (max-width: 479px) { border-left: none; }
        .resize-bar {
            position: absolute;
            left: -4px;
            top: 0;
            bottom: 0;
            width: 8px;
            cursor: ew-resize;
            background: transparent;
            z-index: 1001;
            @media (max-width: 479px) { display: none; }
        }
    }

    &--left {
        left: -1000px;
        border-right: 1px solid $ff-grey-300;
        box-shadow: 5px 4px 8px -4px rgba(0, 0, 0, 0.1);
        &:not(.open) { border-right-color: transparent; }
        @media (max-width: 479px) { border-right: none; }
        .resize-bar {
            position: absolute;
            right: -4px;
            top: 0;
            bottom: 0;
            width: 8px;
            cursor: ew-resize;
            background: transparent;
            z-index: 1001;
            @media (max-width: 479px) { display: none; }
        }
    }

    .header {
        background: white;
        flex-shrink: 0;
    }

    .back-button,
    .header-close-button {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: $ff-grey-700;
        display: flex;
        align-items: center;
        border-radius: 4px;
        &:hover { background: $ff-grey-100; }
    }

    // The slot wrapper is structurally invisible (display: contents) so the slot
    // child becomes a direct flex item of .drawer — no extra wrapper paints the
    // drawer's grey background behind it during open/close transitions.
    .drawer-slot { display: contents; }

    // Stack overlay wrapper for push/pop drawer entries (snapshots, notifications,
    // expert). overflow: visible so popovers from ff-tabs/HeadlessUI aren't
    // clipped. Container queries are scoped at .drawer above.
    .drawer-stack-top {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: visible;
    }

    &.open {
        width: 100%;
        max-width: 100vw;
        min-width: 0;

        @media (min-width: 480px) and (max-width: 767px) {
            min-width: 480px;
            max-width: none;
        }
        @media (min-width: 768px) {
            max-width: 90vw;
            min-width: 480px;
            &.wider { max-width: 90vw; }
        }
    }
    &--right.open { right: 0; }
    &--left.open { left: 0; }

    &.fixed {
        position: relative;
        height: 100%;
        top: 0;
        box-shadow: none;
        flex-shrink: 0;
        min-width: unset;
        max-width: none;

        &:not(.open) {
            width: 0 !important;
            min-width: 0 !important;
            max-width: 0 !important;
            overflow: hidden;
            opacity: 0;
            pointer-events: none;
        }
    }

    &.resizing {
        transition: none;
        max-width: none !important;
        min-width: unset !important;
    }

    &.manually-resized {
        max-width: none !important;
        min-width: unset !important;
    }

    &.pinning {
        transition: none !important;
    }

    &--right.opening,
    &--right.closing {
        transition: right .3s ease-in-out, box-shadow .3s ease-in-out, border-color .3s ease-in-out !important;
    }
    &--left.opening,
    &--left.closing {
        transition: left .3s ease-in-out, box-shadow .3s ease-in-out, border-color .3s ease-in-out !important;
    }
    &.closing {
        max-width: none !important;
        min-width: unset !important;
    }
}
</style>
