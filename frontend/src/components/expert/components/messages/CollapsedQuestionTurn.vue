<template>
    <div class="collapsed-question-turn" :class="{ expanded }">
        <div v-if="!expanded" class="folded-turn">
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
                <div v-if="chipsFor(entry).length || showSkipped(entry)" class="folded-answers">
                    <button
                        v-for="(chip, chipIndex) in chipsFor(entry)"
                        :key="chipIndex"
                        type="button"
                        class="answer-chip"
                        data-action="edit-answer"
                        title="Edit this answer"
                        @click="editAnswer(entry)"
                    >
                        <span class="chip-label">{{ chip }}</span>
                        <PencilIcon class="chip-edit" aria-hidden="true" />
                    </button>
                    <span v-if="showSkipped(entry)" class="skipped-marker">Skipped</span>
                </div>
            </div>
            <button
                v-if="unmatchedReply"
                type="button"
                class="answer-chip folded-reply"
                data-action="edit-answer"
                title="Edit this answer"
                @click="editReply"
            >
                <span class="chip-label">{{ unmatchedReply }}</span>
                <PencilIcon class="chip-edit" aria-hidden="true" />
            </button>
        </div>
        <transition name="expand">
            <div v-if="expanded" class="expand-wrap">
                <div class="expanded-messages">
                    <button
                        type="button"
                        class="question-text"
                        data-action="toggle-turn"
                        title="Collapse this step"
                        @click="expanded = false"
                    >
                        Collapse this step
                    </button>
                    <AiMessage v-bind="{ ...turn.questionsMessage }" :instant="true" />
                    <HumanMessage v-if="turn.replyMessage" v-bind="{ ...turn.replyMessage }" />
                </div>
            </div>
        </transition>
    </div>
</template>

<script>
import { PencilIcon } from '@heroicons/vue/20/solid'
import { mapActions } from 'pinia'

import AiMessage from './AiMessage.vue'
import HumanMessage from './HumanMessage.vue'

import { useProductExpertStore } from '@/stores/product-expert.js'

export default {
    name: 'CollapsedQuestionTurn',
    components: {
        AiMessage,
        HumanMessage,
        PencilIcon
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
        hasMatchedAnswers () {
            return this.turn.entries.some(entry => entry.answer !== null)
        },
        unmatchedReply () {
            if (this.hasMatchedAnswers) {
                return null
            }
            return this.turn.replyMessage?.content || null
        }
    },
    methods: {
        ...mapActions(useProductExpertStore, ['setPendingInput']),
        chipsFor (entry) {
            return entry.answer ? entry.answer.split(', ') : []
        },
        showSkipped (entry) {
            return !entry.answer && !this.unmatchedReply
        },
        editAnswer (entry) {
            this.setPendingInput(`${entry.question} ${entry.answer}`)
        },
        editReply () {
            this.setPendingInput(this.turn.replyMessage.content)
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

.folded-turn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.125rem 0 0.125rem 0.875rem;
    border-left: 2px solid var(--ff-color-border);
}

.folded-question {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
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

.chip-edit {
    width: 0.875rem;
    height: 0.875rem;
    color: var(--ff-color-text-subtle);
    flex-shrink: 0;
}

.skipped-marker {
    font-size: 0.875rem;
    font-style: italic;
    color: var(--ff-color-text-subtle);
}

.expand-wrap {
    display: grid;
    grid-template-rows: 1fr;
    transition: grid-template-rows 0.22s ease;
}

.expand-enter-from,
.expand-leave-to {
    grid-template-rows: 0fr;
}

.expanded-messages {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    min-height: 0;
    overflow: hidden;
    padding-left: 0.875rem;
    border-left: 2px solid var(--ff-color-accent);
}
</style>
