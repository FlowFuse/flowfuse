<template>
    <div class="ff-editor-wrapper" :class="{resizing: drawer.resizing}">
        <EditorWrapper :instance="instance" :disable-events="drawer.resizing" @toggle-drawer="toggleDrawer" @iframe-loaded="notifyDrawerState" @request-drawer-state="notifyDrawerState" />

        <DrawerTrigger :is-hidden="drawer.open" @toggle="toggleDrawer" />

        <section
            class="tabs-wrapper drawer"
            :class="{'open': drawer.open, resizing: drawer.resizing}"
            :style="{ width: drawerWidth + 'px' }"
            data-el="tabs-drawer"
        >
            <resize-bar
                @mousedown="startResize"
            />

            <div class="header">
                <ff-tabs :tabs="navigation" :enable-overflow="true" class="tabs" />
                <div class="side-actions">
                    <DashboardLink
                        v-if="instance.settings?.dashboard2UI" :instance="instance"
                        :disabled="!editorAvailable"
                    />
                    <InstanceActionsButton :instance="instance" @instance-deleted="onInstanceDelete" />
                    <ChevronLeftIcon class="ff-btn--icon close-drawer" @click="toggleDrawer" />
                </div>
            </div>

            <ff-page>
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
import { ChevronLeftIcon } from '@heroicons/vue/solid'

import InstanceStatusPolling from '../../../components/InstanceStatusPolling.vue'
import InstanceActionsButton from '../../../components/instance/ActionButton.vue'
import usePermissions from '../../../composables/Permissions.js'

import FfPage from '../../../layouts/Page.vue'
import instanceMixin from '../../../mixins/Instance.js'
import { Roles } from '../../../utils/roles.js'
import ConfirmInstanceDeleteDialog from '../Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import DashboardLink from '../components/DashboardLink.vue'

import EditorWrapper from './components/EditorWrapper.vue'
import ResizeBar from './components/drawer/ResizeBar.vue'
import DrawerTrigger from './components/DrawerTrigger.vue'

// Drawer size constraints
const DRAWER_MIN_WIDTH = 300 // Minimum drawer width in pixels
const DRAWER_DEFAULT_WIDTH = 400 // Default drawer width in pixels
const DRAWER_MAX_VIEWPORT_MARGIN = 200 // Space to preserve when drawer is at max width
const DRAWER_MAX_WIDTH_RATIO = 0.9 // Maximum drawer width as percentage of viewport (desktop)
const DRAWER_MOBILE_BREAKPOINT = 640 // Viewport width below which mobile layout applies

export default {
    name: 'InstanceEditor',
    components: {
        ConfirmInstanceDeleteDialog,
        InstanceActionsButton,
        DashboardLink,
        EditorWrapper,
        DrawerTrigger,
        InstanceStatusPolling,
        ChevronLeftIcon,
        FfPage,
        ResizeBar
    },
    mixins: [instanceMixin],
    setup () {
        const { hasAMinimumTeamRoleOf, isVisitingAdmin } = usePermissions()

        return { hasAMinimumTeamRoleOf, isVisitingAdmin }
    },
    data () {
        return {
            drawer: {
                open: true,
                resizing: false,
                startX: 0,
                startWidth: 0,
                width: DRAWER_DEFAULT_WIDTH,
                defaultWidth: DRAWER_DEFAULT_WIDTH
            },
            viewportWidth: window.innerWidth
        }
    },
    computed: {
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
                    icon: require('../../../images/icons/ff-minimal-grey.svg')
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
        }
    },
    mounted () {
        // Listen for viewport resize to update drawer width in real-time
        window.addEventListener('resize', this.handleResize)
    },
    unmounted () {
        window.removeEventListener('resize', this.handleResize)
    },
    methods: {
        toggleDrawer () {
            if (this.drawer.open) {
                this.drawer.open = false
                this.drawer.width = 0
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
                iframe.contentWindow.postMessage({
                    type: 'drawer-state',
                    payload: { open: this.drawer.open }
                }, '*')
            }
        },
        startResize (e) {
            this.drawer.resizing = true
            this.drawer.startX = e.clientX
            this.drawer.startWidth = this.drawer.width
            document.addEventListener('mousemove', this.resize)
            document.addEventListener('mouseup', this.stopResize)
        },
        resize (e) {
            if (this.drawer.resizing) {
                const widthChange = e.clientX - this.drawer.startX
                const newWidth = this.drawer.startWidth + widthChange
                this.drawer.width = Math.min(
                    Math.max(DRAWER_MIN_WIDTH, newWidth),
                    this.viewportWidth - DRAWER_MAX_VIEWPORT_MARGIN
                )
            }
        },
        stopResize () {
            this.drawer.resizing = false
            document.removeEventListener('mousemove', this.resize)
            document.removeEventListener('mouseup', this.stopResize)
        },
        handleResize () {
            this.viewportWidth = window.innerWidth
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
    transition: ease-in-out 0.3s;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    container-type: inline-size;
    container-name: drawer;
    z-index: 1;

    &.open {
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

        .close-drawer {
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
          min-width: 80px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
  }
}
</style>
