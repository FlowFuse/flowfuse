<template>
    <div class="ff-editor-wrapper" :class="{resizing: drawer.resizing}">
        <EditorWrapper :instance="instance" :disable-events="drawer.resizing" />

        <section
            class="tabs-wrapper drawer"
            :class="{'open': drawer.open, resizing: drawer.resizing}"
            :style="{ height: drawer.height + 'px' }"
        >
            <resize-bar
                :is-handle-visible="drawer.open"
                :is-handle-shadowed="!drawer.isHoveringOverResize"
                @mouseover="onResizeBarMouseHover"
                @mouseout="onResizeBarMouseHover"
                @mousedown="startResize"
            />

            <drawer-trigger @click="toggleDrawer" />

            <middle-close-button
                :is-visible="drawer.isHoveringOverResize"
                @click="toggleDrawer"
            />

            <ConfirmInstanceDeleteDialog
                ref="confirmInstanceDeleteDialog"
                @confirm="deleteInstance"
            />

            <div class="header">
                <div class="logo">
                    <router-link :to="{ name: 'instance-overview', params: {id: instance.id} }">
                        <ArrowLeftIcon class="ff-btn--icon" />
                        <img src="../../../images/icons/ff-minimal-grey.svg" alt="logo">
                    </router-link>
                </div>
                <ff-tabs :tabs="navigation" class="tabs" />
                <div class="side-actions">
                    <DropdownMenu v-if="hasPermission('project:change-status')" buttonClass="ff-btn ff-btn--primary" :options="actionsDropdownOptions">Actions</DropdownMenu>
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

        <InstanceStatusPolling
            :instance="instance"
            @instance-updated="instanceUpdated"
        />
    </div>
</template>

<script>
import { ArrowLeftIcon, ChevronDownIcon, ExternalLinkIcon } from '@heroicons/vue/solid'

import DropdownMenu from '../../../components/DropdownMenu.vue'
import InstanceStatusPolling from '../../../components/InstanceStatusPolling.vue'

import FfPage from '../../../layouts/Page.vue'
import instanceMixin from '../../../mixins/Instance.js'
import ConfirmInstanceDeleteDialog from '../Settings/dialogs/ConfirmInstanceDeleteDialog.vue'

import EditorWrapper from './components/EditorWrapper.vue'
import DrawerTrigger from './components/drawer/DrawerTrigger.vue'
import MiddleCloseButton from './components/drawer/MiddleCloseButton.vue'
import ResizeBar from './components/drawer/ResizeBar.vue'

export default {
    name: 'InstanceEditor',
    components: {
        MiddleCloseButton,
        DrawerTrigger,
        EditorWrapper,
        ConfirmInstanceDeleteDialog,
        InstanceStatusPolling,
        DropdownMenu,
        ExternalLinkIcon,
        FfPage,
        ChevronDownIcon,
        ArrowLeftIcon,
        ResizeBar
    },
    mixins: [instanceMixin],
    data () {
        return {
            drawer: {
                open: false,
                isHoveringOverResize: false,
                isHoveringOverResizeThrottled: false,
                resizing: false,
                startY: 0,
                startHeight: 0,
                height: 0,
                defaultHeight: 320
            }
        }
    },
    computed: {
        navigation () {
            if (!this.instance.id) return []
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
                    label: 'Snapshots',
                    to: { name: 'instance-editor-snapshots', params: { id: this.instance.id } },
                    tag: 'instance-snapshots'
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
        }
    },
    mounted () {
        setTimeout(() => {
            this.toggleDrawer()
            this.drawer.height = this.drawer.defaultHeight
        }, 1200)
    },
    methods: {
        toggleDrawer () {
            if (this.drawer.open) {
                this.drawer.open = false
                this.drawer.height = 0
            } else {
                this.drawer.open = true
                this.drawer.height = this.drawer.defaultHeight
            }
            this.drawer.isHoveringOverResize = false
        },
        eventListener (event) {
            if (event.origin === this.instance.url) {
                switch (event.data.type) {
                case 'load':
                    this.emitMessage('prevent-redirect', true)
                    break
                case 'navigate':
                    window.location.href = event.data.payload
                    break
                default:
                }
            }
        },
        emitMessage (type, payload = {}) {
            this.$refs.iframe.contentWindow.postMessage({ type, payload }, '*')
        },
        onResizeBarMouseHover () {
            if (!this.throttled) {
                this.throttled = true
                this.toggleIsHoveringOverResizeBar()
                setTimeout(() => {
                    this.throttled = false
                    this.toggleIsHoveringOverResizeBar()
                }, 2000)
            }
        },
        toggleIsHoveringOverResizeBar () {
            if (!this.drawer.open) {
                this.drawer.isHoveringOverResize = false
                return
            }
            this.drawer.isHoveringOverResize = !this.drawer.isHoveringOverResize
        },
        startResize (e) {
            this.drawer.resizing = true
            this.drawer.startY = e.clientY
            this.drawer.startHeight = this.drawer.height
            document.addEventListener('mousemove', this.resize)
            document.addEventListener('mouseup', this.stopResize)
        },
        resize (e) {
            if (this.drawer.resizing) {
                const heightChange = this.drawer.startY - e.clientY
                const newHeight = this.drawer.startHeight + heightChange
                this.drawer.height = Math.min(Math.max(100, newHeight), window.screen.height - 200)
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

  .tabs-wrapper {
    position: fixed;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 0;
    background: white;
    box-shadow: 4px -4px 8px rgba(0, 0, 0, 0.10);
    transition: ease-in-out 0.3s;
    display: flex;
    flex-direction: column;

    .header {
      padding: 0 15px;
      display: flex;
      line-height: 1.5;
      border-bottom: 1px solid $ff-grey-200;
      background: white;
      z-index: 10;

      .logo {
        display: flex;
        flex-direction: column;
        justify-content: center;

        a {
          display: flex;
          justify-content: center;
          align-items: center;
          color: $ff-grey-500;
          gap: 10px;
        }
      }

      .tabs {
        flex: 1;
        padding: 0 15px;
      }

      .side-actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        color: $ff-grey-500;

        .ff-btn--icon {
          margin-left: 10px;
        }

        .close-drawer {
          &:hover {
            cursor: pointer;
          }
        }
      }
    }
  }

  &.resizing {
    cursor: ns-resize;
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
