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
                <ff-checkbox v-if="form.type !== ANY_TYPE && form.type !== 'null'" v-model="form.nullable" data-form="field-nullable">Also allow null</ff-checkbox>
            </div>
            <div v-if="form.type === 'array'" class="field-panel__item">
                <span class="field-panel__label">Item type</span>
                <ff-listbox v-model="itemType" :options="itemOptions" data-form="field-item-type" />
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
                <ff-tag-input ref="allowedValues" v-model="form.allowedValues" aria-label="Allowed values" placeholder="Add a value" data-form="field-allowed-values" />
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
                    <ff-listbox v-model="format" :options="formatOptions" data-form="field-format" />
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
                <ff-checkbox v-model="form.otherFields" data-form="field-other-fields">Allow them (additionalProperties)</ff-checkbox>
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
import { computed, ref, watch } from 'vue'

import { ANY_TYPE, FIELD_TYPES, ITEM_TYPES, STRING_FORMATS, allowedValuesFor, applyForm, formFor, formProblem } from './builderEdits'
import type { Schema } from './schemaTypes'

defineOptions({ name: 'FieldEditPanel' })

const props = defineProps<{ root: Schema, pointer: string }>()
const emit = defineEmits<{ apply: [result: { root: Schema, pointer: string }], cancel: [] }>()

const form = ref(formFor(props.root, props.pointer))
const allowedValues = ref<{ commit: () => void } | null>(null)

// Allowed values are dropped with the other constraints a new type doesn't take: text can't be a number's value
watch(() => form.value.type, type => {
    form.value.allowedValues = allowedValuesFor(type, form.value.allowedValues)
})

// a field that states no type takes any value, and can be left that way
const typeOptions = [...(form.value.type === ANY_TYPE ? [{ value: ANY_TYPE, label: ANY_TYPE }] : []), ...FIELD_TYPES.map(type => ({ value: type, label: type }))]
// The pickers take "any" as a choice like the others. The form has it as '', which a picker shows as nothing picked.
const ANY = 'any'
const orAny = (key: 'itemType' | 'format') => computed({
    get: () => form.value[key] || ANY,
    set: (value: string) => { form.value[key] = value === ANY ? '' : value }
})
const itemType = orAny('itemType')
const format = orAny('format')
// a format or item type the lists don't have is offered too, so the picker shows what the field has
const withCurrent = (values: readonly string[], current: string) => current && !values.includes(current) ? [...values, current] : values
const itemOptions = [{ value: ANY, label: 'Any' }, ...withCurrent(ITEM_TYPES, form.value.itemType).map(type => ({ value: type, label: type }))]
const formatOptions = [{ value: ANY, label: 'Any' }, ...withCurrent(STRING_FORMATS, form.value.format).map(format => ({ value: format, label: format }))]

const takesAllowedValues = computed(() => ['string', 'number', 'integer'].includes(form.value.type))
const problem = computed(() => formProblem(props.root, props.pointer, form.value))

function apply () {
    allowedValues.value?.commit()
    if (problem.value) {
        return
    }
    emit('apply', applyForm(props.root, props.pointer, form.value))
}
</script>

<style scoped lang="scss">
.field-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--ff-color-bg-surface);
    box-shadow: inset 0 6px 6px -6px rgba(0, 0, 0, 0.18);

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
