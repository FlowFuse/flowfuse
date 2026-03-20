<template>
    <div class="guide-steps">
        <h4 class="section-title">
            <streamable-content string="Steps:" :should-stream="shouldStream" />
        </h4>
        <ol class="steps-list">
            <li v-for="(step, index) in visibleItems" :key="index" class="step-item">
                <div class="step-number">{{ index + 1 }}</div>
                <div class="step-content">
                    <h5 class="step-title">
                        <streamable-content v-model="step.title" :should-stream="shouldStream" />
                    </h5>
                    <p v-if="!shouldStream || step.title.streamed" class="step-detail">
                        <streamable-content v-model="step.detail" :should-stream="shouldStream" />
                    </p>
                </div>
            </li>
        </ol>
    </div>
</template>

<script>
import useStreamingList from '../../../../../../composables/StreamingListHelper.js'

import StreamableContent from './StreamableContent.vue'

export default {
    name: 'GuideStepsList',
    components: { StreamableContent },
    props: {
        steps: {
            required: true,
            type: Array
        },
        shouldStream: {
            type: Boolean,
            default: false
        }
    },
    emits: ['streaming-complete'],
    setup () {
        const { initStreamer, visibleItems } = useStreamingList()

        return { initStreamer, visibleItems }
    },
    async mounted () {
        await this.initStreamer(this.steps, { shouldStream: this.shouldStream })

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

.guide-steps {
    margin-bottom: 1rem; // mb-4

    .steps-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem; // space-y-3
    }

    .step-item {
        display: flex;
        align-items: flex-start;
    }

    .step-number {
        flex-shrink: 0;
        width: 1.5rem; // w-6
        height: 1.5rem; // h-6
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: $ff-indigo-600;
        color: white;
        font-size: 0.875rem; // text-sm
        border-radius: 50%; // rounded-full
        margin-right: 0.75rem; // mr-3
        margin-top: 0.125rem; // mt-0.5
    }

    .step-content {
        flex: 1;

        .step-title {
            font-size: 1rem;
            font-weight: 500;
            color: $ff-grey-900;
            margin: 0 0 0.25rem 0;
        }

        .step-detail {
            font-size: 0.875rem;
            color: $ff-grey-600;
            margin: 0.25rem 0 0 0;
            line-height: 1.5;
        }
    }
}

</style>
