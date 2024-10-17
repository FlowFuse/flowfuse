<template>
    <section id="visual-timeline">
        <ul class="timeline">
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
    </section>
    <AssetDetailDialog ref="snapshotViewerDialog" data-el="dialog-view-snapshot" />
    <SnapshotExportDialog ref="snapshotExportDialog" data-el="dialog-export-snapshot" :project="instance" />
    <SnapshotEditDialog ref="snapshotEditDialog" data-el="dialog-edit-snapshot" @snapshot-updated="fetchData" />
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
            timeline: []
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
            // todo should add loading screen
            if (this.instance.id) {
                const payload = await projectHistoryAPI.getHistory(this.instance.id)
                this.timeline = payload.timeline
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
    .timeline {
        border: 1px solid $ff-grey-300;
        border-radius: 3px;
    }
}
</style>
