<template>
    <div v-if="resources && resources.length > 0" class="guide-resources">
        <h4 class="section-title">
            <streamable-content v-model="resourceTitle" :should-stream="shouldStream" />
        </h4>
        <div v-if="!shouldStream || resourceTitle.streamed" class="resources-grid">
            <StandardResourceCard
                v-for="(resource, index) in visibleItems"
                :key="index"
                :resource="resource"
                :should-stream="shouldStream"
                @streaming-complete="updateCardStreamingState(resource, index)"
            />
        </div>
    </div>
</template>

<script>

import useStreamingList from '../../../../../../composables/StreamingListHelper.js'
import StandardResourceCard from '../resource-cards/StandardResourceCard.vue'

import StreamableContent from './StreamableContent.vue'

export default {
    name: 'ListResources',
    components: { StreamableContent, StandardResourceCard },
    props: {
        resources: {
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
            resourceTitle: {
                streamable: 'Related Resources',
                streamed: false
            }
        }
    },
    async mounted () {
        const resources = this.resources.map(resource => ({
            title: resource.title,
            url: resource.url,
            metadata: resource.metadata
        }))

        await this.initStreamer(resources, { shouldStream: this.shouldStream })

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

.guide-resources {
    .resources-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
}
</style>
