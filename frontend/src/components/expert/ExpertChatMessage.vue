<template>
    <div class="ff-expert-message" :class="messageClass">
        <div class="message-bubble" :class="{ 'rich-guide-bubble': hasRichContent }">
            <!-- Rich guide content (for AI responses with kind="guide") -->
            <slot name="rich-content" />

            <!-- Regular text content (for chat messages) -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="!hasRichContent" class="message-text" v-html="formattedContent" />

            <div v-if="hasIssues" class="issues">
                <h4><exclamation-icon class="ff-icon" /> Issues</h4>
                <ul>
                    <li v-for="issue in issues" :key="issue">{{ sanitize(issue) }}</li>
                </ul>
            </div>

            <div v-if="hasSuggestions" class="suggestions">
                <h4><information-circle-icon class="ff-icon" /> Suggestions</h4>
                <ul>
                    <li v-for="suggestion in suggestions" :key="suggestion">{{ sanitize(suggestion) }}</li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
import { ExclamationIcon, InformationCircleIcon } from '@heroicons/vue/solid'
import { marked } from 'marked'
import { h, render } from 'vue'

import { sanitize } from '../../composables/String.js'

export default {
    name: 'ExpertChatMessage',
    components: { ExclamationIcon, InformationCircleIcon },
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
    setup () {
        return { sanitize }
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
                return this.sanitize(this.message.content)
            }
            // Convert markdown to HTML
            const content = []
            content.push(this.message.content || '')

            const html = marked(content.join('\n'), {
                breaks: true,
                gfm: true
            })
            return this.sanitize(html, {
                targetBlank: true,
                appendQueryParameters: {
                    utm_source: 'flowfuse-expert',
                    utm_medium: 'assistant',
                    utm_campaign: 'expert-chat'
                }
            })
        },
        issues () {
            return this.message.resources.issues
        },
        suggestions () {
            return this.message.resources.suggestions
        },
        hasIssues () {
            return (this.message.resources?.issues && this.message.resources?.issues.length > 0)
        },
        hasSuggestions () {
            return (this.message.resources?.suggestions && this.message.resources?.suggestions.length > 0)
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

        .issues, .suggestions {
            margin-top: 1.25rem;
            h4 {
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 5px;
                color: $ff-grey-600;

                .ff-icon {
                    color: $ff-grey-500;
                }
            }

            ul {
                list-style: disc;
                padding-left: 1.4rem;

                li {
                    margin-top: .5rem;
                }
            }
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
        list-style: square;
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

</style>
