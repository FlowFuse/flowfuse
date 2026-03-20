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
        background-color: $ff-grey-100;
        color: #1F2937;
        border-bottom-left-radius: 0.125rem;
    }

    &.human-message {
        background-color: $ff-indigo-600;
        color: white;
        border-bottom-right-radius: 0.125rem;
        width: fit-content;
        align-self: end;
    }

    &.system-message {
        justify-content: center;
        font-size: 0.875rem;
        line-height: 1.5;

        &.system-warning {
            background-color: #FEF3C7;
            color: #92400E;
            border-radius: 0.5rem;
            text-align: left;
            max-width: 100%;
            width: 100%;
        }

        &.system-expired {
            background-color: #FEE2E2; // red-100
            color: #991B1B; // red-900
        }
    }
}

</style>
