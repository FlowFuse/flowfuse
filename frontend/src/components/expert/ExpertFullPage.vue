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

/* The transcript fades into the page above the composer instead of ending in a hard cut.
   The padding lets the last message, and any focused control, scroll clear of the fade. */
.expert-full-page__column :deep(.messages-container) {
    padding-bottom: 3rem;
    scroll-padding-bottom: 3rem;
}

/* The fade is laid over the bottom of the transcript from the composer, short of the scrollbar */
.expert-full-page__column :deep(.ff-expert-input::before) {
    content: '';
    position: absolute;
    left: 0;
    right: 0.5rem;
    bottom: 100%;
    height: 3rem;
    background: linear-gradient(to bottom, transparent, var(--ff-color-bg-app));
    pointer-events: none;
}

/* Flatten the chat bubbles: the transcript reads as a document, not a chat. The Expert's text
   reserves the rule and indent it takes once answered, so answering only colours the rule. */
.expert-full-page__column :deep(.message-bubble.ai-message) {
    background: transparent;
    padding: 0.125rem 0 0.125rem 0.875rem;
    border-left: 2px solid transparent;
    border-radius: 0;
}

/* Blocks that stand on their own, such as a tool approval or the plan, keep to the column edge */
.expert-full-page__column :deep(.message-bubble.ai-message.message-bubble--bare),
.expert-full-page__column :deep(.message-bubble.ai-message.expert-answer--plan) {
    padding: 0;
    border-left: none;
}

/* Once answered, the Expert's text takes a neutral rule, so question and answer read as a pair.
   Accent stays reserved for the person's own words. */
.expert-full-page__column :deep(.answered .message-bubble.ai-message) {
    border-left-color: var(--ff-color-border);
}

.expert-full-page__column :deep(.message-bubble.human-message) {
    background: transparent;
    color: var(--ff-color-text);
    padding: 0.125rem 0 0.125rem 0.875rem;
    border-left: 2px solid var(--ff-color-accent);
    border-radius: 0;
    align-self: stretch;
}

/* Without the bubble padding, consecutive blocks in the Expert's text need their own spacing */
.expert-full-page__column :deep(.streamable-content :is(p, ul, ol) + :is(p, ul, ol)) {
    margin-top: 0.5rem;
}

/* Lists in the Expert's text, such as a plan's steps, need room between wrapped lines and items */
.expert-full-page__column :deep(.streamable-content :is(ul, ol) > li) {
    line-height: 1.6;
}

.expert-full-page__column :deep(.streamable-content :is(ul, ol) > li + li) {
    margin-top: 0.375rem;
}

/* A thin rule and extra space mark where each of the Expert's turns starts after a reply */
.expert-full-page__column :deep(.messages-wrapper li.turn-start) {
    margin-top: 0.75rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--ff-color-border);
}

/* The open question set is the one framed card on screen, led by the Expert's intro so the turn
   reads in order: what the Expert says, then what it asks. The frame is keyed on the message,
   not the card inside it, so it is there from the first streamed word. */
.expert-full-page__column :deep(.has-questions .message-bubble.ai-message.expert-answer--questions) {
    background: var(--ff-color-bg-surface);
    border: 1px solid var(--ff-color-border);
    border-radius: 0.5rem;
    padding: 1.5rem;
    gap: 1.25rem;
}

.expert-full-page__column :deep(.has-questions .expert-answer--questions > .streamable-content) {
    margin: 0;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--ff-color-border);
}

.expert-full-page__column :deep(.has-questions .expert-answer--questions > .expert-questions) {
    margin: 0;
}

.expert-full-page__column :deep(.expert-questions) {
    gap: 1.25rem;
}

.expert-full-page__column :deep(.expert-questions .question-title) {
    font-size: 1.25rem;
    font-weight: 600;
}

/* The plan is a bounded block of its own, set apart from the text before it */
.expert-full-page__column :deep(.expert-plan) {
    background: var(--ff-color-bg-surface);
    border: 1px solid var(--ff-color-border);
    border-radius: 0.5rem;
    padding: 1.25rem 1.5rem;
}

.expert-full-page__column :deep(.expert-plan .plan-name) {
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
