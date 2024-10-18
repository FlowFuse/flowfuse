<template>
    <div>
        <FeatureUnavailable v-if="!isTimelineFeatureEnabledForPlatform" />
        <FeatureUnavailableToTeam v-else-if="!isTimelineFeatureEnabledForTeam" />
        <section v-if="isTimelineFeatureEnabled" id="visual-timeline" class="relative" :style="{height: `${listHeight}px`}">
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
        <section v-else>
            <empty-state>
                <template #img>
                    <img src="../../../../images/empty-states/application-pipelines.png" alt="pipelines-logo">
                </template>
                <template #header>
                    <span>Timeline Not Available</span>
                </template>
                <template #message>
                    <p>The Timeline provides a concise, chronological view of key activities within your Node-RED instance.</p>
                    <p>It tracks various events such as pipeline stage deployments, snapshot restorations, flow deployments, snapshot creations, and updates to instance settings.</p>
                    <p>This compact view helps you quickly understand the history of your instance, offering clear insight into when and what changes have been made.</p>
                </template>
            </empty-state>
        </section>
        <AssetDetailDialog ref="snapshotViewerDialog" data-el="dialog-view-snapshot" />
        <SnapshotExportDialog ref="snapshotExportDialog" data-el="dialog-export-snapshot" :project="instance" />
        <SnapshotEditDialog ref="snapshotEditDialog" data-el="dialog-edit-snapshot" @snapshot-updated="fetchData" />
    </div>
</template>

<script>
import projectHistoryAPI from '../../../../api/projectHistory.js'
import EmptyState from '../../../../components/EmptyState.vue'
import FeatureUnavailable from '../../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../../components/banners/FeatureUnavailableToTeam.vue'
import AssetDetailDialog from '../../../../components/dialogs/AssetDetailDialog.vue'
import SnapshotEditDialog from '../../../../components/dialogs/SnapshotEditDialog.vue'
import featuresMixin from '../../../../mixins/Features.js'
import snapshotsMixin from '../../../../mixins/Snapshots.js'
import SnapshotExportDialog from '../../../application/Snapshots/components/dialogs/SnapshotExportDialog.vue'

import TimelineEvent from './components/TimelineEvent.vue'
export default {
    name: 'HistoryTimeline',
    components: {
        EmptyState,
        FeatureUnavailableToTeam,
        FeatureUnavailable,
        SnapshotEditDialog,
        SnapshotExportDialog,
        AssetDetailDialog,
        TimelineEvent
    },
    mixins: [snapshotsMixin, featuresMixin],
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        },
        reloadHooks: {
            type: Array,
            required: false,
            default: () => []
        }
    },
    data () {
        return {
            timeline: [],
            loading: false,
            listHeight: 0
        }
    },
    watch: {
        reloadHooks: {
            handler: 'fetchData',
            deep: true
        },
        'instance.id': 'fetchData'
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
            if (this.isTimelineFeatureEnabled) {
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
