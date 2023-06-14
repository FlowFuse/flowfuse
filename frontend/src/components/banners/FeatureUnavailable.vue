<template>
    <div
        class="ff-page-banner mb-5"
        data-el="page-banner-feature-unavailable"
    >
        <SparklesIcon class="ff-icon mr-2" style="stroke-width: 1px;" />
        This is a FlowForge Premium feature. Please upgrade your instance of Flowforge in order to use it.
        <SparklesIcon class="ff-icon ml-2" style="stroke-width: 1px;" />
    </div>
</template>

<script>
import { SparklesIcon } from '@heroicons/vue/outline'

export default {
    name: 'FeatureUnavailable',
    components: {
        SparklesIcon
    }
}
</script>
