<template>
    <div class="ff-expert">
        <!-- Messages Container -->
        <div
            ref="messagesContainer"
            class="messages-container"
            @scroll="handleScroll"
        >
            <!-- Empty state -->
            <div v-if="messages.length === 0" class="empty-state">
                <div class="empty-state-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <h3>FlowFuse Expert</h3>
                <p>Ask me anything about FlowFuse, Node-RED, or industrial IoT workflows.</p>
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

import ExpertAPI from '../../api/expert.js'

import ExpertChatInput from './ExpertChatInput.vue'
import ExpertChatMessage from './ExpertChatMessage.vue'
import ExpertLoadingDots from './ExpertLoadingDots.vue'
import ExpertRichGuide from './ExpertRichGuide.vue'

export default {
    name: 'ExpertPanel',
    components: {
        ExpertChatInput,
        ExpertChatMessage,
        ExpertLoadingDots,
        ExpertRichGuide
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
        // Initialize session if not already set
        if (!this.sessionId) {
            const newSessionId = ExpertAPI.initSession()
            this.setContext({ sessionId: newSessionId })
        }
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
            'addMessage',
            'updateLastMessage',
            'clearConversation',
            'setGenerating',
            'setAutoScroll',
            'setAbortController',
            'setContext'
        ]),

        async handleSendMessage (query) {
            if (!query.trim()) return

            // Add human message
            this.addMessage({
                type: 'human',
                content: query,
                timestamp: Date.now()
            })

            // Add loading indicator
            this.addMessage({
                type: 'loading',
                timestamp: Date.now()
            })

            this.setGenerating(true)

            // Create abort controller for this request
            const controller = new AbortController()
            this.setAbortController(markRaw(controller))

            try {
                // Call the API
                const response = await ExpertAPI.sendQuery(
                    query,
                    this.sessionId,
                    null, // instanceId - handled elsewhere per user's note
                    controller.signal
                )

                // Remove loading indicator
                const loadingIndex = this.messages.findIndex(m => m.type === 'loading')
                if (loadingIndex !== -1) {
                    this.messages.splice(loadingIndex, 1)
                }

                // Process the answer
                if (response.answer && Array.isArray(response.answer)) {
                    for (const item of response.answer) {
                        if (item.kind === 'guide') {
                            // Add rich guide message
                            this.addMessage({
                                type: 'ai',
                                kind: 'guide',
                                guide: item,
                                content: item.title || 'Setup Guide',
                                timestamp: Date.now()
                            })
                        } else if (item.kind === 'chat') {
                            // Add chat message with streaming effect
                            await this.streamMessage(item.content)
                        }
                    }
                } else {
                    // Fallback for unexpected response format
                    this.addMessage({
                        type: 'ai',
                        content: 'Sorry, I received an unexpected response format.',
                        timestamp: Date.now()
                    })
                }
            } catch (error) {
                // Remove loading indicator
                const loadingIndex = this.messages.findIndex(m => m.type === 'loading')
                if (loadingIndex !== -1) {
                    this.messages.splice(loadingIndex, 1)
                }

                if (error.name === 'AbortError' || error.name === 'CanceledError') {
                    // Request was cancelled by user
                    this.addMessage({
                        type: 'ai',
                        content: 'Generation stopped.',
                        timestamp: Date.now()
                    })
                } else {
                    // API error
                    console.error('Expert API error:', error)
                    this.addMessage({
                        type: 'ai',
                        content: 'Sorry, I encountered an error. Please try again.',
                        timestamp: Date.now()
                    })
                }
            } finally {
                this.setGenerating(false)
                this.setAbortController(null)
            }
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
                    this.clearConversation()
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
}

.messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    scroll-behavior: smooth;

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
