<template>
    <div>
        <!-- set mb-14 (~56px) on the form to permit access to kebab actions where hubspot chat covers it -->
        <section id="visual-timeline" class="mb-14 relative">
            <transition name="fade">
                <ff-loading v-if="loading" message="Loading Timeline..." class="absolute top-0" />

                <ul v-else class="timeline">
                    <li v-for="event in timeline" :key="event.id">
                        <timeline-event
                            :event="event"
                            :timeline="timeline"
                            @preview-snapshot="showViewSnapshotDialog"
                            @restore-snapshot="forceRefresh($event, showRollbackDialog)"
                            @compare-snapshot="forceRefresh($event, showCompareSnapshotDialog)"
                            @delete-snapshot="forceRefresh($event, showDeleteSnapshotDialog)"
                            @edit-snapshot="showEditSnapshotDialog"
                            @download-snapshot="showDownloadSnapshotDialog"
                            @download-package-json="downloadSnapshotPackage"
                            @set-device-target="showDeviceTargetDialog"
                        />
                    </li>
                </ul>
            </transition>
        </section>
        <AssetDetailDialog ref="snapshotViewerDialog" data-el="dialog-view-snapshot" />
        <SnapshotExportDialog ref="snapshotExportDialog" data-el="dialog-export-snapshot" :project="instance" />
        <SnapshotEditDialog ref="snapshotEditDialog" data-el="dialog-edit-snapshot" @snapshot-updated="fetchData" />
    </div>
</template>

<script>
import projectHistoryAPI from '../../../../api/projectHistory.js'
import AssetDetailDialog from '../../../../components/dialogs/AssetDetailDialog.vue'
import SnapshotEditDialog from '../../../../components/dialogs/SnapshotEditDialog.vue'
import snapshotsMixin from '../../../../mixins/Snapshots.js'
import SnapshotExportDialog from '../../../application/Snapshots/components/dialogs/SnapshotExportDialog.vue'

import TimelineEvent from './components/TimelineEvent.vue'
export default {
    name: 'HistoryTimeline',
    components: { SnapshotEditDialog, SnapshotExportDialog, AssetDetailDialog, TimelineEvent },
    mixins: [snapshotsMixin],
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            timeline: [],
            loading: true
        }
    },
    watch: {
        'instance.id': function () {
            this.fetchData()
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        async fetchData () {
            this.loading = true
            if (this.instance.id) {
                projectHistoryAPI.getHistory(this.instance.id)
                    .then((response) => {
                        this.loading = false
                        this.timeline = response.timeline
                    })
                    .catch(e => e)
            }
        },
        async forceRefresh (payload, callback) {
            callback(payload)
                .then(() => this.fetchData())
                .catch(e => console.warn(e))
        }
    }
}
</script>

<style scoped lang="scss">
#visual-timeline {
    min-height: 200px;

    .timeline {
        border: 1px solid $ff-grey-300;
        border-radius: 3px;
    }
}
</style>
