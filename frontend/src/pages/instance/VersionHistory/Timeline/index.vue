<template>
    <section id="visual-timeline">
        <ul class="timeline">
            <li v-for="event in timeline" :key="event.id">
                <timeline-event :event="event" :timeline="timeline" @preview-snapshot="showViewSnapshotDialog" />
            </li>
        </ul>
    </section>
    <AssetDetailDialog ref="snapshotViewerDialog" data-el="dialog-view-snapshot" />
</template>

<script>
import projectHistoryAPI from '../../../../api/projectHistory.js'
import SnapshotApi from '../../../../api/snapshots.js'
import AssetDetailDialog from '../../../../components/dialogs/AssetDetailDialog.vue'
import Alerts from '../../../../services/alerts.js'

import TimelineEvent from './components/TimelineEvent.vue'
export default {
    name: 'HistoryTimeline',
    components: { AssetDetailDialog, TimelineEvent },
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
        showViewSnapshotDialog (snapshot) {
            SnapshotApi.getFullSnapshot(snapshot.id).then((data) => {
                this.$refs.snapshotViewerDialog.show(data)
            }).catch(err => {
                console.error(err)
                Alerts.emit('Failed to get snapshot.', 'warning')
            })
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
