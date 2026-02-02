<template>
    <div ref="resizeTarget" class="ff-editor-wrapper" :class="{resizing: isEditorResizing}">
        <EditorWrapper
            :instance="instance"
            :disable-events="isEditorResizing"
            @toggle-drawer="toggleDrawer"
            @iframe-loaded="notifyDrawerState"
            @request-drawer-state="notifyDrawerState"
        />

        <DrawerTrigger :is-hidden="drawer.open" @toggle="toggleDrawer" />

        <section
            class="tabs-wrapper drawer"
            :class="{'open': drawer.open, resizing: drawer.resizing}"
            :style="{ width: editorWidthStyle }"
            data-el="tabs-drawer"
            @mouseenter="handleDrawerMouseEnter"
            @mouseleave="handleDrawerMouseLeave"
        >
            <resize-bar
                @mousedown="startEditorResize"
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

        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" :instance="instance" @confirm="onInstanceDelete" />

        <InstanceStatusPolling
            :instance="instance"
            @instance-updated="instanceUpdated"
        />
    </div>
</template>

<script>
import { ArrowLeftIcon, XIcon } from '@heroicons/vue/solid'
import { mapActions, mapGetters } from 'vuex'

import InstanceStatusPolling from '../../../components/InstanceStatusPolling.vue'
import ExpertTabIcon from '../../../components/icons/ff-minimal-grey.js'
import InstanceActionsButton from '../../../components/instance/ActionButton.vue'
import usePermissions from '../../../composables/Permissions.js'
import { useResizingHelper } from '../../../composables/ResizingHelper.js'

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
const DRAWER_DEFAULT_WIDTH = 550 // Default drawer width in pixels
const DRAWER_MAX_VIEWPORT_MARGIN = 200 // Space to preserve when drawer is at max width
const DRAWER_MAX_WIDTH_RATIO = 0.9 // Maximum drawer width as percentage of viewport (desktop)
const DRAWER_MOBILE_BREAKPOINT = 640 // Viewport width below which mobile layout applies

export default {
    name: 'InstanceEditor',
    components: {
        ArrowLeftIcon,
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
    inject: ['$services'],
    setup () {
        const { hasAMinimumTeamRoleOf, isVisitingAdmin } = usePermissions()
        const {
            startResize: startEditorResize,
            widthStyle: editorWidthStyle,
            bindResizer: bindEditorResizer,
            isResizing: isEditorResizing,
            setWidth: setEditorWidth
        } = useResizingHelper()

        return {
            isVisitingAdmin,
            isEditorResizing,
            editorWidthStyle,
            hasAMinimumTeamRoleOf,
            startEditorResize,
            bindEditorResizer,
            setEditorWidth
        }
    },
    data () {
        return {
            drawer: {
                open: false
            },
            viewportWidth: window.innerWidth,
            isMouseInDrawer: false,
            teaseCloseTimeout: null,
            isInitialTease: false
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
        instance (instance) {
            this.setInstance(instance)
        }
    },
    mounted () {
        this.bindEditorResizer({
            component: this.$refs.resizeTarget,
            initialWidth: DRAWER_DEFAULT_WIDTH,
            minWidth: DRAWER_MIN_WIDTH,
            maxViewportMarginX: DRAWER_MAX_VIEWPORT_MARGIN,
            maxWidthRatio: DRAWER_MAX_WIDTH_RATIO

        })
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
    },
    unmounted () {
        if (this.teaseCloseTimeout) {
            clearTimeout(this.teaseCloseTimeout)
        }
        this.clearInstance()
    },
    methods: {
        ...mapActions('context', ['setInstance', 'clearInstance']),
        toggleDrawer () {
            if (this.drawer.open) {
                this.drawer.open = false
                // Keep width at current value - drawer will slide off-screen via transform
            } else {
                this.drawer.open = true
                this.setEditorWidth(DRAWER_DEFAULT_WIDTH)
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
                this.$services.messaging.sendMessage({
                    message: {
                        type: 'drawer-state',
                        payload: { open: this.drawer.open }
                    },
                    target: iframe.contentWindow,
                    targetOrigin
                })
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
    transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
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

        .close-drawer-button {
          background: none;
          border: none;
          padding: 0;
          color: inherit;
          font: inherit;
          display: flex;
          align-items: center;

          &:hover {
            cursor: pointer;
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
