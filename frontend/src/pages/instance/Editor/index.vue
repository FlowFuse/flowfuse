<template>
    <div class="ff-editor-wrapper" :class="{resizing: drawer.resizing}">
        <!-- Drawer toggle button positioned over the Node-RED header -->
        <button
            class="drawer-toggle-button"
            :class="{'drawer-open': drawer.open}"
            @click="toggleDrawer"
            title="Toggle drawer"
        >
            <img src="../../../images/icons/ff-minimal-grey.svg" alt="FlowFuse logo" class="ff-logo-icon">
        </button>

        <EditorWrapper :instance="instance" :disable-events="drawer.resizing" />

        <section
            class="tabs-wrapper drawer"
            :class="{'open': drawer.open, resizing: drawer.resizing}"
            :style="{ width: drawer.width + 'px' }"
            data-el="tabs-drawer"
        >
            <resize-bar
                @mousedown="startResize"
            />

            <div class="header">
                <ff-tabs :tabs="navigation" class="tabs" />
                <div class="side-actions">
                    <DashboardLink
                        v-if="instance.settings?.dashboard2UI" :instance="instance"
                        :disabled="!editorAvailable"
                    />
                    <InstanceActionsButton :instance="instance" @instance-deleted="onInstanceDelete" />
                    <a :href="instance.url">
                        <ExternalLinkIcon class="ff-btn--icon" />
                    </a>
                    <ChevronDownIcon class="ff-btn--icon close-drawer" @click="toggleDrawer" />
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
import { ArrowLeftIcon, ChevronDownIcon, ExternalLinkIcon } from '@heroicons/vue/solid'

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

export default {
    name: 'InstanceEditor',
    components: {
        ConfirmInstanceDeleteDialog,
        InstanceActionsButton,
        DashboardLink,
        EditorWrapper,
        InstanceStatusPolling,
        ExternalLinkIcon,
        FfPage,
        ChevronDownIcon,
        ArrowLeftIcon,
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
                open: false,
                resizing: false,
                startX: 0,
                startWidth: 0,
                width: 0,
                defaultWidth: 400
            }
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
        }
    },
    mounted () {
        // Drawer starts closed - user clicks logo to open
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
                this.drawer.width = Math.min(Math.max(300, newWidth), window.screen.width - 200)
            }
        },
        stopResize () {
            this.drawer.resizing = false
            document.removeEventListener('mousemove', this.resize)
            document.removeEventListener('mouseup', this.stopResize)
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

  .drawer-toggle-button {
    position: fixed;
    top: 60px;
    left: 0;
    width: 40px;
    height: 40px;
    background: #fff;
    border: none;
    border-right: 1px solid $ff-grey-300;
    border-bottom: 1px solid $ff-grey-300;
    cursor: pointer;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: left 0.3s ease-in-out;

    &:hover {
      background: $ff-grey-100;
    }

    .ff-logo-icon {
      width: 20px;
      height: 20px;
    }

    &.drawer-open {
      left: 400px;
    }
  }

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
      }

      .side-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        align-items: center;
        color: $ff-grey-500;

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
  }
}
</style>
