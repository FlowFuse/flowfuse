<template>
    <div class="ff-expert">
        <!-- Floating mode switcher (editor context only) -->
        <div v-if="isEditorContext" class="mode-switcher-floating">
            <toggle-button-group
                v-model="agentModeWrapper"
                :buttons="agentModeButtons"
                :uses-links="false"
                :visually-hide-title="true"
            />
        </div>

        <!-- Messages Container -->
        <div
            ref="messagesContainer"
            class="messages-container pt-10"
            :class="{ 'has-mode-switcher': isEditorContext }"
            @scroll="handleScroll"
        >
            <!-- Info Banner -->
            <div v-if="isFfAgent" class="info-banner">
                <p class="info-text">
                    AI agent has access to all of FlowFuse's
                    <a
                        href="https://flowfuse.com/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="info-link"
                    >documentation and knowledge</a>,
                    <a
                        href="https://flowfuse.com/blog"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="info-link"
                    >blogposts</a>, and more.
                </p>
            </div>
            <!-- Insights mode info banner -->
            <div v-if="isOperatorAgent" class="info-banner">
                <p class="info-text">
                    AI agent can access
                    <a
                        href="https://flowfuse.com/node-red/flowfuse/mcp/"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="info-link"
                    >MCP server tools</a>
                    configured in your hosted Node-RED instances.
                </p>
            </div>

            <!-- Messages -->
            <div
                v-for="(message, index) in messages"
                :key="index"
                class="message-wrapper"
            >
                <!-- Loading indicator for AI -->
                <expert-loading-dots
                    v-if="message.type === 'loading'"
                    :variant="message.variant || 'default'"
                />

                <!-- Tool calls - rendered without message bubble -->
                <expert-tool-call
                    v-else-if="message.kind === 'tool_calls'"
                    :message="message"
                />

                <!-- Regular message -->
                <expert-chat-message
                    v-else
                    :message="message"
                    :is-streaming="isStreaming(index)"
                >
                    <!-- Rich resources content slot -->
                    <template
                        v-if="richContentComponentMap[message.kind]"
                        #rich-content
                    >
                        <component
                            :is="richContentComponentMap[message.kind]"
                            :message="message"
                        />
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
            :is-session-expired="isSessionExpired"
            :is-operator-agent="isOperatorAgent"
            :has-selected-capabilities="hasSelectedCapabilities"
            @send="handleSendMessage"
            @stop="handleStopGeneration"
            @start-over="handleStartOver"
        />
    </div>
</template>

<script>
import { markRaw } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import ToggleButtonGroup from '../elements/ToggleButtonGroup.vue'

import ExpertChatInput from './ExpertChatInput.vue'
import ExpertChatMessage from './ExpertChatMessage.vue'
import ExpertLoadingDots from './ExpertLoadingDots.vue'
import ExpertRichGuide from './ExpertRichGuide.vue'
import ExpertRichResources from './ExpertRichResources.vue'
import ExpertToolCall from './ExpertToolCall.vue'

export default {
    name: 'ExpertPanel',
    components: {
        ExpertChatInput,
        ExpertChatMessage,
        ExpertLoadingDots,
        ExpertRichGuide,
        ExpertRichResources,
        ExpertToolCall,
        ToggleButtonGroup
    },
    inject: {
        togglePinWithWidth: {
            from: 'togglePinWithWidth',
            default: () => () => {} // No-op function when not provided
        }
    },
    data () {
        return {
            scrollCheckDebounce: null,
            richContentComponentMap: {
                guide: markRaw(ExpertRichGuide),
                resources: markRaw(ExpertRichResources),
                tool_calls: markRaw(ExpertToolCall)
            }
        }
    },
    computed: {
        ...mapState('product/expert', [
            'isGenerating',
            'autoScrollEnabled',
            'abortController',
            'streamingTimer',
            'streamingWordIndex',
            'agentMode'
        ]),
        ...mapGetters('product/expert', [
            'messages',
            'hasMessages',
            'lastMessage',
            'isSessionExpired',
            'isFfAgent',
            'isOperatorAgent',
            'hasSelectedCapabilities'
        ]),
        isPinned () {
            return this.$store.state.ux.drawers.rightDrawer.fixed
        },
        isEditorContext () {
            // In editor context, the route name includes 'editor'
            return this.$route?.name?.includes('editor') || false
        },
        agentModeWrapper: {
            get () {
                return this.agentMode
            },
            set (value) {
                this.$store.dispatch('product/expert/setAgentMode', value)
            }
        },
        agentModeButtons () {
            return [
                { title: 'Support', value: 'ff-agent' },
                { title: 'Insights', value: 'operator-agent' }
            ]
        }
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
        },
        agentMode: {
            handler (newMode, oldMode) {
                // Fetch capabilities when switching to Insights mode (only in editor context)
                if (
                    this.isEditorContext &&
                    newMode === 'operator-agent' &&
                    newMode !== oldMode
                ) {
                    this.$store.dispatch(
                        `product/expert/${newMode}/getCapabilities`
                    )
                }
            }
        }
    },
    mounted () {
        // Add welcome message when opening in editor (immersive) context
        if (this.isEditorContext) {
            // Delay to ensure drawer is open and visible before typing animation starts
            setTimeout(() => {
                this.$store.dispatch('product/expert/addWelcomeMessageIfNeeded')
            }, 1000)
        }
    },
    beforeUnmount () {
        // Clean up timers
        if (this.streamingTimer) {
            this.clearStreamingTimer()
        }
        if (this.scrollCheckDebounce) {
            clearTimeout(this.scrollCheckDebounce)
        }
        // Clean up session timer
        this.resetSessionTimer()
    },
    methods: {
        ...mapActions('product/expert', [
            'handleMessage',
            'handleMessageResponse',
            'addMessage',
            'updateLastMessage',
            'clearConversation',
            'startOver',
            'setAutoScroll',
            'clearStreamingTimer',
            'streamMessage',
            'setStreamingWordIndex',
            'setStreamingWords',
            'setAbortController',
            'resetSessionTimer'
        ]),

        logMessageRender (message, index) {
            console.log(`[DEBUG logMessageRender] Message ${index}:`, {
                kind: message.kind,
                hasKind: message.kind !== undefined,
                hasMappingForKind:
                    this.richContentComponentMap[message.kind] !== undefined,
                richContentComponentMap: Object.keys(
                    this.richContentComponentMap
                )
            })
        },

        async handleSendMessage (query) {
            if (!query.trim()) return

            // Auto-pin drawer on first message
            if (!this.isPinned && this.messages.length === 0) {
                this.togglePinWithWidth()
            }

            // Call Vuex action to handle API logic
            const result = await this.handleMessage({
                query,
                instanceId: null
            })

            // Handle UI-specific processing if successful
            await this.handleMessageResponse(result)

            // Errors are already handled in the Vuex action
        },

        handleStopGeneration () {
            if (this.abortController) {
                this.abortController.abort()
                this.setAbortController(null)
            }

            // Stop streaming effect
            if (this.streamingTimer) {
                this.clearStreamingTimer()
            }

            // Complete the streaming message
            if (this.streamingWordIndex >= 0 && this.lastMessage?.isStreaming) {
                this.lastMessage.isStreaming = false
                this.setStreamingWordIndex(-1)
                this.setStreamingWords([])
            }
        },

        handleStartOver () {
            // Confirm before clearing
            if (this.hasMessages) {
                this.startOver()
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
                const scrolledToBottom =
                    container.scrollHeight -
                        container.scrollTop -
                        container.clientHeight <
                    100

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
            return (
                index === this.messages.length - 1 &&
                this.messages[index]?.isStreaming === true
            )
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
    position: relative;
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
    background-color: #eef2ff; // indigo-100
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.75rem 1rem;

    .info-text {
        color: #4338ca; // indigo-700
        font-size: 0.875rem;
        margin: 0;
        line-height: 1.5;
    }

    .info-link {
        color: inherit;
        text-decoration: underline;

        &:hover {
            color: #3730a3; // indigo-800
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

.mode-switcher-floating {
    position: absolute;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.messages-container.has-mode-switcher {
    padding-top: 4rem; // Extra padding to account for floating mode switcher
}
</style>
