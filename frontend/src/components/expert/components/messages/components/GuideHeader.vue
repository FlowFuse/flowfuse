<template>
    <!-- Title and Summary -->
    <div v-if="title" class="guide-header">
        <h3 class="guide-title">
            <streamable-content v-model="streamableTitle" :should-stream="shouldStream" />
        </h3>
        <p class="guide-summary">
            <streamable-content v-if="!shouldStream || streamableTitle.streamed" v-model="streamableSummary" :should-stream="shouldStream" />
        </p>
    </div>
</template>

<script>
import StreamableContent from './resources/StreamableContent.vue'

export default {
    name: 'GuideHeader',
    components: { StreamableContent },
    props: {
        title: {
            type: String,
            required: true
        },
        summary: {
            type: String,
            required: false,
            default: null
        },
        shouldStream: {
            type: Boolean,
            default: false
        }
    },
    emits: ['streaming-complete'],
    data () {
        return {
            streamableSummary: {
                streamable: this.summary,
                streamed: false
            },
            streamableTitle: {
                streamable: this.title,
                streamed: false
            }
        }
    },
    watch: {
        streamableSummary (streamableTitle) {
            if (streamableTitle.streamed) {
                this.$emit('streaming-complete')
            }
        }
    }
}
</script>

<style scoped lang="scss">
.guide-header {
    .guide-title {
        font-size: 1.125rem; // text-lg
        font-weight: 600; // font-semibold
        color: #111827; // text-gray-900
        margin: 0 0 0.5rem 0; // mb-2
    }

    .guide-summary {
        color: #374151; // text-gray-700
        margin: 0 0 1rem 0; // mb-4
        line-height: 1.625;
    }
}
</style>
