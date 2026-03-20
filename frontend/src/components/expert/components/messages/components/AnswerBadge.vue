<template>
    <div class="guide-badge">
        <span>{{ title }}</span>
    </div>
</template>

<script>
export default {
    name: 'AnswerBadge',
    props: {
        kind: {
            required: true,
            type: String
        }
    },
    computed: {
        title () {
            return this.kind === 'resources' ? 'Resources' : 'Setup Guide'
        }
    }
}
</script>

<style scoped lang="scss">
.section-title {
    font-size: 1rem;
    font-weight: 500;
    color: #111827;
}

.guide-badge {
    display: inline-flex;
    align-self: flex-start;

    span {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        background-color: $ff-indigo-100;
        color: $ff-indigo-700;
        font-size: 0.875rem;
        border-radius: 5px;
    }
}
</style>
