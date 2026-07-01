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
                <default-chip
                    v-if="!isInsightsAgent"
                    class="plan-mode-chip"
                    text="Plan mode"
                    :modelValue="planMode"
                    :disabled="isWaitingForResponse"
                    title="Plan mode: the Expert proposes a plan before making any changes, and acts only once you approve it."
                    data-el="expert-plan-mode-toggle"
                    @toggle="setPlanMode(!planMode)"
                >
                    <template #icon>
                        <ff-toggle-switch :modelValue="planMode" size="small" tabindex="-1" />
                    </template>
                </default-chip>
                <capabilities-selector v-if="isInsightsAgent" />
                <button
                    v-else
                    type="button"
                    class="btn-settings"
                    data-el="expert-settings-menu"
                    aria-label="Expert settings"
                    title="Expert settings"
                    @click="openSettings"
                >
                    <Cog8ToothIcon class="btn-settings__icon" />
                </button>
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

        <ff-dialog
            ref="settingsDialog"
            header="Expert settings"
            confirm-label="Done"
            :can-be-canceled="false"
            data-el="expert-settings-dialog"
        >
            <div class="expert-settings">
                <div class="expert-settings__group">
                    <FormHeading>Follow-up questions</FormHeading>
                    <p>When a request needs more detail, choose how the Expert asks for it.</p>
                    <ff-radio-group
                        v-model="questionCadenceWrapper"
                        orientation="vertical"
                        :options="questionCadenceOptions"
                        data-el="expert-question-cadence"
                    />
                </div>
                <div class="expert-settings__group">
                    <FormHeading>Tool permissions</FormHeading>
                    <p>Choose which actions the Expert can run, and which need your approval.</p>
                    <tool-permissions-settings :in-editor="isImmersive" />
                </div>
            </div>
        </ff-dialog>
    </div>
</template>

<script>
import { Cog8ToothIcon } from '@heroicons/vue/20/solid'
import { mapActions, mapState } from 'pinia'

import FormHeading from '../../FormHeading.vue'
import ResizeBar from '../../ResizeBar.vue'

import CapabilitiesSelector from './CapabilitiesSelector.vue'
import ToolPermissionsSettings from './ToolPermissionsSettings.vue'
import DefaultChip from './chips/DefaultChip.vue'
import ContextSelector from './context-selection/index.vue'

import { useResizingHelper } from '@/composables/ResizingHelper.js'

import { useProductAssistantStore } from '@/stores/product-assistant.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

export default {
    name: 'ExpertChatInput',
    components: {
        CapabilitiesSelector,
        Cog8ToothIcon,
        ContextSelector,
        DefaultChip,
        FormHeading,
        ResizeBar,
        ToolPermissionsSettings
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
            // true after "Request changes" on a plan, until the user types or sends; drives the hint placeholder
            requestingPlanChange: false,
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
            'composerCommand',
            'questionCadence',
            'planMode'
        ]),
        questionCadenceOptions () {
            return [
                { label: 'All at once', value: 'all', description: 'Asks every open question together in a single turn.' },
                { label: 'One at a time', value: 'one', description: 'Asks one question, then follows up based on your answer.' }
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
            if (this.requestingPlanChange) {
                return 'Describe a change to the plan, or paste an edited version'
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
                this.requestingPlanChange = false
                this.setPendingInput('')
                this.$nextTick(() => this.$refs.textarea.focus())
            }
        },
        composerCommand (command) {
            if (!command) return
            // Plan card actions: focus an empty composer with a change hint, or clear a
            // plan loaded via "Edit manually" that was approved/rejected without sending.
            this.inputText = ''
            this.requestingPlanChange = command === 'request-plan-change'
            if (this.requestingPlanChange) {
                this.$nextTick(() => this.$refs.textarea.focus())
            }
            this.setComposerCommand(null)
        },
        inputText (value) {
            // Clear the plan-change hint once the user starts typing their own text.
            if (value && this.requestingPlanChange) {
                this.requestingPlanChange = false
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
        // Fetch the tool catalog as soon as the Expert panel mounts (not only in the
        // editor) so the permissions settings can render everywhere. Flow-building
        // tools are still only usable from an instance editor (see isImmersive below).
        this.fetchToolCatalog()
    },
    methods: {
        ...mapActions(useProductAssistantStore, ['resetContextSelection']),
        ...mapActions(useProductExpertStore, ['startOver', 'handleQuery', 'setPendingInput', 'setComposerCommand', 'setQuestionCadence', 'setPlanMode', 'fetchToolCatalog']),
        openSettings () {
            this.$refs.settingsDialog.show()
        },
        async handleSend () {
            if (!this.canSend) return

            const message = this.inputText.trim()

            // Auto-pin drawer on first message
            if (!this.isDrawerPinned && this.messages.length === 0) {
                this.togglePinWithWidth()
            }

            // handleQuery renders the reply itself (see the store); the composer only needs
            // to refocus the input once the turn is on its way.
            this.handleQuery({ query: message })
                .then(() => {
                    this.$nextTick(() => {
                        this.$refs.textarea.focus()
                    })
                })
                .catch(e => e)

            this.inputText = ''
            this.requestingPlanChange = false
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

// Reuses the shared DefaultChip; only tweaks needed here are neutralising the chip's
// warning-yellow separator and centring the label around the divider.
.plan-mode-chip {
    :deep(.separator),
    &.active :deep(.separator) {
        background: var(--ff-color-border);
    }

    // DefaultChip's .text padding is asymmetric and it adds a 5px flex gap before the
    // divider; equalise so "Plan mode" sits centred on both sides of the divider cell.
    :deep(.text) {
        padding-left: 0.5rem;
        padding-right: calc(0.5rem - 5px);
    }

    // The switch is a visual indicator only; the chip handles the click.
    :deep(.ff-toggle-switch) {
        pointer-events: none;
        flex-shrink: 0;
    }
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

.btn-settings {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border-radius: 5px;
    background-color: transparent;
    color: var(--ff-color-text-subtle);

    &:hover:not(:disabled) {
        background-color: var(--ff-color-bg-surface); // gray-50
        color: var(--ff-color-text-strong);
    }

    &__icon {
        width: 1.25rem;
        height: 1.25rem;
    }
}

.input-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    // min-height: 0 must be on every ancestor in this flex chain, not just .chat-input:
    // without it this wrapper keeps its content (min-content) height, so a long plan loaded
    // via "Edit" pushes the whole composer tall instead of letting the textarea scroll.
    min-height: 0;
    border: 2px solid var(--ff-color-border-strong); // border-2 border-gray-300
    border-radius: 0.5rem; // rounded-lg
    transition: border-color 0.2s ease;

    &.focused {
        border-color: var(--ff-color-focus);
    }

    .chat-input {
        // field-sizing grows the textarea with its content up to the composer's max-height.
        // min-height: 0 lets it shrink within the flex box past its content height (loading a
        // long plan via "Edit manually") so overflow-y scrolls instead of overflowing the chat.
        field-sizing: content;
        flex: 1 1 auto;
        min-height: 0;
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
  Unscoped: ff-dialog teleports its content to <body>, so keep these selectors global rather
  than relying on scoped data attributes reaching the teleported subtree.
-->
<style lang="scss">
.expert-settings {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-width: 18rem;

    &__group {
        display: flex;
        flex-direction: column;
    }
}
</style>
