<template>
    <div class="ff-expert-message" :class="messageClass">
        <div class="message-bubble" :class="{ 'rich-guide-bubble': hasRichContent }">
            <!-- Rich guide content (for AI responses with kind="guide") -->
            <slot name="rich-content" />

            <!-- Regular text content (for chat messages) -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="!hasRichContent" class="message-text" v-html="formattedContent" />
        </div>
    </div>
</template>

<script>
import DOMPurify from 'dompurify'
import { marked } from 'marked'

export default {
    name: 'ExpertChatMessage',
    props: {
        message: {
            type: Object,
            required: true,
            validator: (msg) => {
                return msg.content !== undefined && msg.type !== undefined
            }
        },
        isStreaming: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        messageClass () {
            return {
                'message-human': this.message.type === 'human',
                'message-ai': this.message.type === 'ai',
                'message-system': this.message.type === 'system',
                'is-streaming': this.isStreaming,
                [`system-${this.message.variant}`]: this.message.type === 'system' && this.message.variant
            }
        },
        hasRichContent () {
            return this.$slots['rich-content'] !== undefined
        },
        formattedContent () {
            if (this.message.isHTML) {
                // Content is already HTML (from rich guide or pre-formatted)
                return DOMPurify.sanitize(this.message.content)
            }
            // Convert markdown to HTML
            const html = marked(this.message.content || '', {
                breaks: true,
                gfm: true
            })
            return DOMPurify.sanitize(html)
        }
    }
}
</script>

<style scoped lang="scss">
.ff-expert-message {
    display: flex;
    width: 100%;
    margin-bottom: 1rem;

    &.message-human {
        justify-content: flex-end;

        .message-bubble {
            background-color: $ff-indigo-600;
            color: white;
            border-radius: 0.5rem;
            border-bottom-right-radius: 0.125rem;
        }
    }

    &.message-ai {
        justify-content: flex-start;

        .message-bubble {
            background-color: $ff-grey-100;
            color: #1F2937; // gray-800
            border-radius: 0.5rem;
            border-bottom-left-radius: 0.125rem;
        }
    }

    &.message-system {
        justify-content: center;

        .message-bubble {
            background-color: #FEF3C7; // amber-100
            color: #92400E; // amber-900
            border-radius: 0.5rem;
            text-align: left;
            max-width: 100%;
            width: 100%;
        }

        .message-text {
            font-size: 0.875rem;
            line-height: 1.5;
        }

        &.system-expired .message-bubble {
            background-color: #FEE2E2; // red-100
            color: #991B1B; // red-900
        }
    }

    &.is-streaming .message-bubble {
        position: relative;

        &::after {
            content: '';
            display: inline-block;
            width: 3px;
            height: 1em;
            background-color: currentColor;
            margin-left: 2px;
            animation: blink 1s infinite;
        }
    }
}

.message-bubble {
    max-width: 90%; // Always leave a gap on the side
    padding: 0.5rem 1rem; // py-2 px-4
    word-wrap: break-word;
    overflow-wrap: break-word;

    &.rich-guide-bubble {
        padding: 1rem; // py-4 px-4
    }
}

.message-text {
    font-size: 1rem;
    line-height: 1.5;

    :deep(p) {
        margin: 0 0 0.5rem 0;

        &:last-child {
            margin-bottom: 0;
        }
    }

    :deep(ul), :deep(ol) {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
    }

    :deep(li) {
        margin: 0.25rem 0;
    }

    :deep(code) {
        background-color: rgba(0, 0, 0, 0.05);
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-family: monospace;
        font-size: 0.875em;
    }

    :deep(pre) {
        background-color: rgba(0, 0, 0, 0.05);
        padding: 0.75rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        margin: 0.5rem 0;

        code {
            background-color: transparent;
            padding: 0;
        }
    }

    :deep(a) {
        color: $ff-indigo-600;
        text-decoration: underline;

        &:hover {
            color: $ff-indigo-700;
        }
    }

    :deep(strong) {
        font-weight: 600;
    }

    :deep(em) {
        font-style: italic;
    }
}

@keyframes blink {
    0%, 49% {
        opacity: 1;
    }
    50%, 100% {
        opacity: 0;
    }
}
</style>
