<template>
    <SectionTopMenu>
        <template #hero>
            <div class="page-toggle" data-nav="page-toggle">
                <div class="title">
                    <span>View:</span>
                </div>
                <div class="toggle">
                    <template v-if="$route.name.includes('editor')">
                        <router-link :to="{path: './snapshots'}">Snapshots</router-link>
                        <router-link :to="{path: './timeline'}">Timeline</router-link>
                    </template>
                    <template v-else>
                        <router-link :to="{name: 'instance-snapshots'}">Snapshots</router-link>
                        <router-link :to="{name: 'instance-version-history-timeline'}">Timeline</router-link>
                    </template>
                </div>
            </div>
        </template>
        <template #helptext>
            <template v-if="$route.name.includes('timeline')">
                <p>The <b>Timeline</b> provides a concise, chronological view of key activities within your Node-RED instance.</p>
                <p>It tracks various events such as pipeline stage deployments, snapshot restorations, flow deployments, snapshot creations, and updates to instance settings.</p>
                <p>This compact view helps you quickly understand the history of your instance, offering clear insight into when and what changes have been made.</p>
            </template>
            <template v-else-if="$route.name.includes('snapshots')">
                <p><b>Snapshots</b> generate a point-in-time backup of your Node-RED flow, credentials and runtime settings.</p>
                <p>Snapshots are also required for deploying to devices. In the Deployments page of a Project, you can define your “Target Snapshot”, which will then be deployed to all connected devices.</p>
                <p>You can also generate Snapshots directly from any instance of Node-RED using the <a target="_blank" href="https://github.com/FlowFuse/nr-tools-plugin">FlowFuse NR Tools Plugin.</a></p>
            </template>
        </template>
        <template #tools>
            <section class="flex gap-2 items-center self-center">
                <ff-button
                    v-if="hasPermission('snapshot:import')"
                    kind="secondary"
                    data-action="import-snapshot"
                    @click="showImportSnapshotDialog"
                >
                    <template #icon-left><UploadIcon /></template>Upload Snapshot
                </ff-button>
                <ff-button
                    kind="primary"
                    data-action="create-snapshot"
                    @click="showCreateSnapshotDialog"
                >
                    <template #icon-left><PlusSmIcon /></template>Create Snapshot
                </ff-button>
            </section>
        </template>
    </SectionTopMenu>

    <router-view v-slot="{ Component }">
        <transition name="page-fade">
            <component
                :is="Component"
                :instance="instance"
                :reloadHooks="reloadHooks"
                @show-import-snapshot-dialog="showImportSnapshotDialog"
                @show-create-snapshot-dialog="showCreateSnapshotDialog"
                @instance-updated="$emit('instance-updated')"
            />
        </transition>
    </router-view>

    <SnapshotCreateDialog ref="snapshotCreateDialog" data-el="dialog-create-snapshot" :project="instance" @snapshot-created="snapshotCreated" />
    <SnapshotImportDialog
        ref="snapshotImportDialog"
        title="Upload Snapshot"
        data-el="dialog-import-snapshot"
        :owner="instance"
        owner-type="instance"
        @snapshot-import-success="onSnapshotImportSuccess"
        @snapshot-import-failed="onSnapshotImportFailed"
    />
</template>

<script>
import { PlusSmIcon, UploadIcon } from '@heroicons/vue/outline'

import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import SnapshotImportDialog from '../../../components/dialogs/SnapshotImportDialog.vue'

import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'

import SnapshotCreateDialog from './Snapshots/dialogs/SnapshotCreateDialog.vue'

export default {
    name: 'VersionHistory',
    components: {
        SnapshotImportDialog,
        SnapshotCreateDialog,
        PlusSmIcon,
        UploadIcon,
        SectionTopMenu
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated'],
    data () {
        return {
            reloadHooks: []
        }
    },
    methods: {
        showCreateSnapshotDialog () {
            this.$refs.snapshotCreateDialog.show()
        },
        showImportSnapshotDialog () {
            this.busyImportingSnapshot = true
            this.$refs.snapshotImportDialog.show()
        },
        snapshotCreated (snapshot) {
            this.$emit('instance-updated')
            this.reloadHooks.push({ event: 'snapshot-created', payload: snapshot })
        },
        onSnapshotImportSuccess (snapshot) {
            this.$emit('instance-updated')
            this.reloadHooks.push({ event: 'snapshot-imported', payload: snapshot })
        },
        onSnapshotImportFailed (err) {
            const message = err.response?.data?.error || 'Failed to import snapshot.'
            Alerts.emit(message, 'warning')
        }
    }
}
</script>

<style scoped lang="scss">
.page-toggle {
    display: flex;
    gap: 15px;
    align-items: center;

    .title {
        color: $ff-black;
        font-weight: 400;
    }

    .toggle {
        border: 1px solid $ff-blue-800;
        display: flex;
        gap: 10px;
        border-radius: 5px;

        a {
            padding: 5px 10px;
            margin: 1px;
            border-radius: 5px;
            transition: ease-in-out .2s;

            &.router-link-active {
                background: $ff-blue-800;
                color: $ff-white;
            }
        }
    }
}
.page-fade-enter-active, .page-fade-leave-active {
    transition: opacity .2s ease-in-out;
}

.page-fade-enter, .page-fade-leave-to {
    opacity: 0;
}
</style>
