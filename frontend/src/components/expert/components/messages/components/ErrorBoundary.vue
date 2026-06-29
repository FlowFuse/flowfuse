<template>
    <slot v-if="!failed" />
    <div v-else class="expert-render-error">
        Part of this response couldn't be displayed.
    </div>
</template>

<script>
export default {
    name: 'ErrorBoundary',
    emits: ['failed'],
    data () {
        return {
            failed: false
        }
    },
    errorCaptured (err) {
        // A descendant threw during render/lifecycle (e.g. an answer with a malformed
        // resource missing its url/metadata). Contain it here so a single bad answer
        // degrades to a small fallback instead of blanking the entire chat message.
        // Returning false stops the error from propagating further up the tree.
        // eslint-disable-next-line no-console
        console.error('[Expert] render error contained by ErrorBoundary:', err)
        this.failed = true
        // Let the streaming list advance even though this answer failed to render,
        // otherwise the parent would stall waiting for a streaming-complete that never fires.
        this.$emit('failed')
        return false
    }
}
</script>

<style scoped lang="scss">
.expert-render-error {
    font-size: 0.8125rem;
    color: var(--ff-color-text-subtle);
    font-style: italic;
}
</style>
