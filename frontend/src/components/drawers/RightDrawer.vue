<template>
    <section
        id="right-drawer"
        v-click-outside="{handler: closeDrawer, exclude: ['right-drawer']}"
        :class="{open: rightDrawer.state, wider: rightDrawer.wider, fixed: rightDrawer.fixed, resizing: isResizing, 'manually-resized': hasManuallyResized, pinning: isPinning, opening: isOpening, closing: isClosing}"
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
            resizeDebounceTimer: null,
            isPinning: false,
            isOpening: false,
            isClosing: false,
            resizeStartX: 0,
            resizeStartWidth: 0
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
            // Only apply inline width on larger viewports or when manually resized/pinned
            // On small viewports (< 480px), let CSS handle the width for responsiveness
            // Also apply during closing to maintain width during slide-out animation
            if ((this.rightDrawer.state || this.isClosing) && (this.viewportWidth >= 480 || this.hasManuallyResized || this.rightDrawer.fixed)) {
                return {
                    width: `${this.drawerWidth}px`
                }
            }
            return {}
        }
    },
    watch: {
        'rightDrawer.state': {
            handler (isOpen, wasOpen) {
                // Set opening flag when drawer opens
                if (isOpen && !wasOpen) {
                    this.isOpening = true
                    this.isClosing = false
                    // Clear opening flag after slide animation completes
                    setTimeout(() => {
                        this.isOpening = false
                    }, 350)
                }

                // Set closing flag when drawer closes
                if (!isOpen && wasOpen) {
                    this.isClosing = true
                    // Clear closing flag after slide animation completes
                    setTimeout(() => {
                        this.isClosing = false
                    }, 350)
                }

                // Reset manual resize flag when drawer closes to prevent width expansion
                if (!isOpen) {
                    this.hasManuallyResized = false
                    this.isOpening = false
                }

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
            handler (isFixed, wasFixed) {
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
            if (this.viewportWidth < 480) {
                this.hasManuallyResized = false
                this.drawerWidth = DRAWER_DEFAULT_WIDTH
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
            } else if (this.viewportWidth >= 480) {
                // For overlay mode on viewports >= 480px, enforce max width constraint
                // (Below 480px, CSS handles the width)
                let maxWidth

                if (this.viewportWidth >= VIEWPORT_PIN_THRESHOLD) {
                    // Large viewports: apply both 90% and viewport margin constraints
                    maxWidth = Math.min(
                        this.viewportWidth * DRAWER_MAX_WIDTH_RATIO,
                        this.viewportWidth - DRAWER_MAX_VIEWPORT_MARGIN
                    )
                } else {
                    // Medium viewports (480-767px): only apply 90% constraint
                    maxWidth = this.viewportWidth * DRAWER_MAX_WIDTH_RATIO
                }

                if (this.drawerWidth > maxWidth) {
                    this.drawerWidth = maxWidth
                }
            }
        },
        togglePinWithWidth () {
            if (!this.rightDrawer.fixed && this.$el) {
                // Capture the current actual width to maintain visual continuity
                const actualWidth = this.$el.getBoundingClientRect().width

                // Apply pinned mode constraint (50% max width)
                const maxPinnedWidth = this.viewportWidth * DRAWER_MAX_PINNED_WIDTH_RATIO
                const constrainedWidth = Math.min(actualWidth, maxPinnedWidth)
                const needsResize = actualWidth > maxPinnedWidth

                if (needsResize) {
                    // Drawer needs to shrink - animate the resize first
                    this.drawerWidth = constrainedWidth

                    // Wait for resize animation to complete (~300ms based on CSS transition)
                    setTimeout(() => {
                        // Now disable transitions briefly for the pin state change
                        this.isPinning = true

                        this.$nextTick(() => {
                            this.togglePinDrawer()

                            // Re-enable transitions
                            setTimeout(() => {
                                this.isPinning = false
                            }, 50)
                        })
                    }, 300)
                } else {
                    // No resize needed - use original logic
                    this.drawerWidth = constrainedWidth

                    // Disable transitions temporarily to prevent jump
                    this.isPinning = true

                    // Wait a frame for the width to be applied
                    this.$nextTick(() => {
                        this.togglePinDrawer()

                        // Re-enable transitions after a brief delay
                        setTimeout(() => {
                            this.isPinning = false
                        }, 50)
                    })
                }
            } else {
                this.togglePinDrawer()
            }
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
            event.preventDefault()

            // Capture the current actual displayed width and mouse position
            if (this.$el) {
                const actualWidth = this.$el.getBoundingClientRect().width
                this.drawerWidth = actualWidth
                this.resizeStartWidth = actualWidth
                this.resizeStartX = event.clientX
            }

            // Wait for Vue to apply the new width before changing the class
            // This prevents jumping when CSS constraints are removed
            this.$nextTick(() => {
                this.isResizing = true
                this.hasManuallyResized = true
                document.addEventListener('mousemove', this.handleResize)
                document.addEventListener('mouseup', this.stopResize)
            })
        },
        handleResize (event) {
            if (!this.isResizing) return

            const viewportWidth = window.innerWidth

            // Calculate drag delta (negative because dragging left increases width)
            const delta = this.resizeStartX - event.clientX
            const newWidth = this.resizeStartWidth + delta

            // Calculate constraints
            let maxWidth

            if (viewportWidth >= VIEWPORT_PIN_THRESHOLD) {
                // On large viewports (>= 768px): different constraints for overlay vs pinned
                if (this.rightDrawer.fixed) {
                    // Pinned mode: apply 50% max width
                    maxWidth = Math.min(
                        viewportWidth * DRAWER_MAX_WIDTH_RATIO,
                        viewportWidth - DRAWER_MAX_VIEWPORT_MARGIN,
                        viewportWidth * DRAWER_MAX_PINNED_WIDTH_RATIO
                    )
                } else {
                    // Overlay mode: apply 90% max width with viewport margin
                    maxWidth = Math.min(
                        viewportWidth * DRAWER_MAX_WIDTH_RATIO,
                        viewportWidth - DRAWER_MAX_VIEWPORT_MARGIN
                    )
                }
            } else {
                // On small viewports (< 768px): only apply 90% max width, no margin constraint
                maxWidth = viewportWidth * DRAWER_MAX_WIDTH_RATIO
            }

            // Use responsive minimum: smaller viewports allow smaller drawers
            // This prevents min-width from conflicting with max-width in small viewports
            const minWidth = Math.min(DRAWER_MIN_WIDTH, maxWidth * 0.8)

            // Apply constraints
            const finalWidth = Math.max(
                minWidth,
                Math.min(newWidth, maxWidth)
            )

            this.drawerWidth = finalWidth
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

    // Hide border on small viewports where drawer is full-width
    @media (max-width: 479px) {
        border-left: none;
    }

    .resize-bar {
        position: absolute;
        left: -4px; // Center on border (50% of 8px width)
        top: 0;
        bottom: 0;
        width: 8px;
        cursor: ew-resize;
        background: transparent;
        z-index: 1001;

        // Hide resize bar on small viewports where drawer is full-width
        @media (max-width: 479px) {
            display: none;
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

        // On viewports 480-767px: use 480px minimum but no max-width constraint
        // (pinning is disabled, so let JS control the width)
        @media (min-width: 480px) and (max-width: 767px) {
            min-width: 480px;
            max-width: none;
        }

        // On viewports >= 768px: apply max-width constraints (pinning is enabled)
        @media (min-width: 768px) {
            max-width: 90vw;
            min-width: 480px;

            &.wider {
                max-width: 90vw;
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

    &.pinning {
        transition: none !important; // Disable all transitions while pinning to prevent visual jump
    }

    &.opening {
        // Only animate position during open, not width changes
        transition: right .3s ease-in-out, box-shadow .3s ease-in-out, border-color .3s ease-in-out !important;
    }

    &.closing {
        // Only animate position during close, not width changes
        transition: right .3s ease-in-out, box-shadow .3s ease-in-out, border-color .3s ease-in-out !important;

        // Maintain current width/max-width/min-width during slide-out to prevent shrinking animation
        // These will be overridden by inline styles from drawerStyle
        max-width: none !important;
        min-width: unset !important;
    }
}
</style>
