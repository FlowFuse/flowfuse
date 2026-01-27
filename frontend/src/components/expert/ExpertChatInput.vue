<template>
    <div class="ff-expert-input">
        <!-- Action buttons row -->
        <div class="action-buttons">
            <button
                type="button"
                class="btn-start-over"
                :disabled="!hasUserMessages || (isGenerating && !isSessionExpired)"
                @click="handleStartOver"
            >
                Start over
            </button>
            <div class="right-buttons">
                <capabilities-selector v-if="isOperatorAgent" />
            </div>
        </div>
        <div class="input-wrapper" :class="{ 'focused': isTextareaFocused }">
            <!-- Textarea -->
            <textarea
                ref="textarea"
                v-model="inputText"
                class="chat-input"
                :placeholder="placeholderText"
                :disabled="isInputDisabled"
                @keydown="handleKeydown"
                @focus="isTextareaFocused = true"
                @blur="isTextareaFocused = false"
            />

            <div class="actions">
                <div class="left">
                    <include-selection-button v-if="hasUserSelection" v-model="includeSelection" />
                </div>

                <div class="right">
                    <button
                        v-if="isGenerating && !isSessionExpired"
                        type="button"
                        class="btn-stop"
                        @click="handleStop"
                    >
                        Stop
                    </button>
                    <button
                        v-else-if="!isSessionExpired"
                        type="button"
                        class="btn-send"
                        :disabled="!canSend"
                        @click="handleSend"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { mapGetters } from 'vuex'

import CapabilitiesSelector from './components/CapabilitiesSelector.vue'
import IncludeSelectionButton from './components/IncludeSelectionButton.vue'

export default {
    name: 'ExpertChatInput',
    components: {
        IncludeSelectionButton,
        CapabilitiesSelector
    },
    props: {
        isGenerating: {
            type: Boolean,
            default: false
        },
        hasMessages: {
            type: Boolean,
            default: false
        },
        hasUserMessages: {
            type: Boolean,
            default: false
        },
        isSessionExpired: {
            type: Boolean,
            default: false
        },
        isOperatorAgent: {
            type: Boolean,
            default: false
        },
        hasSelectedCapabilities: {
            type: Boolean,
            default: false
        }
    },
    emits: ['send', 'stop', 'start-over'],
    data () {
        return {
            inputText: '',
            includeSelection: true,
            isTextareaFocused: false
        }
    },
    computed: {
        ...mapGetters('product/assistant', ['hasUserSelection']),
        isInputDisabled () {
            if (this.isSessionExpired) return true
            if (this.isGenerating) return true
            if (this.isOperatorAgent && !this.hasSelectedCapabilities) return true
            return false
        },
        canSend () {
            return this.inputText.trim().length > 0 && !this.isInputDisabled
        },
        placeholderText () {
            if (this.isOperatorAgent && !this.hasSelectedCapabilities) {
                return 'Select a resource to get started'
            }
            return this.isOperatorAgent
                ? 'Tell us what you want to know about'
                : 'Tell us what you need help with'
        }
    },
    methods: {
        handleSend () {
            if (!this.canSend) return

            const message = this.inputText.trim()
            this.$emit('send', message)
            this.inputText = ''
            this.$nextTick(() => {
                this.$refs.textarea.focus()
            })
        },
        handleStop () {
            this.$emit('stop')
        },
        handleStartOver () {
            this.$emit('start-over')
            this.inputText = ''
        },
        handleKeydown (event) {
            // Enter without Shift = send message
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                this.handleSend()
            }
            // Shift+Enter = new line (default behavior)
        }
    }
}
</script>

<style scoped lang="scss">
.ff-expert-input {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 1rem; // p-4
    border-top: 1px solid #E5E7EB; // border-gray-200
    background: white;
    flex-shrink: 0; // Prevent input area from shrinking
}

.action-buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.right-buttons {
    display: flex;
    gap: 0.5rem;
}

button {
    padding: 0.5rem 0.75rem; // py-2 px-3
    border-radius: 9999px; // rounded-full
    font-size: 0.875rem; // text-sm
    cursor: pointer;
    transition: colors 0.2s ease;
    border: 1px solid transparent;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}

.btn-start-over {
    background-color: white;
    color: inherit;
    border-color: #C7D2FE; // indigo-300
    padding: 0.25rem 0.50rem;
    border-radius: 5px;

    &:hover:not(:disabled) {
        background-color: #F9FAFB; // gray-50
    }
}

.btn-send {
    background-color: $ff-indigo-600;
    color: white;
    border-color: $ff-indigo-600;
    border-radius: 5px;
    padding: 0.25rem 0.50rem;

    &:hover:not(:disabled) {
        background-color: $ff-indigo-700;
    }
}

.btn-stop {
    background-color: white;
    color: inherit;
    border-color: #C7D2FE; // indigo-300
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 5px;
    padding: 0.25rem 0.50rem;

    &::before {
        content: '';
        width: 0.75rem; // w-3
        height: 0.75rem; // h-3
        background-color: #1F2937; // gray-800
        border-radius: 0.125rem; // rounded-sm
    }

    &:hover {
        background-color: #F9FAFB; // gray-50
    }
}

.input-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 10vh;
    border: 2px solid #D1D5DB; // border-2 border-gray-300
    border-radius: 0.5rem; // rounded-lg
    transition: border-color 0.2s ease;

    &.focused {
        border-color: $ff-indigo-500;
    }

    .chat-input {
        flex: 1;
        width: 100%;
        padding: 1rem; // p-4
        box-sizing: border-box;
        overflow-y: auto;
        border: none;
        outline: none;
        font-size: 0.875rem; // text-sm
        line-height: 1.5;
        color: #111827; // text-gray-900
        resize: none;
        font-family: inherit;
        background: white;

        &:focus {
            outline: none;
        }

        &:disabled {
            cursor: not-allowed;
            background-color: #F9FAFB; // bg-gray-50
            color: #6B7280; // text-gray-500
        }

        &::placeholder {
            color: #9CA3AF; // placeholder gray
        }
    }

    .actions {
        padding: .5rem;
        display: flex;
        justify-content: space-between;

        .left {
            display: flex;
            justify-content: flex-start;
        }

        .right {
            display: flex;
            justify-content: flex-end;
        }
    }
}
</style>
