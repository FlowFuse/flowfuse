<template>
    <div class="ff-expert-input">
        <!-- Action buttons row -->
        <div class="action-buttons">
            <button
                type="button"
                class="btn-start-over"
                :disabled="!hasMessages || (isGenerating && !isSessionExpired)"
                @click="handleStartOver"
            >
                Start over
            </button>
            <div class="right-buttons">
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

        <!-- Textarea -->
        <textarea
            ref="textarea"
            v-model="inputText"
            class="chat-input"
            placeholder="Tell us what you need help with"
            :disabled="isGenerating"
            @keydown="handleKeydown"
        />
    </div>
</template>

<script>
export default {
    name: 'ExpertChatInput',
    props: {
        isGenerating: {
            type: Boolean,
            default: false
        },
        hasMessages: {
            type: Boolean,
            default: false
        },
        isSessionExpired: {
            type: Boolean,
            default: false
        }
    },
    emits: ['send', 'stop', 'start-over'],
    data () {
        return {
            inputText: ''
        }
    },
    computed: {
        canSend () {
            return this.inputText.trim().length > 0 && !this.isGenerating
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
    margin-bottom: 1rem; // pb-4
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

    &:hover:not(:disabled) {
        background-color: #F9FAFB; // gray-50
    }
}

.btn-send {
    background-color: $ff-indigo-600;
    color: white;
    border-color: $ff-indigo-600;

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

    &::before {
        content: '';
        width: 0.75rem; // w-3
        height: 0.75rem; // h-3
        background-color: #1F2937; // gray-800
        border-radius: 0.125rem; // rounded-xs
    }

    &:hover {
        background-color: #F9FAFB; // gray-50
    }
}

.chat-input {
    width: 100%;
    height: 6rem; // h-24
    padding: 1rem; // p-4
    border: 2px solid #D1D5DB; // border-2 border-gray-300
    border-radius: 0.5rem; // rounded-md
    font-size: 0.875rem; // text-sm
    line-height: 1.5;
    color: #111827; // text-gray-900
    resize: none;
    outline: none;
    font-family: inherit;
    background: white;

    &:focus {
        border-color: $ff-indigo-500; // focus:border-indigo-500
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
</style>
