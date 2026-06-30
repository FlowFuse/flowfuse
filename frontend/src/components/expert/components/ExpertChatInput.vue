<template>
    <div ref="resizeTarget" class="ff-expert-input" :style="containerStyle">
        <resize-bar
            :is-resizing="isInputResizing"
            direction="horizontal"
            @mousedown="onStartResize"
        />
        <!-- Action buttons row -->
        <div class="action-buttons">
            <button
                type="button"
                class="btn-start-over"
                :disabled="isWaitingForResponse && !isSessionExpired"
                @click="handleStartOver"
            >
                Start over
            </button>
            <div class="right-buttons">
                <capabilities-selector v-if="isInsightsAgent" />
                <ff-kebab-menu
                    v-else
                    class="expert-settings-menu"
                    data-el="expert-settings-menu"
                    :menu-items-attrs="{ class: 'expert-settings-options' }"
                >
                    <li class="expert-settings-menu__group">
                        <span class="expert-settings-menu__heading">Follow-up questions</span>
                        <p class="expert-settings-menu__description">
                            When a request needs more detail, choose how the Expert asks for it.
                        </p>
                        <toggle-button-group
                            v-model="questionCadenceWrapper"
                            :buttons="questionCadenceButtons"
                            :usesLinks="false"
                            :visually-hide-title="true"
                            data-el="expert-question-cadence"
                        />
                    </li>
                </ff-kebab-menu>
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
                <div class="left overflow-hidden">
                    <context-selector v-if="isImmersive && !isInsightsAgent" />
                </div>

                <div class="right">
                    <button
                        v-if="isWaitingForResponse && !isSessionExpired"
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
import { mapActions, mapState } from 'pinia'

import ResizeBar from '../../ResizeBar.vue'
import ToggleButtonGroup from '../../elements/ToggleButtonGroup.vue'

import CapabilitiesSelector from './CapabilitiesSelector.vue'
import ContextSelector from './context-selection/index.vue'

import { useResizingHelper } from '@/composables/ResizingHelper.js'

import { useProductAssistantStore } from '@/stores/product-assistant.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

export default {
    name: 'ExpertChatInput',
    components: {
        CapabilitiesSelector,
        ContextSelector,
        ResizeBar,
        ToggleButtonGroup
    },
    inject: {
        togglePinWithWidth: {
            from: 'togglePinWithWidth',
            default: () => () => {} // No-op function when not provided
        }
    },
    emits: ['send', 'stop'],
    setup () {
        const {
            startResize,
            heightStyle,
            bindResizer,
            setHeight,
            isResizing: isInputResizing
        } = useResizingHelper()

        return {
            startResize,
            bindResizer,
            heightStyle,
            setHeight,
            isInputResizing
        }
    },
    data () {
        return {
            inputText: '',
            includeSelection: true,
            isTextareaFocused: false,
            // The composer auto-sizes to its content via CSS (see .chat-input field-sizing).
            // Only once the user drag-resizes do we pin it to an explicit height.
            userResized: false
        }
    },
    computed: {
        ...mapState(useProductAssistantStore, [
            'isImmersiveInstance',
            'isImmersiveDevice'
        ]),
        ...mapState(useUxDrawersStore, ['rightDrawer']),
        ...mapState(useProductExpertStore, [
            'messages',
            'isSessionExpired',
            'isInsightsAgent',
            'hasSelectedCapabilities',
            'hasMessages',
            'isWaitingForResponse',
            'pendingInput',
            'questionCadence'
        ]),
        questionCadenceButtons () {
            return [
                { title: 'All at once', value: 'all' },
                { title: 'One at a time', value: 'one' }
            ]
        },
        questionCadenceWrapper: {
            get () {
                return this.questionCadence
            },
            set (value) {
                this.setQuestionCadence(value)
            }
        },
        isInputDisabled () {
            if (this.isSessionExpired) return true
            if (this.isWaitingForResponse) return true
            return this.isInsightsAgent && !this.hasSelectedCapabilities
        },
        isDrawerPinned () {
            return this.rightDrawer.fixed
        },
        canSend () {
            return this.inputText.trim().length > 0 && !this.isInputDisabled
        },
        placeholderText () {
            if (this.isInsightsAgent && !this.hasSelectedCapabilities) {
                return 'Select a resource to get started'
            }
            return this.isInsightsAgent
                ? 'Tell us what you want to know about'
                : 'Tell us what you need help with'
        },
        isImmersive () {
            return this.isImmersiveDevice || this.isImmersiveInstance
        },
        containerStyle () {
            // Until the user drag-resizes, let the composer size itself to its content (capped by
            // the CSS max-height). Once they drag, pin it to the chosen height.
            return this.userResized ? { height: this.heightStyle } : {}
        }
    },
    watch: {
        pendingInput (text) {
            if (text) {
                this.inputText = text
                this.setPendingInput('')
                this.$nextTick(() => {
                    this.$refs.textarea.focus()
                    // No manual sizing needed: the textarea auto-grows to fit the loaded content
                    // (e.g. an edited question) via CSS, capped by its max-height.
                })
            }
        }
    },
    mounted () {
        this.bindResizer({
            component: this.$refs.resizeTarget,
            maxHeightRatio: 0.9,
            minHeight: 120,
            maxViewportMarginY: 80
        })
    },
    methods: {
        ...mapActions(useProductAssistantStore, ['resetContextSelection']),
        ...mapActions(useProductExpertStore, ['startOver', 'handleQuery', 'handleMessageResponse', 'setPendingInput', 'setQuestionCadence']),
        async handleSend () {
            if (!this.canSend) return

            const message = this.inputText.trim()

            // Auto-pin drawer on first message
            if (!this.isDrawerPinned && this.messages.length === 0) {
                this.togglePinWithWidth()
            }

            // Call Vuex action to handle API logic
            this.handleQuery({ query: message })
                // Handle UI-specific processing if successful
                .then((result) => this.handleMessageResponse(result))
                .then(() => {
                    this.$nextTick(() => {
                        this.$refs.textarea.focus()
                    })
                })
                .catch(e => e)

            this.inputText = ''
        },
        onStartResize (event) {
            // Seed the drag from the composer's current rendered height (it may have auto-grown to
            // fit its content) so the resize continues smoothly from where it is, then hand off to
            // the resize helper. From here on the chosen height wins over the content auto-size.
            const container = this.$refs.resizeTarget
            if (container) this.setHeight(container.offsetHeight)
            this.userResized = true
            this.startResize(event)
        },
        handleStop () {
            this.$emit('stop')
        },
        handleStartOver () {
            if (!this.hasMessages) return

            this.inputText = ''
            // When in support mode, reset/restore assistant context selection (opt-out by default)
            if (!this.isInsightsAgent) {
                this.resetContextSelection()
            }

            this.startOver()
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
    border-top: 1px solid var(--ff-color-border); // border-gray-200
    background: var(--ff-color-bg-app);
    flex-shrink: 0; // Prevent input area from shrinking
    position: relative;
    min-height: 180px;
    max-height: 40vh;
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
    align-items: center;
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
    background-color: var(--ff-color-bg-app);
    color: inherit;
    border-color: var(--ff-color-accent-light); // indigo-300
    padding: 0.25rem 0.50rem;
    border-radius: 5px;

    &:hover:not(:disabled) {
        background-color: var(--ff-color-bg-surface); // gray-50
    }
}

.btn-send {
    background-color: var(--ff-color-accent);
    color: var(--ff-color-text-on-brand);
    border-color: var(--ff-color-accent);
    border-radius: 5px;
    padding: 0.25rem 0.50rem;

    &:hover:not(:disabled) {
        background-color: var(--ff-color-accent-hover-bg);
    }
}

.btn-stop {
    background-color: var(--ff-color-bg-app);
    color: inherit;
    border-color: var(--ff-color-accent-light); // indigo-300
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 5px;
    padding: 0.25rem 0.50rem;

    &::before {
        content: '';
        width: 0.75rem; // w-3
        height: 0.75rem; // h-3
        background-color: var(--ff-color-surface-dark);
        border-radius: 0.125rem; // rounded-xs
    }

    &:hover {
        background-color: var(--ff-color-bg-surface); // gray-50
    }
}

.input-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 2px solid var(--ff-color-border-strong); // border-2 border-gray-300
    border-radius: 0.5rem; // rounded-lg
    transition: border-color 0.2s ease;

    &.focused {
        border-color: var(--ff-color-focus);
    }

    .chat-input {
        // field-sizing lets the textarea grow with its content (typed or loaded, e.g. an edited
        // question) up to the composer's max-height, where it scrolls — no JS measuring needed.
        // flex-basis auto so it sizes to that content but still fills the box when it's taller
        // (an empty composer, or after a drag-resize).
        field-sizing: content;
        flex: 1 1 auto;
        width: 100%;
        padding: 1rem; // p-4
        box-sizing: border-box;
        overflow-y: auto;
        border: none;
        outline: none;
        font-size: 0.875rem; // text-sm
        line-height: 1.5;
        color: var(--ff-color-text-strong); // text-gray-900
        resize: none;
        font-family: inherit;
        background: var(--ff-color-bg-app);

        &:focus {
            outline: none;
        }

        &:disabled {
            cursor: not-allowed;
            background-color: var(--ff-color-bg-surface); // bg-gray-50
            color: var(--ff-color-text-subtle); // text-gray-500
        }

        &::placeholder {
            color: var(--ff-color-text-subtle); // placeholder gray
        }
    }

    .actions {
        padding: .5rem;
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;

        .right {
            display: flex;
            justify-content: flex-end;
        }
    }
}
</style>

<!--
  Unscoped: the kebab options are teleported to <body>, so scoped selectors cannot reach them.
  .ff-kebab-options is transparent by design (the surface normally comes from .ff-kebab-item
  rows); this menu hosts a control instead of items, so it paints the surface itself using the
  same theme variables, keeping light/dark support without bespoke colours.
-->
<style lang="scss">
.expert-settings-options {
    background-color: var(--ff-color-bg-app);
    min-width: 16rem;

    .expert-settings-menu__group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.75rem;

        + .expert-settings-menu__group {
            border-top: 1px solid var(--ff-color-border);
        }
    }

    .expert-settings-menu__heading {
        font-size: 0.6875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        opacity: 0.7;
    }

    .expert-settings-menu__description {
        margin: 0;
        font-size: 0.75rem;
        line-height: 1.4;
        opacity: 0.7;
    }
}
</style>
