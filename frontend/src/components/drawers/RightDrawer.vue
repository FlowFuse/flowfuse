<template>
    <section
        id="right-drawer"
        v-click-outside="{handler: closeDrawer, exclude: ['right-drawer']}"
        :class="{open: rightDrawer.state, wider: rightDrawer.wider, fixed: rightDrawer.fixed}"
        :style="drawerStyle"
        data-el="right-drawer"
    >
        <div
            v-if="rightDrawer.fixed"
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

export default {
    name: 'RightDrawer',
    data () {
        return {
            drawerWidth: DRAWER_DEFAULT_WIDTH,
            isResizing: false
        }
    },
    computed: {
        ...mapState('ux/drawers', ['rightDrawer']),
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
            if (this.rightDrawer.fixed && this.rightDrawer.state) {
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
                isOpen ? window.addEventListener('keydown', onEsc) : window.removeEventListener('keydown', onEsc)
            }
        },
        'rightDrawer.fixed': {
            handler (isFixed) {
                // Reset to default width when toggling fixed mode
                if (!isFixed) {
                    this.drawerWidth = DRAWER_DEFAULT_WIDTH
                }
            }
        }
    },
    methods: {
        ...mapActions('ux/drawers', ['closeRightDrawer']),
        closeDrawer () {
            if (this.rightDrawer.state && this.rightDrawer.closeOnClickOutside) {
                this.closeRightDrawer()
            }
        },
        startResize (event) {
            this.isResizing = true
            document.addEventListener('mousemove', this.handleResize)
            document.addEventListener('mouseup', this.stopResize)
            event.preventDefault()
        },
        handleResize (event) {
            if (!this.isResizing) return

            const viewportWidth = window.innerWidth
            const newWidth = viewportWidth - event.clientX

            // Calculate constraints
            const maxWidth = Math.min(
                viewportWidth * DRAWER_MAX_WIDTH_RATIO,
                viewportWidth - DRAWER_MAX_VIEWPORT_MARGIN
            )

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
    },
    beforeUnmount () {
        // Clean up resize listeners
        document.removeEventListener('mousemove', this.handleResize)
        document.removeEventListener('mouseup', this.stopResize)
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
    transition: ease-in-out .3s;
    box-shadow: -5px 0px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden; // Changed from auto to hidden - let child components handle their own scrolling

    .resize-bar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 6px;
        cursor: ew-resize;
        background: $ff-grey-400;
        z-index: 1001;

        &:hover {
            background: $ff-grey-600;
            width: 8px;
            left: 0;
        }

        &:active {
            background: $ff-indigo-600;
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
        position: initial;
        height: 100%;
        transition: none; // Disable transition in fixed mode for smooth resizing
        box-shadow: none; // Remove shadow when pinned
    }
}
</style>
