<template>
    <div class="ff-expert">
        <!-- Messages Container -->
        <div
            ref="messagesContainer"
            class="messages-container"
            @scroll="handleScroll"
        >
            <!-- Info Banner -->
            <div class="info-banner">
                <p class="info-text">
                    Uses OpenAI GPT-4.1 Mini with access to all FlowFuse
                    <a href="/docs" class="info-link">documentation</a>
                    and our Get Started
                    <a href="https://www.youtube.com/watch?v=K4xw09DbSdI&list=PLpcyqc7kNgp1dCDliNM4WOPf6d42Qmjvf" target="_blank" rel="noopener noreferrer" class="info-link">YouTube playlist</a>
                </p>
            </div>

            <!-- Messages -->
            <div v-for="(message, index) in messages" :key="index" class="message-wrapper">
                <!-- Loading indicator for AI -->
                <expert-loading-dots v-if="message.type === 'loading'" />

                <!-- Regular message -->
                <expert-chat-message
                    v-else
                    :message="message"
                    :is-streaming="isStreaming(index)"
                >
                    <!-- Rich guide content slot -->
                    <template v-if="message.kind === 'guide'" #rich-content>
                        <expert-rich-guide :guide="message.guide" />
                    </template>

                    <!-- Rich resources content slot -->
                    <template v-if="message.kind === 'resources'" #rich-content>
                        <expert-rich-resources :resources="message.resources" />
                    </template>
                </expert-chat-message>
            </div>

            <!-- Scroll anchor -->
            <div ref="scrollAnchor" class="scroll-anchor" />
        </div>

        <!-- Input Area -->
        <expert-chat-input
            :is-generating="isGenerating"
            :has-messages="hasMessages"
            @send="handleSendMessage"
            @stop="handleStopGeneration"
            @start-over="handleStartOver"
        />
    </div>
</template>

<script>
import { markRaw } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import ExpertChatInput from './ExpertChatInput.vue'
import ExpertChatMessage from './ExpertChatMessage.vue'
import ExpertLoadingDots from './ExpertLoadingDots.vue'
import ExpertRichGuide from './ExpertRichGuide.vue'
import ExpertRichResources from './ExpertRichResources.vue'

export default {
    name: 'ExpertPanel',
    components: {
        ExpertChatInput,
        ExpertChatMessage,
        ExpertLoadingDots,
        ExpertRichGuide,
        ExpertRichResources
    },
    data () {
        return {
            streamingWordIndex: -1,
            streamingWords: [],
            streamingTimer: null,
            scrollCheckDebounce: null
        }
    },
    computed: {
        ...mapState('product/expert', [
            'messages',
            'isGenerating',
            'autoScrollEnabled',
            'sessionId',
            'context',
            'abortController'
        ]),
        ...mapGetters('product/expert', [
            'hasMessages',
            'lastMessage'
        ])
    },
    watch: {
        messages: {
            handler () {
                // Auto-scroll when new messages arrive
                if (this.autoScrollEnabled) {
                    this.$nextTick(() => {
                        this.scrollToBottom()
                    })
                }
            },
            deep: true
        }
    },
    mounted () {
        // Session ID is now auto-initialized in Vuex store when first message is sent
    },
    beforeUnmount () {
        // Clean up timers
        if (this.streamingTimer) {
            clearTimeout(this.streamingTimer)
        }
        if (this.scrollCheckDebounce) {
            clearTimeout(this.scrollCheckDebounce)
        }
    },
    methods: {
        ...mapActions('product/expert', [
            'handleMessage',
            'addMessage',
            'updateLastMessage',
            'clearConversation',
            'startOver',
            'setAutoScroll'
        ]),

        async handleSendMessage (query) {
            if (!query.trim()) return

            // Create abort controller for this request
            const controller = new AbortController()

            // Call Vuex action to handle API logic
            const result = await this.handleMessage({
                query,
                instanceId: null,
                abortController: markRaw(controller)
            })

            // Handle UI-specific processing if successful
            if (result.success && result.answer && Array.isArray(result.answer)) {
                for (const item of result.answer) {
                    if (item.kind === 'guide') {
                        // Add rich guide message
                        this.addMessage({
                            type: 'ai',
                            kind: 'guide',
                            guide: item,
                            content: item.title || 'Setup Guide',
                            timestamp: Date.now()
                        })
                    } else if (item.kind === 'resources') {
                        // Add rich resources message
                        this.addMessage({
                            type: 'ai',
                            kind: 'resources',
                            resources: item,
                            content: item.title || 'Resources',
                            timestamp: Date.now()
                        })
                    } else if (item.kind === 'chat') {
                        // Add chat message with streaming effect
                        await this.streamMessage(item.content)
                    }
                }
            } else if (result.success && (!result.answer || !Array.isArray(result.answer))) {
                // Fallback for unexpected response format
                this.addMessage({
                    type: 'ai',
                    content: 'Sorry, I received an unexpected response format.',
                    timestamp: Date.now()
                })
            }
            // Errors are already handled in the Vuex action
        },

        async streamMessage (content) {
            // Split content into words for streaming effect
            const words = content.split(' ')
            this.streamingWords = words
            this.streamingWordIndex = 0

            // Add empty AI message
            this.addMessage({
                type: 'ai',
                content: '',
                isStreaming: true,
                timestamp: Date.now()
            })

            // Stream words one by one
            return new Promise((resolve) => {
                const streamNextWord = () => {
                    if (this.streamingWordIndex >= this.streamingWords.length) {
                        // Streaming complete
                        const lastMsg = this.lastMessage
                        if (lastMsg) {
                            lastMsg.isStreaming = false
                        }
                        this.streamingWordIndex = -1
                        this.streamingWords = []
                        resolve()
                        return
                    }

                    // Append next word
                    const word = this.streamingWords[this.streamingWordIndex]
                    const currentContent = this.lastMessage?.content || ''
                    const newContent = currentContent + (currentContent ? ' ' : '') + word

                    this.updateLastMessage(newContent)
                    this.streamingWordIndex++

                    // Schedule next word
                    this.streamingTimer = setTimeout(streamNextWord, 30)
                }

                streamNextWord()
            })
        },

        handleStopGeneration () {
            if (this.abortController) {
                this.abortController.abort()
            }

            // Stop streaming effect
            if (this.streamingTimer) {
                clearTimeout(this.streamingTimer)
                this.streamingTimer = null
            }

            // Complete the streaming message
            if (this.streamingWordIndex >= 0 && this.lastMessage?.isStreaming) {
                this.lastMessage.isStreaming = false
                this.streamingWordIndex = -1
                this.streamingWords = []
            }
        },

        handleStartOver () {
            // Confirm before clearing
            if (this.hasMessages) {
                if (confirm('Are you sure you want to start over? This will clear the conversation.')) {
                    this.startOver()
                }
            }
        },

        handleScroll () {
            // Debounce scroll detection
            if (this.scrollCheckDebounce) {
                clearTimeout(this.scrollCheckDebounce)
            }

            this.scrollCheckDebounce = setTimeout(() => {
                const container = this.$refs.messagesContainer
                if (!container) return

                // Check if user has scrolled away from bottom
                const scrolledToBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100

                if (scrolledToBottom && !this.autoScrollEnabled) {
                    // Re-enable auto-scroll if user scrolls back to bottom
                    this.setAutoScroll(true)
                } else if (!scrolledToBottom && this.autoScrollEnabled) {
                    // Disable auto-scroll if user scrolls up
                    this.setAutoScroll(false)
                }
            }, 100)
        },

        scrollToBottom () {
            const anchor = this.$refs.scrollAnchor
            if (anchor) {
                anchor.scrollIntoView({ behavior: 'smooth' })
            }
        },

        isStreaming (index) {
            return index === this.messages.length - 1 &&
                   this.messages[index]?.isStreaming === true
        }
    }
}
</script>

<style lang="scss" scoped>
.ff-expert {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    overflow: hidden; // Prevent this container from scrolling
}

.messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem; // p-4
    scroll-behavior: smooth;
    min-height: 0; // Important for flex child overflow

    // Custom scrollbar styling
    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background-color: $ff-grey-300;
        border-radius: 4px;

        &:hover {
            background-color: $ff-grey-400;
        }
    }
}

.info-banner {
    background-color: #EEF2FF; // indigo-100
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.75rem 1rem;

    .info-text {
        color: #4338CA; // indigo-700
        font-size: 0.875rem;
        margin: 0;
        line-height: 1.5;
    }

    .info-link {
        color: inherit;
        text-decoration: underline;

        &:hover {
            color: #3730A3; // indigo-800
        }
    }
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 2rem;
    color: $ff-grey-600;

    .empty-state-icon {
        width: 4rem;
        height: 4rem;
        margin-bottom: 1rem;
        color: $ff-indigo-400;

        svg {
            width: 100%;
            height: 100%;
        }
    }

    h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: $ff-grey-900;
        margin: 0 0 0.5rem 0;
    }

    p {
        font-size: 1rem;
        margin: 0;
        max-width: 400px;
    }
}

.message-wrapper {
    margin-bottom: 0.5rem;
}

.scroll-anchor {
    height: 1px;
}
</style>
