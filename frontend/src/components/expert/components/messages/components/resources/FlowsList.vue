<template>
    <!-- Resources Section -->
    <div class="guide-flows">
        <h4 class="section-title">Related Flows</h4>
        <div class="resources-grid">
            <FlowResourceCard v-for="(flow, index) in flows" :key="index" :flow="flow" />
        </div>
    </div>
</template>

<script>
import FlowResourceCard from '../resource-cards/FlowResourceCard.vue'

export default {
    name: 'ListFlows',
    components: { FlowResourceCard },
    props: {
        flows: {
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

.guide-flows {
    .resources-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
}
</style>
