<template>
    <!-- Title and Summary -->
    <div v-if="title" class="guide-header">
        <h3 class="guide-title">{{ title }}</h3>
        <p v-if="summary" class="guide-summary">{{ summary }}</p>
    </div>
</template>

<script>
export default {
    name: 'GuideHeader',
    props: {
        title: {
            type: String,
            required: true
        },
        summary: {
            type: String,
            required: false,
            default: null
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
