<template>
    <section id="visual-timeline">
        <ul class="timeline">
            <li v-for="event in timeline" :key="event.id">
                <timeline-event :event="event" />
            </li>
        </ul>
    </section>
</template>

<script>
import projectHistoryAPI from '../../../../api/projectHistory.js'

import TimelineEvent from './components/TimelineEvent.vue'
export default {
    name: 'HistoryTimeline',
    components: { TimelineEvent },
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
    mounted () {
        this.fetchData()
    },
    methods: {
        async fetchData () {
            const payload = await projectHistoryAPI.getHistory(this.instance.id)

            this.timeline = payload.timeline
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
