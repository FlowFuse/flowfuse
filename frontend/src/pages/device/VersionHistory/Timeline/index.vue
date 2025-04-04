<template>
    <div>
        <FeatureUnavailable v-if="!isTimelineFeatureEnabledForPlatform" />
        <FeatureUnavailableToTeam v-else-if="!isTimelineFeatureEnabledForTeam" />
        <section
            v-if="isTimelineFeatureEnabled" id="visual-timeline" class="relative"
            :style="{height: listHeightCss}"
        >
            <transition name="fade" mode="out-in">
                <ff-loading v-if="loading" message="Loading Timeline..." class="absolute top-0" />
                <ul v-else-if="activeTimeline.length" ref="timeline" data-el="timeline-list" class="timeline" :style="{'max-height': listHeightCss}">
                    <li v-for="event in activeTimeline" :key="event.id">
                        <timeline-event
                            :event="event"
                            :timeline="activeTimeline"
                            @preview-snapshot="showViewSnapshotDialog"
                            @restore-snapshot="forceRefresh(showRollbackDialog, $event, true)"
                            @compare-snapshot="forceRefresh(showCompareSnapshotDialog, $event)"
                            @delete-snapshot="forceRefresh(showDeleteSnapshotDialog, $event)"
                            @edit-snapshot="showEditSnapshotDialog"
                            @download-snapshot="showDownloadSnapshotDialog"
                            @download-package-json="downloadSnapshotPackage"
                            @set-device-target="showDeviceTargetDialog"
                            @load-more="fetchData(true)"
                        />
                    </li>
                </ul>
                <empty-state v-else>
                    <template #img>
                        <img src="../../../../images/empty-states/instance-timeline.png" alt="pipelines-logo">
                    </template>
                    <template #header>
                        <span>Nothing to see here just yet!</span>
                    </template>
                    <template #message>
                        <p>The Timeline provides a concise, chronological view of key activities within your Node-RED instance.</p>
                        <p>It tracks various events such as pipeline stage deployments, snapshot restorations, flow deployments, snapshot creations, and updates to instance settings.</p>
                        <p>This compact view helps you quickly understand the history of your instance, offering clear insight into when and what changes have been made.</p>
                    </template>
                </empty-state>
            </transition>
        </section>
        <section v-else>
            <empty-state>
                <template #img>
                    <img src="../../../../images/empty-states/instance-timeline.png" alt="pipelines-logo">
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
        <SnapshotExportDialog ref="snapshotExportDialog" data-el="dialog-export-snapshot" :project="device" />
        <SnapshotEditDialog ref="snapshotEditDialog" data-el="dialog-edit-snapshot" @snapshot-updated="fetchData(false)" />
    </div>
</template>

<script>
import DevicesAPI from '../../../../api/devices.js'
import versionHistoryAPI from '../../../../api/versionHistory.js'
import EmptyState from '../../../../components/EmptyState.vue'
import FeatureUnavailable from '../../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../../components/banners/FeatureUnavailableToTeam.vue'
import AssetDetailDialog from '../../../../components/dialogs/AssetDetailDialog.vue'
import SnapshotEditDialog from '../../../../components/dialogs/SnapshotEditDialog.vue'
import TimelineEvent from '../../../../components/version-history/timeline/TimelineEvent.vue'
import { scrollTo } from '../../../../composables/Ux.js'
import featuresMixin from '../../../../mixins/Features.js'
import snapshotsMixin from '../../../../mixins/Snapshots.js'
import Alerts from '../../../../services/alerts.js'
import Dialog from '../../../../services/dialog.js'
import SnapshotExportDialog from '../../../application/Snapshots/components/dialogs/SnapshotExportDialog.vue'

export default {
    name: 'HistoryTimeline',
    components: {
        SnapshotEditDialog,
        SnapshotExportDialog,
        AssetDetailDialog,
        EmptyState,
        FeatureUnavailableToTeam,
        FeatureUnavailable,
        TimelineEvent
    },
    mixins: [snapshotsMixin, featuresMixin],
    inheritAttrs: false,
    props: {
        device: {
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
            listHeight: 0,
            next_cursor: undefined
        }
    },
    computed: {
        canLoadMore () {
            return this.next_cursor !== undefined
        },
        activeTimeline () {
            if (this.canLoadMore) {
                return [...this.timeline, {
                    event: 'load-more',
                    id: 'load-more'
                }]
            } else return this.timeline
        },
        listHeightCss () {
            return this.listHeight ? `${this.listHeight}px` : '800px'
        }
    },
    watch: {
        reloadHooks: {
            handler: function () {
                this.fetchData(false)
            },
            deep: true
        },
        'device.id': 'fetchData'
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
        async fetchData (loadMore = false) {
            if (this.isTimelineFeatureEnabled) {
                if (!loadMore) {
                    this.loading = true
                }

                // handling a specific scenario where users can navigate to the source snapshot device, and when they click back,
                // we retrieve the timeline for that device and display it for a short period of time
                if (this.device.id && this.device.id === this.$route.params.id) {
                    const nextCursor = loadMore ? this.next_cursor : undefined
                    versionHistoryAPI.getDeviceHistory(this.device.id, nextCursor, 10)
                        .then((response) => {
                            this.loading = false
                            if (loadMore) {
                                response.timeline.forEach(ev => {
                                    this.timeline.push(ev)
                                    if (this.$refs.timeline) {
                                        this.$nextTick(() => scrollTo(this.$refs.timeline, {
                                            top: this.$refs.timeline.scrollHeight,
                                            behavior: 'smooth'
                                        }))
                                    }
                                })
                            } else this.timeline = response.timeline
                            this.next_cursor = response.meta.next_cursor
                        })
                        .catch(e => e)
                }
            }
        },
        async forceRefresh (callback, ...payload) {
            callback(...payload)
                .then(() => this.fetchData(false))
                .catch(e => console.warn(e))
        },
        computeTimelineListMaxHeight () {
            if (!this.$route.path.includes('editor')) {
                const sectionHeader = document.querySelector('.ff-section-header')

                if (sectionHeader) {
                    const rect = sectionHeader.getBoundingClientRect()
                    const heightToBottom = window.innerHeight - rect.bottom

                    // also deduct the <main> tag padding and .ff-section-header's margin-bottom
                    this.listHeight = heightToBottom - 24.5 - 7
                }
            }
        },
        showRollbackDialog (snapshot, alterLoadingState = false) {
            return new Promise((resolve) => {
                Dialog.show({
                    header: 'Restore Snapshot',
                    kind: 'danger',
                    text: `This will overwrite the current remote instance.
                       All changes to the flows, settings and environment variables made since the last snapshot will be lost.
                       Are you sure you want to deploy to this snapshot?`,
                    confirmLabel: 'Confirm'
                }, async () => {
                    if (alterLoadingState) this.loading = true
                    return DevicesAPI.setSnapshotAsTarget(this.device.id, snapshot.id)
                        .then(() => {
                            Alerts.emit('Successfully deployed snapshot.', 'confirmation')
                            resolve()
                        })
                })
            })
        }
    }
}
</script>

<style lang="scss">
#visual-timeline {
    .timeline {
        border: 1px solid $ff-grey-300;
        border-radius: 3px;
        overflow: auto;
        li:last-child {
            .connector.bottom {
                display: none;
            }
        }
    }
}
</style>
