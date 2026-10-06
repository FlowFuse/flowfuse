<template>
    <ff-page>
        <template #header>
            <ff-page-header>
                <template #breadcrumbs>
                    <ff-nav-breadcrumb>Home</ff-nav-breadcrumb>
                </template>
            </ff-page-header>
        </template>

        <div
            class="ff-expert-home"
            data-el="expert-home"
            :class="{ 'is-composing': stage !== 'idle', 'is-conversing': stage === 'conversing' }"
            :data-stage="stage"
        >
            <button
                type="button"
                class="ff-expert-home__back"
                data-action="collapse-expert"
                @click="stage = 'idle'"
            >
                <ChevronLeftIcon class="ff-icon ff-icon-sm" />
                Back
            </button>

            <div v-if="canSwitchAgent" class="ff-expert-home__mode" data-el="expert-home-mode">
                <ExpertModeSwitcher />
            </div>

            <div
                class="ff-expert-home__expert"
                data-el="expert-home-surface"
                @input="onComposerInput"
            >
                <ExpertPanel />
            </div>

            <ff-button
                v-if="canResume"
                kind="tertiary"
                size="small"
                class="ff-expert-home__resume"
                data-action="resume-conversation"
                @click="stage = 'conversing'"
            >
                <span v-if="liveTurns > 0">
                    Continue your conversation
                    <span class="ff-expert-home__resume-count">
                        · {{ liveTurns }} {{ liveTurns === 1 ? 'message' : 'messages' }}
                    </span>
                </span>
                <span v-else>Open the Expert</span>
            </ff-button>

            <div
                v-if="showSuggestions"
                class="ff-expert-home__suggestions"
                :class="{ 'is-inert': isComposerDisabled }"
                :aria-disabled="isComposerDisabled"
            >
                <PromptSuggestions :suggestions="suggestions" @select="onSuggestion" />
            </div>
        </div>
    </ff-page>
</template>

<script setup lang="ts">
import { ChevronLeftIcon } from '@heroicons/vue/20/solid'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import ExpertPanel from '@/components/expert/Expert.vue'
import ExpertModeSwitcher from '@/components/expert/components/ExpertModeSwitcher.vue'
import PromptSuggestions from '@/components/expert/components/PromptSuggestions.vue'
import { pickSuggestions } from '@/components/expert/prompt-suggestions.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { SUPPORT_AGENT } from '@/stores/product-expert-agents.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

defineOptions({ name: 'TeamHomeExpert' })

const contextStore = useContextStore()
const settingsStore = useAccountSettingsStore()
const expertStore = useProductExpertStore() as ReturnType<typeof useProductExpertStore> & {
    messages: { _type: string }[]
    isWaitingForResponse: boolean
    isSessionExpired: boolean
    isInsightsAgent: boolean
    hasSelectedCapabilities: boolean
    handleQuery: (payload: { query: string }) => Promise<unknown>
}
const drawersStore = useUxDrawersStore()

const canSwitchAgent = computed<boolean>(() => {
    const features = settingsStore.featuresCheck
    return !!features.isExpertAssistantFeatureEnabled && !!features.isExpertInsightsFeatureEnabled
})

type Stage = 'idle' | 'composing' | 'conversing'

const stage = ref<Stage>('idle')
const liveTurns = computed<number>(() => expertStore.messages.filter(message => message._type === 'human').length)

const isComposerDisabled = computed<boolean>(() =>
    expertStore.isWaitingForResponse ||
    expertStore.isSessionExpired ||
    (expertStore.isInsightsAgent && !expertStore.hasSelectedCapabilities)
)

const canResume = computed<boolean>(() => liveTurns.value > 0 || isComposerDisabled.value)

type Suggestion = { title: string, prompt: string, needsInput?: boolean }

const suggestions = ref<Suggestion[]>(pickSuggestions())

const showSuggestions = computed<boolean>(() => stage.value !== 'conversing')

function onSuggestion (suggestion: Suggestion) {
    if (isComposerDisabled.value) {
        return
    }
    if (suggestion.needsInput) {
        stage.value = 'composing'
        expertStore.setPendingInput(suggestion.prompt)
        return
    }
    stage.value = 'conversing'
    expertStore.handleQuery({ query: suggestion.prompt }).catch(e => e)
}

function onComposerInput () {
    if (stage.value === 'idle') {
        stage.value = 'composing'
    }
}

watch(liveTurns, (now: number, before: number) => {
    if (now > before) {
        stage.value = 'conversing'
    }
})

onMounted(() => {
    const features = settingsStore.featuresCheck
    if (features.isExpertAssistantFeatureEnabled && !features.isExpertInsightsFeatureEnabled) {
        expertStore.setAgentMode(SUPPORT_AGENT)
    }
    expertStore.resumeSessionTimer()
    drawersStore.suppressExpertDrawer()
    if (drawersStore.rightDrawer.state) {
        drawersStore.closeRightDrawer({ preserveExpertState: true })
    }
})

onBeforeUnmount(() => {
    drawersStore.releaseExpertDrawer()
    if (!contextStore.isImmersiveEditor && drawersStore.rightDrawer.expertState.open) {
        expertStore.openAssistantDrawer({ openPinned: drawersStore.rightDrawer.expertState.pinned })
    }
})
</script>

<style scoped lang="scss">

$ff-expand: 480ms;
$ff-ease: cubic-bezier(0.4, 0, 0.2, 1);
$ff-column: 820px;

.ff-expert-home {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding: 24px 22px 28px;
    position: relative;

    &__back {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 9px 4px 6px;
        border: 1px solid var(--ff-color-border);
        border-radius: 6px;
        background: var(--ff-color-bg-app);
        font-size: 11.5px;
        color: var(--ff-color-text-subtle);
        cursor: pointer;
        transition: opacity 220ms ease;

        &:hover {
            color: var(--ff-color-text-strong);
            border-color: var(--ff-color-border-strong);
        }
    }

    &:not(.is-composing) &__back {
        opacity: 0;
        pointer-events: none;
    }

    &__suggestions {
        align-self: center;
        width: 100%;
        max-width: $ff-column;
        opacity: 1;
        transition: opacity 220ms ease;

        &.is-inert {
            opacity: 0.45;
            pointer-events: none;
        }
    }

    &__resume {
        align-self: center;
        margin-top: 14px;
        max-height: 32px;
        overflow: hidden;
        transition: max-height $ff-expand $ff-ease, opacity 220ms ease,
                    margin-top $ff-expand $ff-ease;
    }

    &__resume-count {
        color: var(--ff-color-text-subtle);
    }

    &.is-conversing &__resume {
        max-height: 0;
        margin-top: 0;
        opacity: 0;
        pointer-events: none;
    }

    &__mode {
        align-self: center;
        display: flex;
        justify-content: center;
        width: 100%;
        max-width: $ff-column;
        max-height: 0;
        margin-bottom: 0;
        opacity: 0;
        overflow: hidden;
        pointer-events: none;
        transition: max-height $ff-expand $ff-ease, opacity 220ms ease,
                    margin-bottom $ff-expand $ff-ease;
    }

    &.is-conversing &__mode {
        max-height: 40px;
        margin-bottom: 10px;
        opacity: 1;
        pointer-events: auto;
    }

    &__expert {
        display: flex;
        flex-direction: column;
        flex: 0 1 auto;
        min-height: 0;
        margin-top: 28px;
        transition: flex-grow $ff-expand $ff-ease, margin-top $ff-expand $ff-ease;
    }

    &.is-conversing &__expert {
        flex-grow: 1;
        margin-top: 0;
    }

    &__expert :deep(.ff-expert) {
        height: auto;
        flex: 1;
        min-height: 0;
        background: transparent;
    }

    &__expert :deep(.messages-container),
    &__expert :deep(.ff-expert-input) {
        width: 100%;
        max-width: $ff-column;
        margin-left: auto;
        margin-right: auto;
    }

    &__expert :deep(.messages-container) {
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
        opacity: 0;
        transition: max-height $ff-expand $ff-ease, opacity 300ms ease;
    }

    &.is-conversing &__expert :deep(.messages-container) {
        max-height: 70vh;
        padding-top: 1rem;
        padding-bottom: 1rem;
        opacity: 1;
    }

    &__expert :deep(.ff-expert-input) {
        border-top: none;
        background: transparent;
        min-height: 0;
        padding: 0;
    }

    &__expert {
        :deep(.resize-bar),
        :deep(.actions .left),
        :deep(#expert-suggestions-slot) {
            display: none;
        }

        :deep(.input-wrapper) {
            flex-direction: row;
            align-items: center;
            border-width: 1px;
            border-color: var(--ff-color-border);
            border-radius: 12px;
            background: var(--ff-color-bg-app);
        }

        :deep(.chat-input) {
            padding: 1.15rem 0.5rem 1.15rem 1.25rem;
            font-size: 0.9375rem;
            background: transparent;
        }

        :deep(.actions) {
            padding: 0 0.6rem 0 0;
            flex: 0 0 auto;
        }

        :deep(.action-buttons) {
            max-height: 0;
            opacity: 0;
            margin-bottom: 0;
            overflow: hidden;
            transition: max-height $ff-expand $ff-ease, opacity 260ms ease,
                        margin-bottom $ff-expand $ff-ease;
        }
    }

    &.is-conversing &__expert :deep(.action-buttons) {
        max-height: 40px;
        opacity: 1;
        margin-bottom: 0.5rem;
    }
}

@media (prefers-reduced-motion: reduce) {
    .ff-expert-home__back,
    .ff-expert-home__resume,
    .ff-expert-home__mode,
    .ff-expert-home__expert,
    .ff-expert-home__expert :deep(.messages-container),
    .ff-expert-home__expert :deep(.action-buttons) {
        transition: none;
    }
}
</style>
