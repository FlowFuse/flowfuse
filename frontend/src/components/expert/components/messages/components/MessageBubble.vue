<template>
    <div
        class="message-bubble flex flex-col gap-1"
        :class="{'ai-message': isAiMessage, 'human-message': isHumanMessage, 'system-message': isSystemMessage, [`system-${variant}`]: variant}"
    >
        <slot />
    </div>
</template>

<script>
export default {
    name: 'MessageBubble',
    props: {
        type: {
            required: true,
            type: String
        },
        variant: {
            required: false,
            type: String,
            default: null
        }
    },
    computed: {
        isAiMessage () {
            return this.type === 'ai'
        },
        isHumanMessage () {
            return this.type === 'human'
        },
        isSystemMessage () {
            return this.type === 'system'
        }
    }
}
</script>

<style scoped lang="scss">
.message-bubble {
    padding: 0.5rem 1rem;
    word-wrap: break-word;
    overflow-wrap: break-word;
    border-radius: 0.5rem;

    &.ai-message {
        justify-content: flex-start;
        background-color: var(--ff-color-bg-surface-raised);
        color: var(--ff-color-text);
        border-bottom-left-radius: 0.125rem;
    }

    &.human-message {
        background-color: var(--ff-color-accent);
        color: var(--ff-color-text-on-brand);
        border-bottom-right-radius: 0.125rem;
        width: fit-content;
        align-self: end;
    }

    &.system-message {
        justify-content: center;
        font-size: 0.875rem;
        line-height: 1.5;

        &.system-warning {
            background-color: var(--ff-color-status-warning-bg);
            color: var(--ff-color-status-warning-text);
            border-radius: 0.5rem;
            text-align: left;
            max-width: 100%;
            width: 100%;
        }

        &.system-expired {
            background-color: var(--ff-color-status-error-bg);
            color: var(--ff-color-danger-darker);
        }
    }
}

</style>
