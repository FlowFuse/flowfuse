<template>
    <div class="ff-editor-wrapper">
        <section class="editor-wrapper">
            <div v-if="isInstanceTransitioningStates" class="status-wrapper">
                <InstanceStatusBadge
                    :status="instance.meta?.state"
                    :optimisticStateChange="instance.optimisticStateChange"
                    :pendingStateChange="instance.pendingStateChange"
                />
            </div>

            <iframe
                v-else
                ref="iframe"
                width="100%"
                height="100%"
                :src="instance.url"
                title="YouTube video player"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
            />
        </section>

        <section class="tabs-wrapper drawer" :class="{'open': drawer.open}">
            <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" @confirm="deleteInstance" />

            <div class="header">
                <div class="logo">
                    <router-link :to="{ name: 'Home' }">
                        <ArrowLeftIcon class="ff-btn--icon" />
                        <img src="../../../images/icons/ff-minimal-grey.svg" alt="logo">
                    </router-link>
                </div>
                <ff-tabs :tabs="navigation" class="tabs" />
                <div class="side-actions">
                    <DropdownMenu v-if="hasPermission('project:change-status')" buttonClass="ff-btn ff-btn--primary" :options="actionsDropdownOptions">Actions</DropdownMenu>
                    <a :href="instance.url" target="_blank">
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
            <div class="drawer-trigger" @click="toggleDrawer">
                <img src="../../../images/icons/ff-minimal-grey.svg" alt="logo">
            </div>
            <InstanceStatusPolling :instance="instance" @instance-updated="instanceUpdated" />
        </section>
    </div>
</template>

<script>
import { ArrowLeftIcon, ChevronDownIcon, ExternalLinkIcon } from '@heroicons/vue/solid'

import DropdownMenu from '../../../components/DropdownMenu.vue'
import InstanceStatusPolling from '../../../components/InstanceStatusPolling.vue'

import FfPage from '../../../layouts/Page.vue'
import instanceMixin from '../../../mixins/Instance.js'
import ConfirmInstanceDeleteDialog from '../Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import InstanceStatusBadge from '../components/InstanceStatusBadge.vue'

export default {
    name: 'InstanceEditor',
    components: { InstanceStatusBadge, ConfirmInstanceDeleteDialog, InstanceStatusPolling, DropdownMenu, ExternalLinkIcon, FfPage, ChevronDownIcon, ArrowLeftIcon },
    mixins: [instanceMixin],
    data () {
        return {
            drawer: {
                open: true
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
        },
        isInstanceTransitioningStates () {
            const pendingState = (Object.hasOwnProperty.call(this.instance, 'pendingStateChange') && this.instance.pendingStateChange)
            const optimisticStateChange = (Object.hasOwnProperty.call(this.instance, 'optimisticStateChange') && this.instance.optimisticStateChange)
            return pendingState || optimisticStateChange || ['starting', 'suspended', 'suspending'].includes(this.instance.meta?.state)
        }
    },
    mounted () {
        window.addEventListener('message', this.eventListener)
    },
    unmounted () {
        window.removeEventListener('message', this.eventListener)
    },
    methods: {
        toggleDrawer () {
            this.drawer.open = !this.drawer.open
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

  .editor-wrapper {
    height: 100%;
    width: 100%;
    position: absolute;
    display: flex;
    flex-direction: column;
    align-content: center;
    justify-content: center;

    .status-wrapper {
      display: flex;
      justify-content: center;
    }
  }

  .tabs-wrapper {
    position: fixed;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 0;
    background: white;
    box-shadow: 3.841px -3.841px 7.682px rgba(0, 0, 0, 0.10);
    transition: ease-in-out 0.3s;

    &::before {
      content: '...';
      position: absolute;
      top: -4px;
      left: 50%;
      border-radius: 9px;
      border: 1px solid $ff-grey-400;
      background: $ff-grey-100;
      color: $ff-grey-400;
      letter-spacing: 5px;
      width: 35px;
      height: 10px;
      display: none;
      padding: 0;
      cursor: ns-resize;
      justify-content: end;
      align-items: flex-end;
      flex-direction: column;

      &:hover {
        cursor: ns-resize;
      }
    }

    .drawer-trigger {
      display: block;
      position: absolute;
      top: -30px;
      left: 50%;
      padding: 2px 30px;
      background: white;
      border: 1px solid $ff-grey-400;
      box-shadow: 3.841px -3.841px 7.682px rgba(0, 0, 0, 0.10);
      border-radius: 10px 10px 0 0;
      transition: ease-out .7s;

      &:hover {
        cursor: pointer;
      }
    }

    &.open {
      height: 320px;

      .drawer-trigger {
        top: 500px;
        transition: ease-in .1s;
      }

      &::before {
        display: flex;
      }
    }

    .header {
      padding: 0 15px;
      display: flex;
      line-height: 1.5;
      border-top: 1px solid $ff-grey-400;
      border-bottom: 1px solid $ff-grey-200;

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
}
</style>
