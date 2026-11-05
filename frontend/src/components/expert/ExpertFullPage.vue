<template>
    <div class="expert-full-page">
        <div class="expert-full-page__column">
            <ExpertPanel />
        </div>
    </div>
</template>

<script>
import ExpertPanel from '@/components/expert/Expert.vue'
import { EXPERT_SURFACES } from '@/components/expert/surfaces.js'

export default {
    name: 'ExpertFullPage',
    components: {
        ExpertPanel
    },
    provide () {
        return {
            'expert-surface': this.surface
        }
    },
    props: {
        surface: {
            type: String,
            required: true,
            validator: value => Object.values(EXPERT_SURFACES).includes(value)
        }
    }
}
</script>

<style scoped lang="scss">
.expert-full-page {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
    background: var(--ff-color-bg-app);
}

.expert-full-page__column {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    max-width: 46rem;
    padding: 1.5rem;
    min-height: 0;
}

/*
 * The full page treatment for the embedded expert panel. Everything below
 * restyles the shared chat components for these surfaces only; the drawer's
 * own styling is untouched.
 */

.expert-full-page__column :deep(.ff-expert) {
    background: transparent;
}

/* Flatten the chat bubbles: the transcript reads as a document, not a chat */
.expert-full-page__column :deep(.message-bubble.ai-message) {
    background: transparent;
    padding: 0;
    border-radius: 0;
}

.expert-full-page__column :deep(.message-bubble.human-message) {
    background: transparent;
    color: var(--ff-color-text-subtle);
    padding: 0;
    align-self: stretch;
}

/* The active question set renders as a card, per the mockup */
.expert-full-page__column :deep(.expert-questions) {
    background: var(--ff-color-bg-surface);
    border: 1px solid var(--ff-color-border);
    border-radius: 0.5rem;
    padding: 1.5rem;
    gap: 1.25rem;
}

.expert-full-page__column :deep(.expert-questions .question-title) {
    font-size: 1.25rem;
    font-weight: 600;
}

/* The composer sits quietly at the bottom: no divider, no panel chrome */
.expert-full-page__column :deep(.ff-expert-input) {
    border-top: none;
    background: transparent;
    min-height: 0;
    padding: 1rem 0;
}

.expert-full-page__column :deep(.expert-questions .ff-radio-group-options) {
    gap: 0.625rem;
}

.expert-full-page__column :deep(.expert-questions .questions-actions) {
    margin-top: 0.25rem;
}
</style>
