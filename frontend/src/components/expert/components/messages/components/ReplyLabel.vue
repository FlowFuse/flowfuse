<template>
    <span class="reply-label" data-el="reply-label">You</span>
</template>

<script>
// Marks the person's own words on the full page transcript: typed replies and folded answers
export default {
    name: 'ReplyLabel'
}
</script>

<style scoped lang="scss">
.reply-label {
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.4;
    color: var(--ff-color-text-subtle);
}
</style>
