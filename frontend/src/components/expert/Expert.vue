<template>
    <div class="ff-expert">
        <expert-mode-switcher v-if="isEditorContext" :isFloating="true" />

        <div
            ref="messagesContainer"
            class="messages-container"
            :class="{ 'has-mode-switcher': isEditorContext }"
            @scroll="handleScroll"
        >
            <info-banner />

            <expert-messages />

            <div ref="scrollAnchor" class="scroll-anchor" />
        </div>

        <!-- Updates Available Banner -->
        <update-banner v-if="isEditorContext && isInstanceRunning" />

        <expert-chat-input @stop="handleStopGeneration" />
    </div>
</template>

<script>
import { mapActions, mapGetters, mapState } from 'vuex'

import ExpertChatInput from './components/ExpertChatInput.vue'
import ExpertMessages from './components/ExpertMessages.vue'
import ExpertModeSwitcher from './components/ExpertModeSwitcher.vue'
import InfoBanner from './components/InfoBanner.vue'
import UpdateBanner from './components/UpdateBanner.vue'

export default {
    name: 'ExpertPanel',
    components: {
        ExpertModeSwitcher,
        InfoBanner,
        ExpertMessages,
        ExpertChatInput,
        UpdateBanner
    },
    inject: {
        togglePinWithWidth: {
            from: 'togglePinWithWidth',
            default: () => () => {} // No-op function when not provided
        }
    },
    props: {
        instance: {
            type: Object,
            required: false,
            default: null
        },
        device: {
            type: Object,
            required: false,
            default: null
        }
    },
    data () {
        return {
            scrollCheckDebounce: null
        }
    },
    computed: {
        ...mapState('product/expert', [
            'autoScrollEnabled',
            'abortController',
            'agentMode'
        ]),
        ...mapGetters('product/expert', [
            'messages',
            'isSessionExpired',
            'isFfAgent',
            'isOperatorAgent',
            'hasSelectedCapabilities'
        ]),
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
        isInstanceRunning () {
            const instanceRunning = this.instance?.meta?.state === 'running'
            const deviceRunning = this.device?.status === 'running'
            return instanceRunning || deviceRunning
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
        },
        'instance.meta.state': {
            handler (newState) {
                if (this.isEditorContext && newState !== 'running') {
                    this.reset() // reset assistant state
                }
            }
        },
        'device.status': {
            handler (newState) {
                if (this.isEditorContext && newState !== 'running') {
                    this.reset() // reset assistant state
                }
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
        }
    },
    beforeUnmount () {
        if (this.scrollCheckDebounce) {
            clearTimeout(this.scrollCheckDebounce)
        }
        // Clean up session timer
        this.resetSessionTimer()
    },
    methods: {
        ...mapActions('product/expert', [
            'handleQuery',
            'handleMessageResponse',
            'setAutoScroll',
            'setAbortController',
            'resetSessionTimer'
        ]),
        //
        // async handleSendMessage (query) {
        //     if (!query.trim()) return
        //
        //     // Auto-pin drawer on first message
        //     if (!this.isPinned && this.messages.length === 0) {
        //         this.togglePinWithWidth()
        //     }
        //
        //     // Call Vuex action to handle API logic
        //     const result = await this.handleQuery({ query })
        //
        //     // Handle UI-specific processing if successful
        //     await this.handleMessageResponse(result)
        //
        //     // Errors are already handled in the Vuex action
        // },

        handleStopGeneration () {
            if (this.abortController) {
                this.abortController.abort()
                this.setAbortController(null)
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

                // todo this should be moved into the component not the store
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

.scroll-anchor {
    height: 1px;
}

.messages-container.has-mode-switcher {
    padding-top: 4rem; // Extra padding to account for floating mode switcher
}
</style>
