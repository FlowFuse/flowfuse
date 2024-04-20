<template>
    <div class="ff-editor-wrapper">
        <EditorWrapper :instance="instance" />

        <section class="tabs-wrapper drawer" :class="{'open': drawer.open}">
            <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" @confirm="deleteInstance" />
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
            <div class="drawer-trigger" @click="toggleDrawer">
                <img src="../../../images/icons/ff-logo--wordmark--grey.svg" alt="logo">
                <ChevronUpIcon class="ff-btn--icon close-drawer" />
            </div>
            <InstanceStatusPolling :instance="instance" @instance-updated="instanceUpdated" />
        </section>
    </div>
</template>

<script>
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon } from '@heroicons/vue/solid'

import DropdownMenu from '../../../components/DropdownMenu.vue'
import InstanceStatusPolling from '../../../components/InstanceStatusPolling.vue'

import FfPage from '../../../layouts/Page.vue'
import instanceMixin from '../../../mixins/Instance.js'
import ConfirmInstanceDeleteDialog from '../Settings/dialogs/ConfirmInstanceDeleteDialog.vue'

import EditorWrapper from './components/EditorWrapper.vue'

export default {
    name: 'InstanceEditor',
    components: {
        EditorWrapper,
        ConfirmInstanceDeleteDialog,
        InstanceStatusPolling,
        DropdownMenu,
        ExternalLinkIcon,
        FfPage,
        ChevronDownIcon,
        ChevronUpIcon,
        ArrowLeftIcon
    },
    mixins: [instanceMixin],
    data () {
        return {
            drawer: {
                open: false
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
        setTimeout(this.toggleDrawer, 1200)
    },
    methods: {
        toggleDrawer () {
            this.drawer.open = !this.drawer.open
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

    .drawer-trigger {
      display: flex;
      align-items: center;
      gap: 10px;
      position: absolute;
      top: -40px;
      left: 50%;
      margin-left: -84px;
      padding: 10px 16px 8px;
      color: $ff-grey-400;
      background: white;
      border: 1px solid $ff-grey-400;
      box-shadow: 4px -4px 8px rgba(0, 0, 0, 0.10);
      border-radius: 10px 10px 0 0;
      transition: ease-out .7s;
      img {
        height: 20px;
      }

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
