<template>
    <div>
        <section id="visual-timeline" class="relative" :style="{height: `${listHeight}px`}">
            <transition name="fade">
                <ff-loading v-if="loading" message="Loading Timeline..." class="absolute top-0" />

                <!-- set mb-14 (~56px) on the form to permit access to kebab actions where hubspot chat covers it -->
                <!-- it's pb- in this case -->
                <ul v-else class="timeline pb-14 " :style="{'max-height': `${listHeight}px`}">
                    <li v-for="event in timeline" :key="event.id">
                        <timeline-event
                            :event="event"
                            :timeline="timeline"
                            @preview-snapshot="showViewSnapshotDialog"
                            @restore-snapshot="forceRefresh(showRollbackDialog, $event, true)"
                            @compare-snapshot="forceRefresh(showCompareSnapshotDialog, $event)"
                            @delete-snapshot="forceRefresh(showDeleteSnapshotDialog, $event)"
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
            loading: true,
            listHeight: 0
        }
    },
    watch: {
        'instance.id': function () {
            this.fetchData()
        }
    },
    mounted () {
        this.fetchData()
        this.computeTimelineListMaxHeight()
        window.addEventListener('resize', this.computeTimelineListMaxHeight)
    },
    beforeUnmount () {
        window.removeEventListener('resize', this.computeTimelineListMaxHeight)
    },
    methods: {
        async fetchData () {
            this.loading = true

            // handling a specific scenario where users can navigate to the source snapshot instance, and when they click back,
            // we retrieve the timeline for that instance and display it for a short period of time
            if (this.instance.id && this.instance.id === this.$route.params.id) {
                projectHistoryAPI.getHistory(this.instance.id)
                    .then((response) => {
                        this.loading = false
                        this.timeline = response.timeline
                    })
                    .catch(e => e)
            }
        },
        async forceRefresh (callback, ...payload) {
            callback(...payload)
                .then(() => this.fetchData())
                .catch(e => console.warn(e))
        },
        computeTimelineListMaxHeight () {
            const sectionHeader = document.querySelector('.ff-section-header')

            if (sectionHeader) {
                const rect = sectionHeader.getBoundingClientRect()
                const heightToBottom = window.innerHeight - rect.bottom

                // also deduct the <main> tag padding and .ff-section-header's margin-bottom
                this.listHeight = heightToBottom - 24.5 - 7
            }
        }
    }
}
</script>

<style scoped lang="scss">
#visual-timeline {
    .timeline {
        border: 1px solid $ff-grey-300;
        border-radius: 3px;
        overflow: auto;
    }
}
</style>
