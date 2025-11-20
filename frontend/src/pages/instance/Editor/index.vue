<template>
    <div class="ff-editor-wrapper" :class="{resizing: drawer.resizing, 'pinned-drawer': drawer.pinned}">
        <DrawerTrigger :is-hidden="drawer.open" @toggle="toggleDrawer" />

        <section
            class="tabs-wrapper drawer"
            :class="{'open': drawer.open, 'pinned': drawer.pinned, resizing: drawer.resizing, 'manually-resized': hasManuallyResized, pinning: isPinning, opening: isOpening, closing: isClosing}"
            :style="{ width: drawerWidth + 'px' }"
            data-el="tabs-drawer"
            @mouseenter="handleDrawerMouseEnter"
            @mouseleave="handleDrawerMouseLeave"
        >
            <resize-bar
                @mousedown="startResize"
            />

            <div class="header">
                <div class="logo">
                    <router-link title="Back to instance overview" :to="{ name: 'instance-overview', params: {id: instance.id} }">
                        <ArrowLeftIcon class="ff-btn--icon" />
                    </router-link>
                </div>
                <ff-tabs :tabs="navigation" class="tabs" />
                <div class="side-actions">
                    <DashboardLink
                        v-if="instance.settings?.dashboard2UI" :instance="instance"
                        :disabled="!editorAvailable"
                    />
                    <InstanceActionsButton :instance="instance" @instance-deleted="onInstanceDelete" />
                    <button
                        v-if="shouldAllowPinning"
                        :title="drawer.pinned ? 'Unpin drawer' : 'Pin drawer open'"
                        type="button"
                        class="pin-drawer-button"
                        :class="{ 'is-pinned': drawer.pinned }"
                        aria-label="Pin drawer"
                        data-el="drawer-pin-button"
                        @click="togglePinWithWidth"
                    >
                        <LockClosedIcon v-if="drawer.pinned" class="ff-btn--icon" />
                        <LockOpenIcon v-else class="ff-btn--icon" />
                    </button>
                    <button
                        title="Close drawer"
                        type="button"
                        class="close-drawer-button"
                        aria-label="Close drawer"
                        @click="toggleDrawer"
                    >
                        <XIcon class="ff-btn--icon" />
                    </button>
                </div>
            </div>

            <ff-page :no-padding="isExpertRoute">
                <router-view
                    :instance="instance"
                    :is-visiting-admin="isVisitingAdmin"
                    @instance-updated="loadInstance"
                    @instance-confirm-delete="showConfirmDeleteDialog"
                    @instance-confirm-suspend="showConfirmSuspendDialog"
                />
            </ff-page>
        </section>

        <EditorWrapper :instance="instance" :disable-events="drawer.resizing" @toggle-drawer="toggleDrawer" @iframe-loaded="notifyDrawerState" @request-drawer-state="notifyDrawerState" />

        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" :instance="instance" @confirm="onInstanceDelete" />

        <InstanceStatusPolling
            :instance="instance"
            @instance-updated="instanceUpdated"
        />
    </div>
</template>

<script>
import { ArrowLeftIcon, LockClosedIcon, LockOpenIcon, XIcon } from '@heroicons/vue/solid'
import { mapGetters } from 'vuex'

import InstanceStatusPolling from '../../../components/InstanceStatusPolling.vue'
import ExpertTabIcon from '../../../components/icons/ff-minimal-grey.js'
import InstanceActionsButton from '../../../components/instance/ActionButton.vue'
import usePermissions from '../../../composables/Permissions.js'

import FfPage from '../../../layouts/Page.vue'
import featuresMixin from '../../../mixins/Features.js'
import instanceMixin from '../../../mixins/Instance.js'
import { Roles } from '../../../utils/roles.js'
import ConfirmInstanceDeleteDialog from '../Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import DashboardLink from '../components/DashboardLink.vue'

import DrawerTrigger from './components/DrawerTrigger.vue'
import EditorWrapper from './components/EditorWrapper.vue'
import ResizeBar from './components/drawer/ResizeBar.vue'

// Drawer size constraints
const DRAWER_MIN_WIDTH = 310 // Minimum drawer width in pixels
const DRAWER_DEFAULT_WIDTH = 560 // Default drawer width in pixels
const DRAWER_MAX_VIEWPORT_MARGIN = 200 // Space to preserve when drawer is at max width
const DRAWER_MAX_WIDTH_RATIO = 0.9 // Maximum drawer width as percentage of viewport (desktop)
const DRAWER_MAX_PINNED_WIDTH_RATIO = 0.5 // Maximum drawer width when pinned (50% of viewport)
const DRAWER_MOBILE_BREAKPOINT = 640 // Viewport width below which mobile layout applies
const VIEWPORT_PIN_THRESHOLD = 768 // Viewport width below which pinning is disabled

export default {
    name: 'InstanceEditor',
    components: {
        ArrowLeftIcon,
        LockClosedIcon,
        LockOpenIcon,
        ConfirmInstanceDeleteDialog,
        InstanceActionsButton,
        DashboardLink,
        EditorWrapper,
        DrawerTrigger,
        InstanceStatusPolling,
        XIcon,
        FfPage,
        ResizeBar
    },
    mixins: [instanceMixin, featuresMixin],
    provide () {
        return {
            togglePinWithWidth: this.togglePinWithWidth,
            shouldAllowPinning: () => this.shouldAllowPinning
        }
    },
    setup () {
        const { hasAMinimumTeamRoleOf, isVisitingAdmin } = usePermissions()

        return { hasAMinimumTeamRoleOf, isVisitingAdmin }
    },
    data () {
        return {
            drawer: {
                open: false,
                pinned: false,
                resizing: false,
                startX: 0,
                startWidth: 0,
                width: 0,
                defaultWidth: DRAWER_DEFAULT_WIDTH
            },
            viewportWidth: window.innerWidth,
            isMouseInDrawer: false,
            teaseCloseTimeout: null,
            isInitialTease: false,
            isPinning: false,
            isOpening: false,
            isClosing: false,
            hasManuallyResized: false,
            resizeDebounceTimer: null
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck']),
        navigation () {
            if (!this.instance.id) return []
            let versionHistoryRoute
            if (!this.isTimelineFeatureEnabled) {
                versionHistoryRoute = {
                    name: 'instance-editor-snapshots',
                    params: { id: this.instance.id }
                }
            } else {
                versionHistoryRoute = {
                    name: 'instance-editor-version-history',
                    params: { id: this.instance.id }
                }
            }
            return [
                {
                    label: 'Expert',
                    to: { name: 'instance-editor-expert', params: { id: this.instance.id } },
                    tag: 'instance-expert',
                    icon: ExpertTabIcon,
                    hidden: !this.featuresCheck.isExpertAssistantFeatureEnabled
                },
                {
                    label: 'Overview',
                    to: { name: 'instance-editor-overview', params: { id: this.instance.id } },
                    tag: 'instance-overview'
                },
                {
                    label: 'Devices',
                    to: { name: 'instance-editor-devices', params: { id: this.instance.id } },
                    tag: 'instance-remote'
                },
                {
                    label: 'Version History',
                    to: versionHistoryRoute,
                    tag: 'instance-version-history'
                },
                {
                    label: 'Assets',
                    to: { name: 'instance-editor-assets', params: { id: this.instance.id } },
                    tag: 'instance-assets',
                    hidden: !this.hasAMinimumTeamRoleOf(Roles.Member)
                },
                {
                    label: 'Audit Log',
                    to: { name: 'instance-editor-audit-log', params: { id: this.instance.id } },
                    tag: 'instance-activity'
                },
                {
                    label: 'Node-RED Logs',
                    to: { name: 'instance-editor-logs', params: { id: this.instance.id } },
                    tag: 'instance-logs'
                },
                {
                    label: 'Settings',
                    to: { name: 'instance-editor-settings', params: { id: this.instance.id } },
                    tag: 'instance-settings'
                }
            ]
        },
        editorAvailable () {
            return !this.isHA && this.instanceRunning
        },
        shouldAllowPinning () {
            return this.viewportWidth >= VIEWPORT_PIN_THRESHOLD
        },
        drawerWidth () {
            if (this.viewportWidth < DRAWER_MOBILE_BREAKPOINT) {
                // Mobile: drawer takes up full viewport
                return Math.min(this.drawer.width, this.viewportWidth)
            }
            // Desktop: drawer can't exceed specified percentage of viewport
            return Math.min(this.drawer.width, this.viewportWidth * DRAWER_MAX_WIDTH_RATIO)
        },
        isExpertRoute () {
            return this.$route.name === 'instance-editor-expert'
        }
    },
    watch: {
        'drawer.open' (isOpen, wasOpen) {
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

            // Reset manual resize flag when drawer closes
            if (!isOpen) {
                this.hasManuallyResized = false
                this.isOpening = false
            }
        },
        'drawer.pinned' (isPinned, wasPinned) {
            if (!isPinned && wasPinned) {
                // Reset to default width when unpinning
                this.drawer.width = DRAWER_DEFAULT_WIDTH
            }
        }
    },
    mounted () {
        // Auto-open drawer after initial load, then close it to tease availability
        setTimeout(() => {
            this.isInitialTease = true
            this.toggleDrawer()
            // Close drawer after a brief moment to tease it, but only if mouse is not in drawer
            this.teaseCloseTimeout = setTimeout(() => {
                if (!this.isMouseInDrawer) {
                    this.toggleDrawer()
                }
                this.isInitialTease = false
                this.teaseCloseTimeout = null
            }, 2000)
        }, 1200)

        // Listen for viewport resize to update drawer width in real-time
        window.addEventListener('resize', this.handleResize)
    },
    unmounted () {
        window.removeEventListener('resize', this.handleResize)
        if (this.teaseCloseTimeout) {
            clearTimeout(this.teaseCloseTimeout)
        }
        if (this.resizeDebounceTimer) {
            clearTimeout(this.resizeDebounceTimer)
        }
    },
    methods: {
        toggleDrawer () {
            if (this.drawer.open) {
                this.drawer.open = false
                // Keep width at current value - drawer will slide off-screen via transform
            } else {
                this.drawer.open = true
                this.drawer.width = this.drawer.defaultWidth
            }
            // Notify iframe of drawer state change
            this.$nextTick(() => {
                this.notifyDrawerState()
            })
        },
        notifyDrawerState () {
            // Send drawer state to iframe
            const iframe = this.$el.querySelector('iframe')
            if (iframe && iframe.contentWindow) {
                // Use instance URL origin for security instead of wildcard
                const targetOrigin = this.instance.url || window.location.origin
                iframe.contentWindow.postMessage({
                    type: 'drawer-state',
                    payload: { open: this.drawer.open }
                }, targetOrigin)
            }
        },
        startResize (e) {
            e.preventDefault()

            // Capture the current actual displayed width and mouse position
            if (this.$el) {
                const drawerEl = this.$el.querySelector('.tabs-wrapper.drawer')
                if (drawerEl) {
                    const actualWidth = drawerEl.getBoundingClientRect().width
                    this.drawer.width = actualWidth
                    this.drawer.startWidth = actualWidth
                    this.drawer.startX = e.clientX
                }
            }

            // Wait for Vue to apply the new width before changing the state
            this.$nextTick(() => {
                this.drawer.resizing = true
                this.hasManuallyResized = true
                document.addEventListener('mousemove', this.resize)
                document.addEventListener('mouseup', this.stopResize)
            })
        },
        resize (e) {
            if (!this.drawer.resizing) return

            const viewportWidth = window.innerWidth

            // Calculate drag delta (positive because drawer is on left, dragging right increases width)
            const delta = e.clientX - this.drawer.startX
            const newWidth = this.drawer.startWidth + delta

            // Calculate constraints
            let maxWidth

            if (viewportWidth >= VIEWPORT_PIN_THRESHOLD) {
                // On large viewports (>= 768px): different constraints for overlay vs pinned
                if (this.drawer.pinned) {
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
            const minWidth = Math.min(DRAWER_MIN_WIDTH, maxWidth * 0.8)

            // Apply constraints
            const finalWidth = Math.max(
                minWidth,
                Math.min(newWidth, maxWidth)
            )

            this.drawer.width = finalWidth
        },
        stopResize () {
            this.drawer.resizing = false
            document.removeEventListener('mousemove', this.resize)
            document.removeEventListener('mouseup', this.stopResize)
        },
        handleResize () {
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
                this.drawer.width = DRAWER_DEFAULT_WIDTH
            }

            // If viewport is too small and drawer is pinned, auto-unpin
            if (this.viewportWidth < VIEWPORT_PIN_THRESHOLD && this.drawer.pinned) {
                this.drawer.pinned = false
                return
            }

            // If drawer is pinned, enforce 50% max width constraint
            if (this.drawer.pinned) {
                const maxPinnedWidth = this.viewportWidth * DRAWER_MAX_PINNED_WIDTH_RATIO
                if (this.drawer.width > maxPinnedWidth) {
                    this.drawer.width = maxPinnedWidth
                }
            } else if (this.viewportWidth >= 480) {
                // For overlay mode on viewports >= 480px, enforce max width constraint
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

                if (this.drawer.width > maxWidth) {
                    this.drawer.width = maxWidth
                }
            }
        },
        togglePinWithWidth () {
            if (!this.drawer.pinned && this.$el) {
                // Pinning: capture the current actual width to maintain visual continuity
                const drawerEl = this.$el.querySelector('.tabs-wrapper.drawer')
                if (drawerEl) {
                    const actualWidth = drawerEl.getBoundingClientRect().width

                    // Apply pinned mode constraint (50% max width)
                    const maxPinnedWidth = this.viewportWidth * DRAWER_MAX_PINNED_WIDTH_RATIO
                    const constrainedWidth = Math.min(actualWidth, maxPinnedWidth)
                    const needsResize = actualWidth > maxPinnedWidth

                    if (needsResize) {
                        // Drawer needs to shrink - animate the resize first
                        this.drawer.width = constrainedWidth

                        // Wait for resize animation to complete (~300ms based on CSS transition)
                        setTimeout(() => {
                            // Now disable transitions briefly for the pin state change
                            this.isPinning = true

                            this.$nextTick(() => {
                                this.drawer.pinned = true

                                // Re-enable transitions
                                setTimeout(() => {
                                    this.isPinning = false
                                }, 50)
                            })
                        }, 300)
                    } else {
                        // No resize needed - use original logic
                        this.drawer.width = constrainedWidth

                        // Disable transitions temporarily to prevent jump
                        this.isPinning = true

                        // Wait a frame for the width to be applied
                        this.$nextTick(() => {
                            this.drawer.pinned = true

                            // Re-enable transitions after a brief delay
                            setTimeout(() => {
                                this.isPinning = false
                            }, 50)
                        })
                    }
                }
            } else {
                // Unpinning: just toggle state
                this.drawer.pinned = false
            }
        },
        handleDrawerMouseEnter () {
            // Only track mouse during initial tease
            if (this.isInitialTease) {
                this.isMouseInDrawer = true
            }
        },
        handleDrawerMouseLeave () {
            // Only track mouse during initial tease
            if (this.isInitialTease) {
                this.isMouseInDrawer = false
                // If we're within the 3-second tease window and mouse leaves, start a new 3s timer
                if (this.teaseCloseTimeout) {
                    clearTimeout(this.teaseCloseTimeout)
                    this.teaseCloseTimeout = setTimeout(() => {
                        if (!this.isMouseInDrawer && this.drawer.open) {
                            this.toggleDrawer()
                        }
                        this.isInitialTease = false
                        this.teaseCloseTimeout = null
                    }, 2000)
                }
            }
        }
    }
}
</script>

<style scoped lang="scss">
.ff-editor-wrapper {
  position: relative;
  height: 100%;
  display: flex;
  flex: 1;

  .tabs-wrapper {
    position: fixed;
    left: 0;
    top: 60px;
    width: 0;
    height: calc(100% - 60px);
    background: white;
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out, width 0.3s ease-in-out;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    container-type: inline-size;
    container-name: drawer;
    z-index: 1;

    &.open {
      transform: translateX(0);
      box-shadow: 5px 0px 8px rgba(0, 0, 0, 0.10);
    }

    // Pinned mode: drawer becomes part of flex layout
    &.pinned {
      position: relative;
      top: 0;
      height: 100%;
      transform: none;
      box-shadow: none;
      flex-shrink: 0;
      border-right: 1px solid $ff-grey-300;

      &:not(.open) {
        width: 0 !important;
        overflow: hidden;
        opacity: 0;
        pointer-events: none;
      }
    }

    // Animation state flags
    &.resizing {
      transition: none; // Disable transition while actively resizing
    }

    &.manually-resized {
      // Custom width preserved after manual resize
    }

    &.pinning {
      transition: none !important; // Disable all transitions while pinning
    }

    &.opening {
      // Only animate transform during open, not width changes
      transition: transform .3s ease-in-out, box-shadow .3s ease-in-out !important;
    }

    &.closing {
      // Only animate transform during close, not width changes
      transition: transform .3s ease-in-out, box-shadow .3s ease-in-out !important;
    }

    .header, main {
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }

    &.open {
      .header, main {
        opacity: 1;
        pointer-events: auto;
      }
    }

    .header {
      padding: 0 15px 0 0;
      display: flex;
      line-height: 1.5;
      border-bottom: 1px solid $ff-grey-200;
      background: white;
      z-index: 10;

      .logo {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding-left: 15px;

        a {
          display: flex;
          justify-content: center;
          align-items: center;
          color: $ff-grey-500;
          gap: 4px;

          .ff-btn--icon {
            width: 16px;
            height: 16px;
          }

          img {
            height: 20px;
          }

          &:hover {
            opacity: 0.8;
          }
        }
      }

      .tabs {
        flex: 1;
        padding: 0 15px;
        min-width: 0;
      }

      .side-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        align-items: center;
        color: $ff-grey-500;
        flex-shrink: 0;

        .pin-drawer-button,
        .close-drawer-button {
          background: none;
          border: none;
          padding: 6px;
          color: inherit;
          font: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          transition: background-color 0.15s ease;

          &:hover {
            cursor: pointer;
            background: $ff-grey-100;
          }

          .ff-btn--icon {
            width: 18px;
            height: 18px;
          }
        }

        .pin-drawer-button.is-pinned {
          background: $ff-indigo-800;
          color: white;

          &:hover {
            background: $ff-indigo-900;
          }
        }
      }
    }
  }

  &.resizing {
    cursor: ew-resize;
    user-select: none;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
    .resize-bar {
        background-color: $ff-blue-500;
    }
    .tabs-wrapper {
        transition: none;
    }
  }
}
</style>

<style lang="scss">
.ff-editor-wrapper {
  .tabs-wrapper {
    main {
      overflow-y: auto;
      overflow-x: hidden;
    }

    .header {
      .tabs {
        .ff-tab-option {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
  }
}
</style>
