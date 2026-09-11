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

            <div class="question-free-text" :class="{ 'question-free-text--disabled': disabled }">
                <ff-radio-button
                    v-if="!q.multiSelect"
                    label=""
                    value="__free-text__"
                    :checked="freeTextSelected[qIndex]"
                    :disabled="disabled"
                    @select="() => selectFreeText(qIndex)"
                />
                <ff-checkbox
                    v-else
                    :model-value="freeTextSelected[qIndex]"
                    :disabled="disabled"
                    @update:model-value="checked => toggleFreeText(qIndex, checked)"
                />
                <ff-text-input
                    class="question-free-text__input"
                    :model-value="freeTexts[qIndex]"
                    :disabled="disabled"
                    placeholder="Type your own answer..."
                    @update:model-value="value => setFreeText(qIndex, value)"
                />
            </div>
        </div>
        <div class="questions-actions">
            <ff-button
                kind="primary"
                size="small"
                :disabled="disabled || !allAnswered"
                @click="submit"
            >
                Send
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
        },
        // a previously sent answer (picks and typed text) to restore after a page refresh
        initialAnswer: {
            type: Object,
            default: null
        }
    },
    emits: ['select', 'streaming-complete'],
    data () {
        const initial = this.initialAnswer
        return {
            // one array of selected option labels per question
            selections: initial?.selections
                ? initial.selections.map(picks => [...picks])
                : this.questions.map(() => []),
            freeTexts: initial?.freeTexts ? [...initial.freeTexts] : this.questions.map(() => ''),
            // separate from freeTexts so a typed-but-unpicked answer stays in the field
            freeTextSelected: initial?.freeTextSelected ? [...initial.freeTextSelected] : this.questions.map(() => false),
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
            return this.questions.every((q, i) => {
                const hasSelection = (this.selections[i] || []).length > 0
                const hasFreeText = this.freeTextSelected[i] && (this.freeTexts[i] || '').trim().length > 0
                return hasSelection || hasFreeText
            })
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
            // picking an option deselects the typed answer, but leaves the text in the field
            if (label !== null && label !== undefined) {
                this.freeTextSelected.splice(qIndex, 1, false)
            }
        },
        setMulti (qIndex, label, checked) {
            const current = this.selections[qIndex] || []
            const next = checked
                ? [...current, label]
                : current.filter(l => l !== label)
            this.selections.splice(qIndex, 1, next)
        },
        selectFreeText (qIndex) {
            // single-select: the typed answer and the options are mutually exclusive
            this.freeTextSelected.splice(qIndex, 1, true)
            this.selections.splice(qIndex, 1, [])
        },
        toggleFreeText (qIndex, checked) {
            this.freeTextSelected.splice(qIndex, 1, checked)
        },
        setFreeText (qIndex, value) {
            this.freeTexts.splice(qIndex, 1, value)
            if (value.trim().length === 0) {
                return
            }
            // typing chooses the typed answer; on single-select that clears any picked option
            this.freeTextSelected.splice(qIndex, 1, true)
            if (!this.questions[qIndex].multiSelect) {
                this.selections.splice(qIndex, 1, [])
            }
        },
        compose () {
            // one "question answer(s)" line per question, unchanged in shape from before
            return this.questions
                .map((q, i) => {
                    const answers = [...(this.selections[i] || [])]
                    const freeText = (this.freeTexts[i] || '').trim()
                    if (this.freeTextSelected[i] && freeText) {
                        answers.push(freeText)
                    }
                    return `${q.question} ${answers.join(', ')}`
                })
                .join('\n')
        },
        submit () {
            // emit the composed text plus the raw answer state the parent persists for refresh
            this.$emit('select', {
                query: this.compose(),
                answer: {
                    selections: this.selections.map(picks => [...picks]),
                    freeTexts: [...this.freeTexts],
                    freeTextSelected: [...this.freeTextSelected]
                }
            })
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

.question-free-text {
    display: flex;
    align-items: center;
    gap: 0;

    // keep the control's label gutter so the field lines up under the option labels, and centre the control
    :deep(.ff-radio-btn),
    :deep(.ff-checkbox) {
        min-height: 32px;
        align-items: center;
    }

    :deep(.checkbox) {
        top: 50%;
        transform: translateY(-50%);
    }
}

.question-free-text__input {
    flex: 1;
    min-width: 0;
}

// match the greyed-out treatment the options get on a disabled card
.question-free-text--disabled {
    cursor: not-allowed;

    :deep(.ff-text-input) {
        background-color: transparent;
        border-color: var(--ff-color-border);
    }

    :deep(input) {
        color: var(--ff-color-text-subtle);
    }

    :deep(input::placeholder) {
        color: var(--ff-color-text-subtle);
    }
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
