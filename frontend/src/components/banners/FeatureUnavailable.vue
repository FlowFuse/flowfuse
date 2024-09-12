<template>
    <div
        class="ff-page-banner my-4"
        :class="{minimal: minimal}"
        data-el="page-banner-feature-unavailable"
    >
        <SparklesIcon class="ff-icon mr-2" style="stroke-width: 1px;" />
        <div>
            {{ message }}.
            <span v-if="!onlyCustomMessage">Please <a class="ff-link" href="https://flowfuse.com/docs/upgrade/open-source-to-premium/" target="_blank" rel="noopener noreferrer">upgrade</a> your instance of FlowFuse in order to use it.</span>
        </div>
        <SparklesIcon class="ff-icon ml-2" style="stroke-width: 1px;" />
    </div>
</template>

<script>
import { SparklesIcon } from '@heroicons/vue/outline'

export default {
    name: 'FeatureUnavailable',
    components: {
        SparklesIcon
    },
    props: {
        message: {
            type: String,
            default: 'This is a FlowFuse Enterprise feature'
        },
        minimal: {
            type: Boolean,
            required: false,
            default: false
        },
        onlyCustomMessage: {
            type: Boolean,
            required: false,
            default: false
        }
    }
}
</script>
