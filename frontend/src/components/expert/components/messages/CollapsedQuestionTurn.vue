<template>
    <div class="collapsed-question-turn" :class="{ expanded }">
        <template v-if="!expanded">
            <div
                v-for="(entry, index) in turn.entries"
                :key="index"
                class="folded-question"
                data-el="folded-question"
            >
                <button
                    type="button"
                    class="question-text"
                    data-action="toggle-turn"
                    title="Show the full question card"
                    @click="expanded = true"
                >
                    {{ entry.question }}
                </button>
                <div class="folded-answers">
                    <button
                        v-for="(chip, chipIndex) in chipsFor(entry)"
                        :key="chipIndex"
                        type="button"
                        class="answer-chip"
                        data-action="edit-answer"
                        title="Load this answer into the composer to correct it"
                        @click="editAnswer(entry)"
                    >
                        <span class="chip-label">{{ chip }}</span>
                        <span class="chip-remove" aria-hidden="true">&times;</span>
                    </button>
                    <span v-if="chipsFor(entry).length === 0" class="skipped-marker">Skipped</span>
                </div>
            </div>
        </template>
        <div v-else class="expanded-messages">
            <button
                type="button"
                class="question-text"
                data-action="toggle-turn"
                title="Collapse this step"
                @click="expanded = false"
            >
                Collapse this step
            </button>
            <AiMessage v-bind="{ ...turn.questionsMessage }" />
            <HumanMessage v-if="turn.replyMessage" v-bind="{ ...turn.replyMessage }" />
        </div>
    </div>
</template>

<script>
import { mapActions } from 'pinia'

import AiMessage from './AiMessage.vue'
import HumanMessage from './HumanMessage.vue'

import { useProductExpertStore } from '@/stores/product-expert.js'

export default {
    name: 'CollapsedQuestionTurn',
    components: {
        AiMessage,
        HumanMessage
    },
    props: {
        turn: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            expanded: false
        }
    },
    computed: {
        // A hand-typed or edited reply doesn't match the question lines, so
        // every entry resolves to null; fall back to the raw reply text once.
        hasMatchedAnswers () {
            return this.turn.entries.some(entry => entry.answer !== null)
        }
    },
    methods: {
        ...mapActions(useProductExpertStore, ['setPendingInput']),
        // One chip per pick: QuestionsList composes multi-select answers as a
        // comma-separated list, so split for display only. Editing any chip
        // loads the whole answer line, since a resend replaces the full turn.
        chipsFor (entry) {
            if (entry.answer) {
                return entry.answer.split(', ')
            }
            if (!this.hasMatchedAnswers && this.turn.replyMessage?.content) {
                return [this.turn.replyMessage.content]
            }
            return []
        },
        editAnswer (entry) {
            if (entry.answer) {
                this.setPendingInput(`${entry.question} ${entry.answer}`)
            } else if (this.turn.replyMessage?.content) {
                this.setPendingInput(this.turn.replyMessage.content)
            }
        }
    }
}
</script>

<style scoped lang="scss">
.collapsed-question-turn {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.folded-question {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.125rem 0 0.125rem 0.875rem;
    border-left: 2px solid var(--ff-color-border);
}

.question-text {
    font-size: 0.8125rem;
    color: var(--ff-color-text-subtle);
    text-align: left;
    cursor: pointer;

    &:hover {
        color: var(--ff-color-text-strong);
    }
}

.folded-answers {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.answer-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--ff-color-text-strong);
    background: var(--ff-color-bg-surface);
    border: 1px solid var(--ff-color-border);
    border-radius: 9999px;
    padding: 0.25rem 0.75rem;
    cursor: pointer;
    max-width: 100%;

    &:hover {
        border-color: var(--ff-color-accent);
    }
}

.chip-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 22rem;
}

.chip-remove {
    font-weight: 400;
    color: var(--ff-color-text-subtle);
    line-height: 1;
}

.skipped-marker {
    font-size: 0.875rem;
    font-style: italic;
    color: var(--ff-color-text-subtle);
}

.expanded-messages {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding-left: 0.875rem;
    border-left: 2px solid var(--ff-color-accent);
}
</style>
