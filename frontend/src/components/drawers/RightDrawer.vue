<template>
    <section
        id="right-drawer"
        v-click-outside="{handler: closeDrawer, exclude: ['right-drawer']}"
        :class="{open: rightDrawer.state, wider: rightDrawer.wider, fixed: rightDrawer.fixed, resizing: isResizing, 'manually-resized': hasManuallyResized}"
        :style="drawerStyle"
        data-el="right-drawer"
    >
        <div
            class="resize-bar"
            @mousedown="startResize"
        />
        <div v-if="rightDrawer?.header" class="header flex items-center justify-between p-4 border-b gap-2">
            <div class="title clipped-overflow" data-el="right-drawer-header-title">
                <h1 class="text-xl font-semibold mb-0" :title="rightDrawer.header.title">{{ rightDrawer.header.title }}</h1>
            </div>
            <div class="actions flex flex-row gap-2">
                <ff-button
                    v-for="(action, $key) in actions"
                    :key="action.label + $key"
                    :kind="action.kind ?? 'secondary'"
                    :disabled="typeof action.disabled === 'function' ? action.disabled() : action.disabled"
                    :has-left-icon="!!action.iconLeft"
                    v-bind="action.bind"
                    @click="action.handler"
                >
                    <template v-if="!!action.iconLeft" #icon-left>
                        <component :is="action.iconLeft" />
                    </template>
                    {{ action.label }}
                </ff-button>
            </div>
        </div>
        <component
            :is="rightDrawer.component"
            v-if="rightDrawer.component"
            v-bind="rightDrawer.props"
            v-on="rightDrawer.on ?? {}"
        />
    </section>
</template>

<script>
import { mapActions, mapState } from 'vuex'

const DRAWER_MIN_WIDTH = 310
const DRAWER_DEFAULT_WIDTH = 400
const DRAWER_MAX_VIEWPORT_MARGIN = 200
const DRAWER_MAX_WIDTH_RATIO = 0.9
const DRAWER_MAX_PINNED_WIDTH_RATIO = 0.5
const VIEWPORT_PIN_THRESHOLD = 768

export default {
    name: 'RightDrawer',
    provide () {
        return {
            togglePinWithWidth: this.togglePinWithWidth,
            shouldAllowPinning: () => this.shouldAllowPinning
        }
    },
    data () {
        return {
            drawerWidth: DRAWER_DEFAULT_WIDTH,
            isResizing: false,
            hasManuallyResized: false,
            viewportWidth: window.innerWidth,
            resizeDebounceTimer: null
        }
    },
    computed: {
        ...mapState('ux/drawers', ['rightDrawer']),
        shouldAllowPinning () {
            return this.viewportWidth >= VIEWPORT_PIN_THRESHOLD
        },
        actions () {
            return (this.rightDrawer?.header?.actions ?? [])
                .filter(action => {
                    if (typeof action.hidden === 'function') {
                        return !action.hidden()
                    }

                    return !action.hidden
                })
        },
        drawerStyle () {
            if (this.rightDrawer.state) {
                return {
                    width: `${this.drawerWidth}px`
                }
            }
            return {}
        }
    },
    watch: {
        'rightDrawer.state': {
            handler (isOpen) {
                const onEsc = (e) => {
                    // Don't close on ESC if drawer is pinned
                    if (e.key === 'Escape' && !this.rightDrawer.pinned) {
                        this.closeRightDrawer()
                    }
                }
                if (isOpen) {
                    window.addEventListener('keydown', onEsc)
                } else {
                    window.removeEventListener('keydown', onEsc)
                }
            }
        },
        'rightDrawer.fixed': {
            handler (isFixed) {
                if (!isFixed) {
                    // Reset to default width when unpinning
                    this.drawerWidth = DRAWER_DEFAULT_WIDTH
                }
                // When pinning, width is captured in togglePinWithWidth method
            }
        },
        'rightDrawer.wider': {
            handler (shouldBeWider) {
                if (shouldBeWider) {
                    this.$nextTick(() => {
                        this.autoWidenDrawer()
                    })
                }
            },
            immediate: true
        }
    },
    mounted () {
        // Add viewport resize listener
        window.addEventListener('resize', this.onViewportResize)
    },
    beforeUnmount () {
        // Clean up resize listeners
        window.removeEventListener('resize', this.onViewportResize)
        document.removeEventListener('mousemove', this.handleResize)
        document.removeEventListener('mouseup', this.stopResize)
        if (this.resizeDebounceTimer) {
            clearTimeout(this.resizeDebounceTimer)
        }
    },
    methods: {
        ...mapActions('ux/drawers', ['closeRightDrawer', 'togglePinDrawer']),
        closeDrawer () {
            if (this.rightDrawer.state && this.rightDrawer.closeOnClickOutside) {
                this.closeRightDrawer()
            }
        },
        onViewportResize () {
            // Debounce resize events
            if (this.resizeDebounceTimer) {
                clearTimeout(this.resizeDebounceTimer)
            }
            this.resizeDebounceTimer = setTimeout(() => {
                this.handleViewportResize()
            }, 300)
        },
        handleViewportResize () {
            this.viewportWidth = window.innerWidth

            // Reset manual resize flag on small viewports where CSS should control width
            if (this.viewportWidth < VIEWPORT_PIN_THRESHOLD) {
                this.hasManuallyResized = false
            }

            // If viewport is too small and drawer is pinned, auto-unpin
            if (this.viewportWidth < VIEWPORT_PIN_THRESHOLD && this.rightDrawer.fixed) {
                this.togglePinDrawer()
                return
            }

            // If drawer is pinned, enforce 50% max width constraint
            if (this.rightDrawer.fixed) {
                const maxPinnedWidth = this.viewportWidth * DRAWER_MAX_PINNED_WIDTH_RATIO
                if (this.drawerWidth > maxPinnedWidth) {
                    this.drawerWidth = maxPinnedWidth
                }
            }
        },
        togglePinWithWidth () {
            // Capture current width before toggling
            if (!this.rightDrawer.fixed && this.$el) {
                const currentWidth = this.$el.getBoundingClientRect().width
                if (currentWidth > 0) {
                    this.drawerWidth = currentWidth
                }
            }
            this.togglePinDrawer()
        },
        autoWidenDrawer () {
            const viewportWidth = window.innerWidth

            // Calculate target width (45vw, same as CSS .wider class)
            const targetWidth = viewportWidth * 0.45

            // Calculate max allowed width
            const maxWidth = Math.min(
                viewportWidth * DRAWER_MAX_WIDTH_RATIO, // 90%
                viewportWidth - DRAWER_MAX_VIEWPORT_MARGIN // viewport - 200px
            )

            // Only widen if current width is less than target
            const newWidth = Math.min(targetWidth, maxWidth)
            if (this.drawerWidth < newWidth) {
                this.drawerWidth = newWidth
            }
        },
        startResize (event) {
            this.isResizing = true
            this.hasManuallyResized = true
            document.addEventListener('mousemove', this.handleResize)
            document.addEventListener('mouseup', this.stopResize)
            event.preventDefault()
        },
        handleResize (event) {
            if (!this.isResizing) return

            const viewportWidth = window.innerWidth
            const newWidth = viewportWidth - event.clientX

            // Calculate constraints
            let maxWidth = Math.min(
                viewportWidth * DRAWER_MAX_WIDTH_RATIO,
                viewportWidth - DRAWER_MAX_VIEWPORT_MARGIN
            )

            // If viewport >= 768px, enforce 50% max width constraint
            if (viewportWidth >= VIEWPORT_PIN_THRESHOLD) {
                const maxPinnedWidth = viewportWidth * DRAWER_MAX_PINNED_WIDTH_RATIO
                maxWidth = Math.min(maxWidth, maxPinnedWidth)
            }

            // Apply constraints
            this.drawerWidth = Math.max(
                DRAWER_MIN_WIDTH,
                Math.min(newWidth, maxWidth)
            )
        },
        stopResize () {
            this.isResizing = false
            document.removeEventListener('mousemove', this.handleResize)
            document.removeEventListener('mouseup', this.stopResize)
        }
    }
}
</script>

<style scoped lang="scss">
#right-drawer {
    position: absolute;
    border-left: 1px solid $ff-grey-300;
    background: $ff-grey-50;
    height: calc(100% - 60px);
    top: 60px;
    right: -1000px;
    z-index: 110;
    width: 100%;
    max-width: 0;
    min-width: 0;
    transition: right .3s ease-in-out, width .3s ease-in-out, max-width .3s ease-in-out, min-width .3s ease-in-out, box-shadow .3s ease-in-out, border-color .3s ease-in-out;
    box-shadow: -5px 4px 8px -4px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden; // Changed from auto to hidden - let child components handle their own scrolling

    // Hide border when closed to prevent visible grey line
    &:not(.open) {
        border-left-color: transparent;
    }

    .resize-bar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 6px;
        cursor: ew-resize;
        background: transparent;
        z-index: 1001;

        &:hover {
            width: 8px;
            left: 0;
        }
    }

    .header {
        background: white;
        flex-shrink: 0;
    }

    &.open {
        right: 0;
        width: 100%;

        // On small viewports: use 100% width (no minimum)
        max-width: 100vw;
        min-width: 0;

        // On viewports >= 400px: use 30vw with 400px minimum
        @media (min-width: 400px) {
            max-width: 30vw;
            min-width: 400px;

            &.wider {
                max-width: 45vw;
            }
        }
    }

    &.fixed {
        position: relative; // Changed from initial to relative for resize bar positioning
        height: 100%;
        top: 0; // Reset top offset to prevent gap at top
        box-shadow: none; // Remove shadow when pinned
        flex-shrink: 0; // Prevent flex from shrinking the drawer below its set width
        min-width: unset; // Remove responsive min-width constraint
        max-width: none; // Remove responsive max-width constraint

        // Hide drawer when pinned but closed to prevent grey block
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
        transition: none; // Disable transition while actively resizing for smooth dragging
        max-width: none !important; // Remove max-width constraint to allow free resizing
        min-width: unset !important; // Remove min-width constraint to allow free resizing
    }

    &.manually-resized {
        max-width: none !important; // Keep custom width after manual resize
        min-width: unset !important; // Keep custom width after manual resize
    }
}
</style>
