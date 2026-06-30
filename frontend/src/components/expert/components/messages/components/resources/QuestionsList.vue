<template>
    <div v-if="questions.length" class="expert-questions">
        <div v-for="(q, qIndex) in questions" :key="qIndex" class="question-block">
            <div class="question-head">
                <h4 class="question-title">{{ q.question }}</h4>
                <span class="question-hint">{{ q.multiSelect ? 'Select all that apply' : 'Select one' }}</span>
            </div>

            <ff-radio-group
                v-if="!q.multiSelect"
                orientation="vertical"
                :options="optionSets[qIndex]"
                :model-value="selections[qIndex][0] ?? null"
                @update:model-value="value => setSingle(qIndex, value)"
            />

            <div v-else class="options-multi">
                <ff-checkbox
                    v-for="(opt, oIndex) in q.options"
                    :key="oIndex"
                    :model-value="isSelected(qIndex, opt.label)"
                    :disabled="disabled"
                    @update:model-value="checked => setMulti(qIndex, opt.label, checked)"
                >
                    <span class="option-label">{{ opt.label }}</span>
                    <span v-if="opt.description" class="option-description">{{ opt.description }}</span>
                </ff-checkbox>
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
export default {
    name: 'QuestionsList',
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
            selections: this.questions.map(() => []),
            // ff-radio-group expects an options array; the option label doubles as its value.
            // disabled is mirrored from the prop in the watcher below so a stale card greys out.
            optionSets: this.questions.map(q => (q.options || []).map(opt => ({
                label: opt.label,
                value: opt.label,
                description: opt.description || null,
                disabled: this.disabled
            })))
        }
    },
    computed: {
        allAnswered () {
            return this.questions.every((q, i) => (this.selections[i] || []).length > 0)
        }
    },
    watch: {
        disabled (value) {
            this.optionSets.forEach(options => options.forEach(opt => { opt.disabled = value }))
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
        setSingle (qIndex, label) {
            this.selections.splice(qIndex, 1, label === null || label === undefined ? [] : [label])
        },
        setMulti (qIndex, label, checked) {
            const current = this.selections[qIndex] || []
            const next = checked
                ? [...current, label]
                : current.filter(l => l !== label)
            this.selections.splice(qIndex, 1, next)
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

.options-multi {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

// The checkbox slot renders both the label and (optionally) its description; stack them.
.option-label {
    display: block;
}

.option-description {
    display: block;
    margin-top: 2px;
    font-weight: 400;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--ff-color-text-subtle);
}

.questions-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}
</style>
