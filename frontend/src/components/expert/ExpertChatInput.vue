<template>
    <div class="ff-expert-input">
        <!-- Action buttons row -->
        <div class="action-buttons">
            <button
                type="button"
                class="btn-start-over"
                :disabled="!hasMessages || isGenerating"
                @click="handleStartOver"
            >
                Start over
            </button>
            <div class="right-buttons">
                <button
                    v-if="isGenerating"
                    type="button"
                    class="btn-stop"
                    @click="handleStop"
                >
                    Stop
                </button>
                <button
                    v-else
                    type="button"
                    class="btn-send"
                    :disabled="!canSend"
                    @click="handleSend"
                >
                    Send
                </button>
            </div>
        </div>

        <!-- Textarea with gradient border wrapper -->
        <div class="textarea-wrapper" :class="{ 'has-gradient': showGradient }">
            <textarea
                ref="textarea"
                v-model="inputText"
                class="chat-input"
                placeholder="Ask me anything about FlowFuse..."
                :disabled="isGenerating"
                @keydown="handleKeydown"
                @input="autoResize"
            />
        </div>
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
        showGradient: {
            type: Boolean,
            default: true
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
    mounted () {
        this.autoResize()
    },
    methods: {
        handleSend () {
            if (!this.canSend) return

            const message = this.inputText.trim()
            this.$emit('send', message)
            this.inputText = ''
            this.$nextTick(() => {
                this.autoResize()
                this.$refs.textarea.focus()
            })
        },
        handleStop () {
            this.$emit('stop')
        },
        handleStartOver () {
            this.$emit('start-over')
            this.inputText = ''
            this.$nextTick(() => {
                this.autoResize()
            })
        },
        handleKeydown (event) {
            // Enter without Shift = send message
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                this.handleSend()
            }
            // Shift+Enter = new line (default behavior)
        },
        autoResize () {
            const textarea = this.$refs.textarea
            if (!textarea) return

            // Reset height to auto to get the correct scrollHeight
            textarea.style.height = 'auto'
            // Set height to scrollHeight (content height)
            const newHeight = Math.min(textarea.scrollHeight, 200) // Max height 200px
            textarea.style.height = newHeight + 'px'
        }
    }
}
</script>

<style scoped lang="scss">
.ff-expert-input {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid $ff-grey-200;
    background: white;
}

.action-buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.right-buttons {
    display: flex;
    gap: 0.5rem;
}

button {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}

.btn-start-over {
    background-color: white;
    color: $ff-grey-700;
    border-color: $ff-grey-300;

    &:hover:not(:disabled) {
        background-color: $ff-grey-50;
        border-color: $ff-grey-400;
    }

    &:active:not(:disabled) {
        background-color: $ff-grey-100;
    }
}

.btn-send {
    background-color: $ff-indigo-600;
    color: white;

    &:hover:not(:disabled) {
        background-color: $ff-indigo-700;
    }

    &:active:not(:disabled) {
        background-color: $ff-indigo-800;
    }
}

.btn-stop {
    background-color: $ff-red-600;
    color: white;

    &:hover {
        background-color: $ff-red-700;
    }

    &:active {
        background-color: $ff-red-800;
    }
}

.textarea-wrapper {
    position: relative;
    border-radius: 0.5rem;
    border: 1px solid $ff-grey-300;
    background: white;

    &.has-gradient {
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(90deg, #ef4444, #6366f1, #ef4444) border-box;
        border: 2px solid transparent;
        animation: gradient-flow-lr 4s linear infinite;
        background-size: 200% 100%;
    }

    &:focus-within {
        border-color: $ff-indigo-500;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
}

.chat-input {
    width: 100%;
    min-height: 60px;
    max-height: 200px;
    padding: 0.75rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.9375rem;
    line-height: 1.5;
    resize: none;
    outline: none;
    font-family: inherit;
    background: transparent;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    &::placeholder {
        color: $ff-grey-400;
    }
}

@keyframes gradient-flow-lr {
    0% {
        background-position: 0% 50%;
    }
    100% {
        background-position: 200% 50%;
    }
}
</style>
