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
        // Last-resort backstop: known throws are guarded at their source (e.g. the optional
        // streamable chains in the resource cards). This only catches a genuinely unexpected
        // render/lifecycle failure so one bad answer item degrades to a small fallback instead
        // of an uncaught error tearing down the whole chat. It is intentionally used once, per
        // answer item, in AiMessage — not as a per-section wrapper.
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
