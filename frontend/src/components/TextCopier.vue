<template>
    <span class="ff-text-copier">
        <span v-if="showText" @click="copyPath">
            <slot name="default">
                <span class="text">{{ text }}</span>
            </slot>
        </span>
        <button v-if="hasText" class="ff-icon-button" @click="copyPath">
            <DuplicateIcon v-if="!copied" class="ff-icon" />
            <CheckIcon v-else class="ff-icon ff-icon-check" />
        </button>
    </span>
</template>

<script>
import { CheckIcon, DuplicateIcon } from '@heroicons/vue/outline'

import Alert from '../services/alerts.js'

export default {
    name: 'TextCopier',
    components: { DuplicateIcon, CheckIcon },
    props: {
        text: {
            required: true,
            type: [String, Number]
        },
        confirmationType: {
            type: String,
            required: false,
            default: 'prompt',
            validator: (value) => {
                return ['prompt', 'alert'].includes(value)
            }
        },
        showText: {
            required: false,
            type: Boolean,
            default: true
        },
        promptPosition: {
            required: false,
            type: String,
            default: 'right',
            validator: (value) => {
                return ['left', 'right'].includes(value)
            }
        }
    },
    emits: ['copied'],
    data () {
        return {
            copied: false
        }
    },
    computed: {
        hasText () {
            return String(this.text).length
        }
    },
    methods: {
        async copyPath () {
            try {
                // Try modern clipboard API first
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(this.text)
                } else {
                    // Fallback for non-secure contexts (HTTP, not HTTPS)
                    const textArea = document.createElement('textarea')
                    textArea.value = this.text
                    textArea.style.position = 'fixed'
                    textArea.style.left = '-999999px'
                    textArea.style.top = '-999999px'
                    document.body.appendChild(textArea)
                    textArea.focus()
                    textArea.select()
                    document.execCommand('copy')
                    document.body.removeChild(textArea)
                }

                if (this.confirmationType === 'alert') {
                    Alert.emit('Copied to Clipboard', 'confirmation')
                } else {
                    this.copied = true
                    setTimeout(() => { this.copied = false }, 2000)
                    this.$emit('copied')
                }
            } catch (err) {
                console.error('Failed to copy to clipboard:', err)
                // Don't show alert to avoid inject() error
                // Just keep the icon in copy state (don't show checkmark)
            }
        }
    }
}
</script>

<style scoped lang="scss">
.ff-text-copier {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  position: relative;
  &:hover {
    cursor: pointer;
  }
  .ff-icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: $ff-grey-600;

    &:hover {
      color: $ff-indigo-600;
      background-color: $ff-indigo-50;
    }

    &:active {
      background-color: $ff-indigo-100;
    }

    .ff-icon {
      pointer-events: none;
    }

    .ff-icon-check {
      color: $ff-green-600;
    }
  }
  .ff-copied {
    background-color: black;
    color: white;
    padding: 3px;
    border-radius: 3px;
    position: absolute;
    margin-top: -3px;
    margin-left: 3px;
    display: none;
    z-index: 100;
    left: 100%;
  }
  .ff-copied-left {
    left: inherit;
    right: 100%;
  }
}
</style>
