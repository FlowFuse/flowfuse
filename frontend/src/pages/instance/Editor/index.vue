<template>
    <div class="ff-editor-wrapper">
        <section class="editor-wrapper">
            <iframe
                width="100%"
                height="100%"
                :src="instance.url"
                title="YouTube video player"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
            />
        </section>

        <section class="tabs-wrapper">
            <div class="header">
                <div class="logo">
                    <router-link :to="{ name: 'Home' }">
                        <ArrowLeftIcon class="ff-btn--icon" />

                        <img src="../../../images/icons/ff-minimal-grey.svg">
                    </router-link>
                </div>
                <ff-tabs :tabs="navigation" class="tabs" />
                <div class="side-actions">
                    <a :href="instance.url" target="_blank">
                        <ExternalLinkIcon class="ff-btn--icon" />
                    </a>
                    <router-link :to="{ name: 'Home' }">
                        <ChevronDownIcon class="ff-btn--icon" />
                    </router-link>
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
    </div>
</template>

<script>
import { ArrowLeftIcon, ChevronDownIcon, ExternalLinkIcon } from '@heroicons/vue/solid'

import FfPage from '../../../layouts/Page.vue'
import instanceMixin from '../../../mixins/Instance.js'

export default {
    name: 'InstanceEditor',
    components: { ExternalLinkIcon, FfPage, ChevronDownIcon, ArrowLeftIcon },
    mixins: [instanceMixin],
    data () {
        return {
            instance: {}
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
        this.loadInstance()
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
  }

  .tabs-wrapper {
    position: fixed;
    left: 0;
    bottom: 0;
    width: 100%;
    background: white;
    max-height: 320px;
    box-shadow: 3.841px -3.841px 7.682px rgba(0, 0, 0, 0.10);

    //&::before {
    //  content: '...';
    //  position: absolute;
    //  top: -4px;
    //  left: 50%;
    //  border-radius: 9px;
    //  border: 1px solid $ff-grey-400;
    //  background: $ff-grey-100;
    //  color: $ff-grey-400;
    //  letter-spacing: 5px;
    //  width: 35px;
    //  height: 10px;
    //  display: flex;
    //  padding: 0;
    //  cursor: ns-resize;
    //  justify-content: end;
    //  align-items: flex-end;
    //  flex-direction: column;
    //
    //  &:hover {
    //    cursor: ns-resize;
    //  }
    //}

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

    .header {
      padding: 0 15px;
      display: flex;
      line-height: 1.5;
      border-top: 1px solid $ff-grey-400;
      border-bottom: 1px solid $ff-grey-200;

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
      }
    }
  }
}
</style>
