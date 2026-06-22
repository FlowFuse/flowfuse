<template>
    <div class="streamable-content" v-on="richContent ? { click: handleClick } : {}">
        <span v-if="!richContent" :key="text">{{ text }}</span>
        <template v-else>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div :key="text" v-html="text" />
        </template>
    </div>
</template>

<script>
import { mapState } from 'pinia'

import { CODE_BLOCK_ICONS, useMarkdownHelper } from '@/composables/strings/Markdown.js'
import useStreamingWords from '@/composables/strings/StreamingWords.js'
import { sanitize } from '@/composables/strings/String.js'

import { useProductAssistantStore } from '@/stores/product-assistant.js'

export default {
    name: 'StreamableContent',
    props: {
        modelValue: {
            type: Object,
            required: false,
            default: null,
            validate (value, props) {
                // modelValue is required when string is null
                if (!props.string && !value) {
                    console.warn('StreamableContent: string prop is required when modelValue is null')
                    return false
                }

                // modelValue must have a streamable key and a streamed key
                if (!value || typeof value !== 'object') {
                    return false
                }

                return (
                    typeof value.streamable === 'string' &&
                    typeof value.streamed === 'boolean'
                )
            }
        },
        string: {
            required: false,
            type: String,
            default: null,
            validator (value, props) {
                // string is required when modelValue is null
                if (!props.modelValue && !value) {
                    console.warn('StreamableContent: string prop is required when modelValue is null')
                    return false
                }
                return true
            }
        },
        shouldStream: {
            required: false,
            type: Boolean,
            default: true
        },
        richContent: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    emits: ['streaming-complete', 'update:modelValue'],
    setup () {
        const { stream, text, isStreaming } = useStreamingWords({
            delayMs: 30
        })
        const { markedInstance } = useMarkdownHelper()

        return { stream, streamedText: text, isStreaming, sanitize, markedInstance }
    },
    computed: {
        ...mapState(useProductAssistantStore, ['supportedActions']),
        rawText () {
            const rawText = this.modelValue ? this.modelValue.streamable : this.string

            if (this.richContent) {
                return this.markedInstance.parse(rawText || '')
            }

            return rawText
        },
        text () {
            const text = this.shouldStream ? this.streamedText : this.rawText

            return this.sanitize(text, {
                supportedActions: this.supportedActions,
                targetBlank: true,
                appendQueryParameters: {
                    utm_source: 'flowfuse-expert',
                    utm_medium: 'assistant',
                    utm_campaign: 'expert-chat'
                }
            })
        }
    },
    watch: {
        isStreaming (isStreaming) {
            if (!isStreaming) {
                this.$emit('streaming-complete')
                if (this.modelValue) {
                    this.$emit('update:modelValue', {
                        ...this.modelValue,
                        streamed: true
                    })
                }
            }
        }
    },
    mounted () {
        if (this.shouldStream) {
            this.stream(this.rawText)
        }
    },
    methods: {
        handleClick (event) {
            const copyBtn = event.target.closest('.ff-code-block--copy') || event.target.closest('.ff-table-block--copy')
            if (!copyBtn) return

            let textToCopy = ''
            const codeEl = copyBtn.closest('.ff-code-block')?.querySelector('pre code')
            const tableEl = copyBtn.closest('.ff-table-block')?.querySelector('table')

            if (codeEl) {
                textToCopy = codeEl.textContent || ''
            } else if (tableEl) {
                const rows = [...tableEl.querySelectorAll('tr')]
                textToCopy = rows.map(row => {
                    return [...row.querySelectorAll('th, td')].map(cell => cell.textContent.trim()).join('\t')
                }).join('\n')
            }

            if (!textToCopy) return

            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.innerHTML = CODE_BLOCK_ICONS.ICON_CHECK
                setTimeout(() => { copyBtn.innerHTML = CODE_BLOCK_ICONS.ICON_DUPLICATE }, 2000)
            }).catch(() => {
                const textarea = document.createElement('textarea')
                textarea.value = textToCopy
                textarea.style.position = 'fixed'
                textarea.style.left = '-999999px'
                document.body.appendChild(textarea)
                textarea.select()
                document.execCommand('copy')
                document.body.removeChild(textarea)
            })
        }
    }
}
</script>

<style scoped lang="scss">
.streamable-content {
    :deep(h1) {
        font-size: 1.125rem;
        font-weight: 600;
        line-height: 1.4;
        margin: 0.75rem 0 0.25rem;
    }

    :deep(h2) {
        font-size: 1.0625rem;
        font-weight: 600;
        line-height: 1.4;
        margin: 0.625rem 0 0.25rem;
    }

    :deep(h3) {
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.4;
        margin: 0.5rem 0 0.125rem;
    }

    :deep(h4),
    :deep(h5),
    :deep(h6) {
        font-size: 0.9375rem;
        font-weight: 600;
        line-height: 1.4;
        margin: 0.375rem 0 0.125rem;
    }

    :deep(.ff-checkbox) {
        margin-right: 0.25rem;
        color: var(--ff-color-text-subtle);
    }

    :deep(.ff-checkbox--checked) {
        color: var(--ff-color-accent);
    }

    :deep(h1:first-child),
    :deep(h2:first-child),
    :deep(h3:first-child) {
        margin-top: 0;
    }

    :deep(ul) {
        padding: revert;

        li {
            list-style: initial;
        }
    }

    :deep(ol) {
        padding: revert;

        li {
            list-style: decimal;
        }
    }

    :deep(blockquote) {
        margin: 0.5rem 0;
        padding: 0.25rem 0.75rem;
        border-left: 3px solid var(--ff-color-accent);
        color: var(--ff-color-text-subtle);
    }

    :deep(.ff-task-list) {
        padding-left: 0;

        li {
            list-style: none;
            display: flex;
            align-items: baseline;
            gap: 0.25rem;
        }
    }

    :deep(.ff-code-block) {
        margin: 0.75rem 0;
        border: 1px solid var(--ff-color-border);
        border-radius: 0.5rem;
        overflow: hidden;
        font-size: 0.8125rem;

        pre {
            margin: 0;
            padding: 1rem;
            overflow-x: auto;
            background: var(--ff-color-bg-surface);
            border-radius: 0;
            white-space: pre;
            overflow-wrap: normal;
            word-break: normal;

            code {
                font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
                background: transparent;
                border: none;
                padding: 0;
                white-space: pre;
                word-break: normal;
            }
        }
    }

    :deep(.ff-code-block--header) {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.3rem 1rem;
        background: var(--ff-color-bg-surface-raised);
        border-bottom: 1px solid var(--ff-color-border);
        min-height: 2rem;
    }

    :deep(.ff-code-block--lang) {
        font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
        font-size: 0.6875rem;
        color: var(--ff-color-text-subtle);
        text-transform: lowercase;
    }

    :deep(.ff-code-block--copy) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
        background: transparent;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        color: var(--ff-color-accent-text);
        transition: all 0.2s ease;

        svg {
            width: 1.5rem;
            height: 1.5rem;
            pointer-events: none;
        }

        &:hover {
            color: var(--ff-color-text-on-brand);
            background-color: var(--ff-color-accent);
        }
    }

    :deep(code) {
        padding: 0;
        border: none;
        border-radius: 0;
    }

    :deep(.ff-table-block) {
        margin: 0.75rem 0;
        border: 1px solid var(--ff-color-border);
        border-radius: 0.5rem;
        overflow: hidden;
    }

    :deep(.ff-table-block--header) {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 0.3rem 1rem;
        background: var(--ff-color-bg-surface-raised);
        border-bottom: 1px solid var(--ff-color-border);
        min-height: 2rem;
    }

    :deep(.ff-table-block--copy) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
        background: transparent;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        color: var(--ff-color-accent-text);
        transition: all 0.2s ease;

        svg {
            width: 1.5rem;
            height: 1.5rem;
            pointer-events: none;
        }

        &:hover {
            color: var(--ff-color-text-on-brand);
            background-color: var(--ff-color-accent);
        }
    }

    :deep(table) {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;

        th {
            text-align: left;
            font-weight: 600;
            background: var(--ff-color-bg-surface);
        }

        td, th {
            padding: 0.375rem 0.75rem;
            border: 1px solid var(--ff-color-border);
        }

        tbody tr:hover {
            background: var(--ff-color-bg-surface);
        }
    }
}
</style>
