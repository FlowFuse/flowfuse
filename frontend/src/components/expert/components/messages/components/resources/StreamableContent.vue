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
            const btn = event.target.closest('.ff-code-block--copy')
            if (!btn) return
            const codeEl = btn.closest('.ff-code-block')?.querySelector('pre code')
            if (!codeEl) return
            navigator.clipboard.writeText(codeEl.textContent || '').then(() => {
                btn.innerHTML = CODE_BLOCK_ICONS.ICON_CHECK
                setTimeout(() => { btn.innerHTML = CODE_BLOCK_ICONS.ICON_DUPLICATE }, 2000)
            }).catch(() => {
                // execCommand is deprecated but remains the only fallback for non-secure
                // contexts (HTTP) where the Clipboard API is unavailable
                const textarea = document.createElement('textarea')
                textarea.value = codeEl.textContent || ''
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
    :deep(ul) {
        padding: revert;

        li {
            list-style: initial;
        }
    }

    :deep(.ff-code-block) {
        margin: 0.75rem 0;
        border: 1px solid $ff-grey-200;
        border-radius: 0.5rem;
        overflow: hidden;
        font-size: 0.8125rem;

        pre {
            margin: 0;
            padding: 1rem;
            overflow-x: auto;
            background: $ff-grey-50;
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
        padding: 0.3rem 0.75rem;
        background: $ff-grey-100;
        border-bottom: 1px solid $ff-grey-200;
        min-height: 2rem;
    }

    :deep(.ff-code-block--lang) {
        font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
        font-size: 0.6875rem;
        color: $ff-grey-500;
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
        color: $ff-color--action;
        transition: all 0.2s ease;

        svg {
            width: 1rem;
            height: 1rem;
            pointer-events: none;
        }

        &:hover {
            color: $ff-white;
            background-color: $ff-color--highlight;
        }
    }
}
</style>
