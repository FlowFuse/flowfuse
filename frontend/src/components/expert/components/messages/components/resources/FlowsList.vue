<template>
    <!-- Resources Section -->
    <div class="guide-flows">
        <h4 class="section-title">
            <streamable-content v-model="streamingTitle" :should-stream="shouldStream" />
        </h4>
        <div v-if="streamingTitle.streamed" class="resources-grid">
            <FlowResourceCard
                v-for="(flow, index) in visibleItems" :key="index"
                :flow="flow"
                :should-stream="shouldStream"
                @streaming-complete="updateCardStreamingState(flow, index)"
            />
        </div>
    </div>
</template>

<script>
import useStreamingList from '../../../../../../composables/StreamingListHelper.js'
import FlowResourceCard from '../resource-cards/FlowResourceCard.vue'

import StreamableContent from './StreamableContent.vue'

export default {
    name: 'ListFlows',
    components: { StreamableContent, FlowResourceCard },
    props: {
        flows: {
            type: Array,
            required: true
        },
        shouldStream: {
            type: Boolean,
            default: false
        }
    },
    emits: ['streaming-complete'],
    setup () {
        const { initStreamer, updateCardStreamingState, visibleItems, items } = useStreamingList()

        return { initStreamer, updateCardStreamingState, visibleItems, items }
    },
    data () {
        return {
            streamingTitle: {
                streamable: 'Related Flows',
                streamed: false
            }
        }
    },
    async mounted () {
        const flows = this.flows.map(flow => ({
            title: flow.title,
            url: flow.url,
            metadata: flow.metadata
        }))

        await this.initStreamer(flows, { shouldStream: this.shouldStream })

        this.$emit('streaming-complete')
    }
}
</script>

<style scoped lang="scss">
.section-title {
    font-size: 1rem; // text-base
    font-weight: 500; // font-medium
    color: #111827; // text-gray-900
    margin: 0 0 0.75rem 0; // mb-3
}

.guide-flows {
    .resources-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
}
</style>
