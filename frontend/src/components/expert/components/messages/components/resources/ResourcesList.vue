<template>
    <div v-if="resources && resources.length > 0" class="guide-resources">
        <h4 class="section-title">Related Resources</h4>
        <div class="resources-grid">
            <StandardResourceCard v-for="(resource, index) in resources" :key="index" :resource="resource" />
        </div>
    </div>
</template>

<script>
import StandardResourceCard from '../resource-cards/StandardResourceCard.vue'

export default {
    name: 'ListResources',
    components: { StandardResourceCard },
    props: {
        resources: {
            type: Array,
            required: true
        }
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
