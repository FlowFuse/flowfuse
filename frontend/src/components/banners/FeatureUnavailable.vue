<template>
    <div
        class="ff-page-banner my-4"
        data-el="page-banner-feature-unavailable"
    >
        <SparklesIcon class="ff-icon mr-2" style="stroke-width: 1px;" />
        <div>
            {{ message }}. Please <a class="ff-link" href="https://flowfuse.com/docs/upgrade/open-source-to-premium/" target="_blank" rel="noopener noreferrer">upgrade</a> your instance of FlowFuse in order to use it.
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
        }
    }
}
</script>
