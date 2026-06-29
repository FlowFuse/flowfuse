<template>
    <div v-if="questions.length" class="expert-questions">
        <div v-for="(q, qIndex) in questions" :key="qIndex" class="question-block">
            <div class="question-head">
                <h4 class="question-title">{{ q.question }}</h4>
                <span class="question-hint">{{ q.multiSelect ? 'Select all that apply' : 'Select one' }}</span>
            </div>
            <div class="options-grid">
                <button
                    v-for="(opt, oIndex) in q.options"
                    :key="oIndex"
                    type="button"
                    class="option-btn"
                    :class="{ selected: isSelected(qIndex, opt.label), 'is-multi': q.multiSelect }"
                    :disabled="disabled"
                    :title="optionTooltip(opt)"
                    @click="toggle(qIndex, opt.label, q.multiSelect)"
                >
                    <span class="option-label">
                        <span
                            class="option-indicator"
                            :class="{ 'is-multi': q.multiSelect, checked: isSelected(qIndex, opt.label) }"
                            aria-hidden="true"
                        >
                            <CheckIcon v-if="q.multiSelect && isSelected(qIndex, opt.label)" class="indicator-check" />
                        </span>
                        <span class="option-label-text">{{ opt.label }}</span>
                    </span>
                    <span v-if="opt.description" class="option-description">{{ opt.description }}</span>
                </button>
            </div>
        </div>
        <div class="questions-actions">
            <ff-button
                kind="primary"
                size="small"
                :disabled="disabled || !allAnswered"
                @click="$emit('select', compose())"
            >
                Send
            </ff-button>
            <ff-button
                kind="secondary"
                size="small"
                :disabled="disabled || !allAnswered"
                title="Edit before sending"
                @click="$emit('edit', compose())"
            >
                Edit
            </ff-button>
        </div>
    </div>
</template>

<script>
import { CheckIcon } from '@heroicons/vue/20/solid'

export default {
    name: 'QuestionsList',
    components: { CheckIcon },
    props: {
        questions: {
            type: Array,
            required: true
        },
        disabled: {
            type: Boolean,
            default: false
        },
        shouldStream: {
            type: Boolean,
            default: false
        }
    },
    emits: ['select', 'edit', 'streaming-complete'],
    data () {
        return {
            // one array of selected option labels per question
            selections: this.questions.map(() => [])
        }
    },
    computed: {
        allAnswered () {
            return this.questions.every((q, i) => (this.selections[i] || []).length > 0)
        }
    },
    mounted () {
        // questions are interactive cards, not streamed text; signal completion
        // so the AnswerWrapper streaming order can advance.
        this.$nextTick(() => this.$emit('streaming-complete'))
    },
    methods: {
        isSelected (qIndex, label) {
            return (this.selections[qIndex] || []).includes(label)
        },
        toggle (qIndex, label, multiSelect) {
            const current = this.selections[qIndex] || []
            let next
            if (multiSelect) {
                next = current.includes(label)
                    ? current.filter(l => l !== label)
                    : [...current, label]
            } else {
                next = current.includes(label) ? [] : [label]
            }
            this.selections.splice(qIndex, 1, next)
        },
        optionTooltip (opt) {
            return opt.description ? `${opt.label}\n${opt.description}` : opt.label
        },
        compose () {
            // always send one "question: answer(s)" line per question, even for a single
            // question, so the agent always sees both the question and the chosen answer
            return this.questions
                .map((q, i) => `${q.question} ${(this.selections[i] || []).join(', ')}`)
                .join('\n')
        }
    }
}
</script>

<style scoped lang="scss">
.expert-questions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.question-block {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.question-head {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.question-title {
    font-size: 1rem;
    font-weight: 500;
    color: var(--ff-color-text-strong);
    margin: 0;
}

.question-hint {
    font-size: 0.75rem;
    font-style: italic;
    color: var(--ff-color-text-subtle);
}

.options-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.option-btn {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: flex-start;
    width: 100%;
    text-align: left;
    padding: 6px 10px;
    min-height: 32px;
    border: 1px solid var(--ff-color-border);
    border-radius: 4px;
    background: transparent;
    color: var(--ff-color-text-strong);
    cursor: pointer;
    transition: color 0.15s, background-color 0.15s, border-color 0.15s;

    &:hover:not(:disabled) {
        background: var(--ff-color-bg-surface);
    }

    &.selected {
        border-color: var(--ff-color-accent);
        background: var(--ff-color-accent-surface);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}

.option-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
    font-size: 0.875rem;
    line-height: 1.4;
    width: 100%;
}

.option-indicator {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid var(--ff-color-border);
    border-radius: 50%; // circular = single-select (radio)
    background: transparent;
    transition: border-color 0.15s, background-color 0.15s;

    &.is-multi {
        border-radius: 4px; // square = multi-select (checkbox)
    }

    &.checked {
        border-color: var(--ff-color-accent);
    }

    // single-select selected: filled inner dot
    &:not(.is-multi).checked::after {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--ff-color-accent);
    }

    // multi-select selected: solid fill behind the checkmark
    &.is-multi.checked {
        background: var(--ff-color-accent);
    }
}

.indicator-check {
    width: 12px;
    height: 12px;
    color: var(--ff-color-text-on-brand);
}

.option-description {
    font-weight: 400;
    font-size: 0.875rem;
    line-height: 1.4;
    opacity: 0.7;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    max-width: 100%;
}

.questions-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}
</style>
