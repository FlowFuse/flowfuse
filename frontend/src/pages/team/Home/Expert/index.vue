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
            <ff-button
                kind="tertiary"
                size="small"
                class="ff-expert-home__back"
                data-action="collapse-expert"
                @click="stage = 'idle'"
            >
                <template #icon-left>
                    <ChevronLeftIcon />
                </template>
                Back
            </ff-button>

            <div class="ff-expert-home__intro" data-el="expert-home-intro">
                <HomeGreeting />
            </div>

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

            <div class="ff-expert-home__fold">
                <div class="ff-expert-home__folded">
                    <div
                        class="ff-expert-home__suggestions"
                        :class="{ 'is-inert': isComposerDisabled }"
                        :aria-disabled="isComposerDisabled"
                    >
                        <PromptSuggestions :suggestions="suggestions" layout="row" @select="onSuggestion" />
                    </div>

                    <div class="ff-expert-home__instances">
                        <div class="ff-expert-home__section">
                            <div class="ff-expert-home__section-head">
                                <p class="ff-expert-home__label">
                                    <ProjectsIcon class="ff-icon" />
                                    Hosted Instances
                                </p>
                            </div>
                            <RecentlyModifiedInstances variant="compact" :total-instances="totalInstances" @delete-instance="openDeleteInstanceForm" />
                        </div>

                        <div class="ff-expert-home__section">
                            <div class="ff-expert-home__section-head">
                                <p class="ff-expert-home__label">
                                    <CpuChipIcon class="ff-icon" />
                                    Remote Instances
                                </p>
                            </div>
                            <RecentlyModifiedDevices
                                v-if="featuresCheck.isRemoteInstanceFeatureEnabledForPlatform"
                                variant="compact"
                                :total-devices="totalDevices"
                            />
                            <p v-else class="ff-expert-home__empty" data-el="remote-unavailable">
                                Remote Instances are not available to your team.
                            </p>
                        </div>
                    </div>

                    <div class="ff-expert-home__activity" data-el="overview-activity">
                        <FfAccordion class="ff-expert-home__log" variant="bare" @state-changed="onActivityToggled">
                            <template #label>
                                <p class="ff-expert-home__label">
                                    <CircleStackIcon class="ff-icon" />
                                    Recent Activity
                                </p>
                            </template>
                            <template #content>
                                <AuditLog :entries="logEntries" :loading="activityLoading" />
                            </template>
                        </FfAccordion>
                    </div>
                </div>
            </div>
        </div>

        <ConfirmInstanceDeleteDialog
            v-if="isDeleteInstanceDialogOpen"
            ref="confirmInstanceDeleteDialog"
            @cancel="isDeleteInstanceDialogOpen = false"
            @confirm="onInstanceDeleted"
        />
    </ff-page>
</template>

<script setup lang="ts">
import { ChevronLeftIcon } from '@heroicons/vue/20/solid'
import { CircleStackIcon, CpuChipIcon } from '@heroicons/vue/24/outline'
import { type Ref, computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'

import HomeGreeting from './components/HomeGreeting.vue'

import TeamAPI from '@/api/team.js'
import FfAccordion from '@/components/Accordion.vue'
import AuditLog from '@/components/audit-log/AuditLog.vue'
import ExpertPanel from '@/components/expert/Expert.vue'
import ExpertModeSwitcher from '@/components/expert/components/ExpertModeSwitcher.vue'
import PromptSuggestions from '@/components/expert/components/PromptSuggestions.vue'
import ProjectsIcon from '@/components/icons/Projects.js'
import { type PromptSuggestion, usePromptSuggestions } from '@/composables/PromptSuggestions'
import ConfirmInstanceDeleteDialog from '@/pages/instance/Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import RecentlyModifiedDevices from '@/pages/team/Home/components/RecentlyModifiedDevices.vue'
import RecentlyModifiedInstances from '@/pages/team/Home/components/RecentlyModifiedInstances.vue'
import Alerts from '@/services/alerts.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { SUPPORT_AGENT } from '@/stores/product-expert-agents.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

import type { AuditLogEntry } from '@/types'
import sumCounts from '@/utils/sumCounts'

defineOptions({ name: 'TeamHomeExpert' })

provide('expert-surface', 'overview')

const contextStore = useContextStore()
const settingsStore = useAccountSettingsStore()
const expertStore = useProductExpertStore() as ReturnType<typeof useProductExpertStore> & {
    messages: { _type: string }[]
    isInputDisabled: boolean
    handleQuery: (payload: { query: string }) => Promise<unknown>
}
const drawersStore = useUxDrawersStore()

const featuresCheck = computed(() => settingsStore.featuresCheck)
const totalInstances = ref(0)
const totalDevices = ref(0)
const logEntries = ref<AuditLogEntry[] | null>(null)
const activityLoading = ref(false)

const isDeleteInstanceDialogOpen = ref(false)
const confirmInstanceDeleteDialog = ref<{ show: (instance: unknown) => void } | null>(null)

function openDeleteInstanceForm (instance: unknown) {
    isDeleteInstanceDialogOpen.value = true
    nextTick(() => confirmInstanceDeleteDialog.value?.show(instance))
}

function onInstanceDeleted () {
    isDeleteInstanceDialogOpen.value = false
    loadInstanceCount('hosted', totalInstances)
}

async function loadInstanceCount (type: string, target: Ref<number>) {
    try {
        target.value = sumCounts(await TeamAPI.getTeamInstanceCounts(contextStore.team.id, [], type))
    } catch {
        // these only drive the "N more" links, so a failure is not worth a toast on page load
    }
}

async function onActivityToggled (open: boolean) {
    if (!open || activityLoading.value || logEntries.value !== null) return
    activityLoading.value = true
    try {
        const response = await TeamAPI.getTeamAuditLog(contextStore.team.id, {}, null, 50)
        logEntries.value = response.log
    } catch {
        Alerts.emit('Failed to load recent activity.', 'warning')
    } finally {
        activityLoading.value = false
    }
}

const canSwitchAgent = computed<boolean>(() => {
    const features = settingsStore.featuresCheck
    return !!features.isExpertAssistantFeatureEnabled && !!features.isExpertInsightsFeatureEnabled
})

type Stage = 'idle' | 'composing' | 'conversing'

const stage = ref<Stage>('idle')
const liveTurns = computed<number>(() => expertStore.messages.filter(message => message._type === 'human').length)

const isComposerDisabled = computed<boolean>(() => expertStore.isInputDisabled)

const canResume = computed<boolean>(() => liveTurns.value > 0 || isComposerDisabled.value)

const isChatOpen = computed<boolean>(() => stage.value === 'conversing')

provide('expert-chat-open', isChatOpen)

const { suggestions, trackShown, trackClick } = usePromptSuggestions({ surface: 'overview' })

function onSuggestion (suggestion: PromptSuggestion) {
    if (isComposerDisabled.value) {
        return
    }
    trackClick(suggestion)
    if (suggestion.needsInput) {
        stage.value = 'composing'
        expertStore.setPendingInput(suggestion.prompt)
        return
    }
    stage.value = 'conversing'
    expertStore.handleQuery({ query: suggestion.prompt }).catch(e => e)
}

function onComposerInput (event: Event) {
    const target = event.target as HTMLTextAreaElement | null
    if (!target || typeof target.value !== 'string') return

    if (target.value.trim().length > 0) {
        if (stage.value === 'idle') {
            stage.value = 'composing'
        }
        return
    }
    if (stage.value === 'composing') {
        stage.value = 'idle'
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
    loadInstanceCount('hosted', totalInstances)
    loadInstanceCount('remote', totalDevices)
    trackShown()
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
$ff-enter: 500ms;
$ff-exit: 300ms;
$ff-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1);
$ff-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15);
$ff-shift: 32px;
$ff-column: 820px;
$ff-wide: 1080px;

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
        transition: opacity 240ms $ff-decelerate, visibility 240ms;
    }

    &:not(.is-composing) &__back {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity $ff-exit $ff-accelerate, visibility $ff-exit;
    }

    &__instances {
        width: 100%;
        max-width: $ff-wide;
        margin-top: 28px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 28px;
    }

    &.is-composing &__folded {
        opacity: 0;
        visibility: hidden;
        transform: translateY($ff-shift);
        pointer-events: none;
        transition: opacity $ff-exit $ff-accelerate, transform $ff-exit $ff-accelerate,
                    visibility $ff-exit;
    }

    &__folded {
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translateY(0);
        transition: opacity $ff-enter $ff-decelerate, transform $ff-enter $ff-decelerate,
                    visibility $ff-enter;
        will-change: opacity, transform;
    }

    &__activity {
        width: 100%;
        max-width: $ff-wide;
        margin-top: 40px;
        margin-bottom: 40px;
    }

    &__log {
        & > :deep(.ff-accordion--content) {
            padding: 4px;
            border: 1px solid var(--ff-color-border);
            border-radius: 0.625rem;
            background: var(--ff-color-bg-surface);

            .ff-accordion {
                margin-bottom: 0;
            }

            .ff-accordion--button:not(:hover) {
                background: transparent;
            }

            .ff-accordion--button {
                border: none;
                border-bottom: 1px solid var(--ff-color-border-subtle);
            }

            .ff-audit-entry {
                border: none;
            }
        }
    }

    &__fold {
        display: grid;
        grid-template-rows: 1fr;
        flex: 0 0 auto;
        margin-top: 28px;
        transition: grid-template-rows $ff-expand $ff-ease, margin-top $ff-expand $ff-ease,
                    visibility $ff-expand;

        > * {
            min-height: 0;
            overflow: hidden;
        }
    }

    &.is-conversing &__fold {
        grid-template-rows: 0fr;
        margin-top: 0;
        visibility: hidden;
    }

    &__suggestions {
        width: 100%;
        max-width: $ff-wide;

        &.is-inert {
            opacity: 0.45;
            pointer-events: none;
        }
    }

    &__suggestions :deep(.expert-prompt-suggestions) {
        margin: 0;
    }

    &__section {
        display: flex;
        flex-direction: column;
    }

    &__section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding-bottom: 5px;
    }

    &__label {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        margin: 0;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--ff-color-text-subtle);

        .ff-icon {
            margin-left: 0;
        }
    }

    &__empty {
        margin: 0;
        padding: 6px 8px;
        font-size: 12px;
        color: var(--ff-color-text-subtle);
    }

    &__resume {
        align-self: center;
        flex: 0 0 auto;
        min-height: 0;
        margin-top: 14px;
        max-height: 6rem;
        overflow: hidden;
        transition: max-height $ff-expand $ff-ease, opacity 220ms ease,
                    margin-top $ff-expand $ff-ease, padding $ff-expand $ff-ease,
                    visibility $ff-expand;
    }

    &__resume-count {
        color: var(--ff-color-text-subtle);
    }

    &.is-conversing &__resume {
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
        margin-top: 0;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
    }

    &__mode {
        align-self: center;
        flex: 0 0 auto;
        display: flex;
        justify-content: center;
        width: 100%;
        max-width: $ff-column;
        max-height: 0;
        margin-bottom: 0;
        opacity: 0;
        visibility: hidden;
        overflow: hidden;
        pointer-events: none;
        transition: max-height $ff-expand $ff-ease, opacity 220ms ease,
                    margin-bottom $ff-expand $ff-ease, visibility $ff-expand;
    }

    &.is-conversing &__mode {
        max-height: 6rem;
        margin-bottom: 10px;
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
    }

    &__intro {
        flex: 0 0 auto;
        display: grid;
        grid-template-rows: 1fr;
        transition: grid-template-rows $ff-expand $ff-ease;

        > * {
            min-height: 0;
            overflow: hidden;
        }
    }

    &.is-conversing &__intro {
        grid-template-rows: 0fr;
    }

    &__expert {
        display: flex;
        flex-direction: column;
        flex: 0 0 auto;
        min-height: 0;
        margin-top: 28px;
        transition: flex-grow $ff-expand $ff-ease;

        :deep(.input-wrapper) {
            flex-direction: row;
            align-items: stretch;
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

        :deep(.btn-send:disabled) {
            visibility: hidden;
        }

        :deep(.actions) {
            display: flex;
            align-items: center;
            padding: 0 0.6rem 0 0;
            flex: 0 0 auto;
        }

        :deep(.action-buttons) {
            max-height: 0;
            opacity: 0;
            visibility: hidden;
            margin-bottom: 0;
            overflow: hidden;
            transition: max-height $ff-expand $ff-ease, opacity 260ms ease,
                        margin-bottom $ff-expand $ff-ease, visibility $ff-expand;
        }
    }

    &.is-conversing &__expert {
        flex-grow: 1;
        flex-shrink: 1;
    }

    &__expert :deep(.ff-expert) {
        height: auto;
        flex: 0 0 auto;
        min-height: 0;
        background: transparent;
    }

    &.is-conversing &__expert :deep(.ff-expert) {
        flex: 1;
    }

    &__expert :deep(.messages-container),
    &__expert :deep(.ff-expert-input) {
        width: 100%;
        max-width: $ff-column;
        margin-left: auto;
        margin-right: auto;
    }

    &__expert :deep(.messages-container) {
        flex-grow: 0;
        flex-basis: 0;
        padding-top: 0;
        padding-bottom: 0;
        opacity: 0;
        visibility: hidden;
        transition: flex-grow $ff-expand $ff-ease, padding-top $ff-expand $ff-ease,
                    padding-bottom $ff-expand $ff-ease, opacity 300ms ease, visibility 300ms;
    }

    &.is-conversing &__expert :deep(.messages-container) {
        flex-grow: 1;
        padding-top: 1rem;
        padding-bottom: 1rem;
        opacity: 1;
        visibility: visible;
    }

    &__expert :deep(.ff-expert-input) {
        border-top: none;
        background: transparent;
        min-height: 0;
        padding: 0;
    }

    &.is-conversing &__expert :deep(.action-buttons) {
        max-height: 6rem;
        opacity: 1;
        visibility: visible;
        margin-bottom: 0.5rem;
    }
}

@media (max-width: 760px) {
    .ff-expert-home__instances {
        grid-template-columns: minmax(0, 1fr);
    }
}

@media (prefers-reduced-motion: reduce) {
    .ff-expert-home__back,
    .ff-expert-home__resume,
    .ff-expert-home__mode,
    .ff-expert-home__intro,
    .ff-expert-home__folded,
    .ff-expert-home__fold,
    .ff-expert-home__expert,
    .ff-expert-home__expert :deep(.messages-container),
    .ff-expert-home__expert :deep(.action-buttons) {
        transition: none;
    }
}
</style>
