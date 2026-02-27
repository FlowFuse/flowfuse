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
                    <span
                        title="This feature is still under development"
                        class="banner-badge"
                    >BETA</span>
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

        <!-- Updates Available Banner -->
        <div
            v-if="isEditorContext && assistantState.show"
            class="info-banner expert-update-banner"
            :class="assistantState.statusClass"
        >
            <div class="info-text expert-update-header flex items-center justify-between">
                <span class="truncate flex-1 pr-4" :title="assistantState.title">
                    {{ assistantState.title }}
                </span>
                <span class="banner-badge ml-4 flex-shrink-0">{{ assistantState.chip }}</span>
            </div>
            <div class="info-text expert-update-body" tabindex="0">
                <p class="mb-2">{{ assistantState.body }}</p>
                <div class="flex justify-end">
                    <ff-button
                        kind="secondary"
                        size="small"
                        @click="assistantState.buttonAction"
                    >
                        {{ assistantState.buttonText }}
                    </ff-button>
                </div>
            </div>
        </div>

        <!-- Input Area -->
        <expert-chat-input
            :is-generating="isGenerating"
            :has-messages="hasMessages"
            :has-user-messages="hasUserMessages"
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
import SemVer from 'semver'
import { markRaw } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import ToggleButtonGroup from '../elements/ToggleButtonGroup.vue'

import ExpertChatInput from './ExpertChatInput.vue'
import ExpertChatMessage from './ExpertChatMessage.vue'
import ExpertLoadingDots from './ExpertLoadingDots.vue'
import ExpertRichGuide from './ExpertRichGuide.vue'
import ExpertRichResources from './ExpertRichResources.vue'
import ExpertToolCall from './ExpertToolCall.vue'

const assistantVerWithAvailableUpdatesSupport = '0.11.0' // Minimum version of assistant package that supports update available detection
const nrVerWithAvailableUpdatesSupport = '4.1.6' // Minimum Node-RED version that provides available updates to editorState

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
            },
            allowUpdateBanner: false // delay showing for a few seconds to avoid showing during initial load
        }
    },
    computed: {
        ...mapState('product/assistant', ['palette', 'editorState', 'version', 'nodeRedVersion', 'supportedActions']),
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
            'hasUserMessages',
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
        },
        assistantLoaded () {
            // If one of version, nodeRedVersion or palette are present, we know it is loaded
            return !!(this.version || this.nodeRedVersion || this.palette)
        },
        assistantPackage () {
            if (!this.palette || Object.keys(this.palette).length === 0) {
                return null // Palette not loaded yet
            }
            if (!this.palette?.['@flowfuse/nr-assistant']) {
                return { installed: false }
            }
            return { installed: true, ...this.palette['@flowfuse/nr-assistant'] }
        },
        availableUpdate () {
            if (Array.isArray(this.editorState?.updatesAvailable?.palette)) {
                return this.editorState?.updatesAvailable?.palette?.find(update => update.package === '@flowfuse/nr-assistant')
            }
            return null
        },
        assistantState () {
            if (!this.allowUpdateBanner) {
                return { show: false }
            }

            const enabled = this.assistantPackage?.enabled !== false
            const installed = this.assistantPackage?.installed ?? this.assistantLoaded // default to installed if loaded.
            const installedVersion = (installed ? this.assistantPackage?.version : '') || this.version || '0.0.0'
            const nrSupportsUpdateInfo = SemVer.gte(this.nodeRedVersion || '0.0.0', nrVerWithAvailableUpdatesSupport)
            const nrAvailableUpdatesSupported = nrSupportsUpdateInfo && !!this.availableUpdate
            let isUpdateAvailable = !!this.availableUpdate?.latest // presence alone indicates and update is available!
            if (this.assistantLoaded && !nrAvailableUpdatesSupported) {
                // If we don't have explicit Available Updates data from NR, we can still against min supported version!
                isUpdateAvailable = SemVer.lt(installedVersion, assistantVerWithAvailableUpdatesSupport)
            }

            const state = {
                show: (!installed || !enabled || isUpdateAvailable),
                statusClass: '',
                expectedVersion: this.availableUpdate?.latest || assistantVerWithAvailableUpdatesSupport,
                installedVersion,
                installed,
                enabled,
                chip: '',
                title: '',
                body: '',
                buttonText: '',
                buttonAction: null
            }
            if (!installed) {
                state.statusClass = 'warning'
                state.chip = 'Not installed'
                state.title = 'FlowFuse Expert Not Installed'
                state.body = 'FlowFuse Expert is not installed in the Node-RED palette. Please install it to access its features.'
                state.buttonText = 'Install...'
                state.buttonAction = this.installAssistantPackage
            } else if (!enabled) {
                state.statusClass = 'warning'
                state.chip = 'Not enabled'
                state.title = 'FlowFuse Expert Not Enabled'
                state.body = 'FlowFuse Expert is installed but not enabled in the Node-RED palette. Please enable it to access its features.'
                state.buttonText = 'Enable...'
                state.buttonAction = this.manageAssistantPackage
            } else if (isUpdateAvailable) {
                state.statusClass = ''
                state.chip = this.availableUpdate?.latest ? `V${this.availableUpdate.latest} available` : 'Update available'
                state.title = 'New FlowFuse Expert Version Available'
                state.body = 'There is an update available for FlowFuse Expert in the Node-RED palette. Please update to the latest version to enjoy new features and improvements.'
                state.buttonText = 'Update...'
                state.buttonAction = this.manageAssistantPackage
            } else {
                state.show = false
            }
            return state
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
            immediate: true,
            async handler (newMode) {
                if (this.isOperatorAgent) {
                    await this.$store.dispatch(
                        `product/expert/${newMode}/getCapabilities`
                    )
                }
                await this.$store.dispatch(
                    'product/expert/addWelcomeMessageIfNeeded'
                )
            }
        }
    },
    mounted () {
        // Add welcome message when opening in editor (immersive) context
        if (this.isEditorContext) {
            // Delay to ensure drawer is open and visible before typing animation starts
            setTimeout(() => {
                this.$store.dispatch(
                    'product/expert/addWelcomeMessageIfNeeded'
                )
            }, 1000)
            // Delay showing update banner to avoid showing during initial load (can be triggered by assistant loading after a few seconds)
            setTimeout(() => {
                this.allowUpdateBanner = true
            }, 5000)
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
        ...mapActions('product/assistant', ['manageNodePackage', 'installNodePackage']),

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
        },
        manageAssistantPackage () {
            this.manageNodePackage('@flowfuse/nr-assistant')
        },
        installAssistantPackage () {
            this.installNodePackage('@flowfuse/nr-assistant')
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
    background-color: #e0e7ff; // indigo-100
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

    .banner-badge {
        display: inline-block;
        background-color: #818cf8; // indigo-400
        color: white;
        font-size: 0.625rem;
        font-weight: 600;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        cursor: help;
        vertical-align: text-top;
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

.info-banner {
    &.expert-update-banner {
        margin-bottom: 0rem;
        border-radius: 0;
        padding: 0.5rem 1rem;
        border-top: 1px solid #E5E7EB;

        .expert-update-header {
            font-weight: 600;
        }
        .expert-update-body {
            max-height: 0;
            overflow: hidden;
            visibility: hidden;
            transition: max-height 0.6s ease-in-out, visibility 0.6s ease-in-out;
            transition-delay: 250ms; // avoid showing immediately (minimise false expansion on mousing around the chat)
        }

        .banner-badge {
            cursor: default;
        }

        &.warning {
            .banner-badge {
                background-color: $ff-red-700;
                color: $ff-grey-50;
            }
        }

        &:hover .expert-update-body,
        &:focus-within .expert-update-body,
        &:active .expert-update-body {
            max-height: 500px;
            visibility: visible;
        }
    }
}

</style>
