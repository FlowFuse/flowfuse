<template>
    <div
        class="ff-page-banner my-4"
        data-el="page-banner-feature-unavailable-to-team"
    >
        <SparklesIcon class="ff-icon mr-2" style="stroke-width: 1px;" />
        <div>
            {{ featureName }} is not available for your current Team. Please <a class="ff-link" href="#" target="_blank" rel="noopener noreferrer">upgrade</a> your Team in order to use it.
        </div>
        <SparklesIcon class="ff-icon ml-2" style="stroke-width: 1px;" />
    </div>
</template>

<script>
import { SparklesIcon } from '@heroicons/vue/outline'

export default {
    name: 'FeatureUnavailableToTeam',
    components: {
        SparklesIcon
    },
    props: {
        featureName: {
            type: String,
            default: 'This feature'
        }
    }
}
</script>
