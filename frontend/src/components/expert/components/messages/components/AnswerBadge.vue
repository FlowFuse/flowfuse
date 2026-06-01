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
    color: var(--ff-color-text-strong);
}

.guide-badge {
    display: inline-flex;
    align-self: flex-start;

    span {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        background-color: var(--ff-color-accent-surface);
        color: var(--ff-color-accent-hover);
        font-size: 0.875rem;
        border-radius: 5px;
    }
}
</style>
