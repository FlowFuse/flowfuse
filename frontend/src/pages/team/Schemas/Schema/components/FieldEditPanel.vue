<template>
    <div class="field-panel" data-el="field-panel">
        <div class="field-panel__grid">
            <label class="field-panel__item">
                <span class="field-panel__label">Name</span>
                <ff-text-input v-model="form.name" class="font-mono" data-form="field-name" />
            </label>
            <div class="field-panel__item">
                <span class="field-panel__label">Type</span>
                <ff-listbox v-model="form.type" :options="typeOptions" data-form="field-type" />
                <ff-checkbox v-if="form.type !== 'null'" v-model="form.nullable" data-form="field-nullable">Also allow null</ff-checkbox>
            </div>
            <div v-if="form.type === 'array'" class="field-panel__item">
                <span class="field-panel__label">Item type</span>
                <ff-listbox v-model="form.itemType" :options="itemOptions" data-form="field-item-type" />
            </div>
            <div class="field-panel__item">
                <span class="field-panel__label">Required</span>
                <ff-checkbox v-model="form.required" data-form="field-required">Message must include this field</ff-checkbox>
            </div>
            <label class="field-panel__item field-panel__item--wide">
                <span class="field-panel__label">Description</span>
                <ff-text-input v-model="form.description" data-form="field-description" />
            </label>
            <div v-if="takesAllowedValues" class="field-panel__item field-panel__item--wide">
                <span class="field-panel__label">Allowed values</span>
                <div class="field-panel__tags" data-form="field-allowed-values">
                    <span v-for="(value, index) in form.allowedValues" :key="value" class="field-panel__tag font-mono">
                        {{ value }}
                        <button :aria-label="`Remove ${value}`" @click="form.allowedValues.splice(index, 1)"><XMarkIcon class="ff-icon-sm" /></button>
                    </span>
                    <input v-model="newValue" class="field-panel__tag-input" placeholder="Add a value" data-form="field-add-value" @keydown.enter.prevent="addValue" @keydown="addOnComma" @blur="addValue">
                </div>
            </div>
            <template v-if="form.type === 'number' || form.type === 'integer'">
                <label class="field-panel__item"><span class="field-panel__label">Minimum</span><ff-text-input v-model="form.minimum" data-form="field-minimum" /></label>
                <label class="field-panel__item"><span class="field-panel__label">Maximum</span><ff-text-input v-model="form.maximum" data-form="field-maximum" /></label>
            </template>
            <template v-if="form.type === 'string'">
                <label class="field-panel__item"><span class="field-panel__label">Min length</span><ff-text-input v-model="form.minLength" data-form="field-min-length" /></label>
                <label class="field-panel__item"><span class="field-panel__label">Max length</span><ff-text-input v-model="form.maxLength" data-form="field-max-length" /></label>
                <label class="field-panel__item"><span class="field-panel__label">Pattern</span><ff-text-input v-model="form.pattern" class="font-mono" placeholder="^TS-\d{4}$" data-form="field-pattern" /></label>
                <div class="field-panel__item">
                    <span class="field-panel__label">Format</span>
                    <ff-listbox v-model="form.format" :options="formatOptions" placeholder="Any" data-form="field-format" />
                </div>
            </template>
            <template v-if="form.type === 'array'">
                <label class="field-panel__item"><span class="field-panel__label">Min items</span><ff-text-input v-model="form.minItems" data-form="field-min-items" /></label>
                <label class="field-panel__item"><span class="field-panel__label">Max items</span><ff-text-input v-model="form.maxItems" data-form="field-max-items" /></label>
                <div class="field-panel__item">
                    <span class="field-panel__label">Unique items</span>
                    <ff-checkbox v-model="form.uniqueItems" data-form="field-unique-items">No item may repeat</ff-checkbox>
                </div>
            </template>
            <div v-if="form.type === 'object'" class="field-panel__item">
                <span class="field-panel__label">Fields not listed</span>
                <ff-checkbox v-model="otherFields" data-form="field-other-fields">Allow them (additionalProperties)</ff-checkbox>
            </div>
        </div>
        <div class="field-panel__footer">
            <p v-if="problem" class="field-panel__problem" data-el="field-problem">{{ problem }}</p>
            <ff-button kind="secondary" size="small" data-action="field-cancel" @click="emit('cancel')">Cancel</ff-button>
            <ff-button size="small" data-action="field-apply" :disabled="!!problem" @click="apply">Apply</ff-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/20/solid'
import { computed, ref } from 'vue'

import { type FieldSchema } from './builder'
import { FIELD_TYPES, ITEM_TYPES, STRING_FORMATS, applyForm, formFor, formProblem, schemaAt, setOtherFieldsAllowed } from './builderEdits'

defineOptions({ name: 'FieldEditPanel' })

const props = defineProps<{ root: FieldSchema, pointer: string }>()
const emit = defineEmits<{ apply: [root: FieldSchema], cancel: [] }>()

const form = ref(formFor(props.root, props.pointer))
const otherFields = ref(schemaAt(props.root, props.pointer).additionalProperties !== false)
const newValue = ref('')

const typeOptions = FIELD_TYPES.map(type => ({ value: type, label: type }))
const itemOptions = ITEM_TYPES.map(type => ({ value: type, label: type }))
const formatOptions = [{ value: '', label: 'Any' }, ...STRING_FORMATS.map(format => ({ value: format, label: format }))]

const takesAllowedValues = computed(() => ['string', 'number', 'integer'].includes(form.value.type))
const problem = computed(() => formProblem(props.root, props.pointer, form.value))

function addValue () {
    const value = newValue.value.trim()
    if (value && !form.value.allowedValues.includes(value)) form.value.allowedValues.push(value)
    newValue.value = ''
}
function addOnComma (event: KeyboardEvent) {
    if (event.key !== ',') return
    event.preventDefault()
    addValue()
}

function apply () {
    addValue()
    if (problem.value) return
    let root = applyForm(props.root, props.pointer, form.value)
    if (form.value.type === 'object') {
        const renamed = props.pointer.slice(0, props.pointer.lastIndexOf('/properties/') + '/properties/'.length) + form.value.name.trim().replace(/~/g, '~0').replace(/\//g, '~1')
        root = setOtherFieldsAllowed(root, renamed, otherFields.value)
    }
    emit('apply', root)
}
</script>

<style scoped lang="scss">
.field-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--ff-color-bg-surface);
    border-top: 1px solid var(--ff-color-border);

    &__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
        gap: 0.75rem 1rem;
    }

    &__item {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;

        &--wide {
            grid-column: 1 / -1;
        }
    }

    &__label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--ff-color-text);
    }

    &__tags {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.375rem;
        padding: 0.25rem 0.5rem;
        border: 1px solid var(--ff-color-border-strong);
        border-radius: 0.375rem;
        background: var(--ff-color-bg-app);
    }

    &__tag {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.125rem 0.375rem;
        border: 1px solid var(--ff-color-border-strong);
        border-radius: 0.25rem;
        font-size: 0.8125rem;
        color: var(--ff-color-text);

        button {
            display: flex;
            color: var(--ff-color-text-subtle);
        }
    }

    &__tag-input {
        flex: 1;
        min-width: 8rem;
        border: none;
        background: transparent;
        font-size: 0.875rem;
        color: var(--ff-color-text);
        box-shadow: none;
    }

    &__footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.5rem;
    }

    &__problem {
        margin: 0 auto 0 0;
        font-size: 0.875rem;
        color: var(--ff-color-status-error-text);
    }
}
</style>
