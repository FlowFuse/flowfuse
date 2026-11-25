<template>
    <div class="flex flex-col gap-4" data-el="schema-builder">
        <div v-if="!schema" class="schema-builder__blocked" data-el="builder-blocked">
            <p>The builder needs the JSON to be a valid schema object. Fix it in the JSON view first.</p>
            <ff-button kind="secondary" size="small" data-action="builder-to-json" @click="emit('edit-json')">Go to JSON</ff-button>
        </div>
        <template v-else>
            <nav v-if="trail.length" class="schema-builder__trail" aria-label="Fields" data-el="builder-trail">
                <button class="schema-builder__link" data-action="builder-trail-root" @click="open('')">All fields</button>
                <template v-for="(step, index) in trail" :key="step.pointer">
                    <ChevronRightIcon class="ff-icon-sm schema-builder__muted" />
                    <span v-if="index === trail.length - 1" class="font-mono font-medium" aria-current="location">{{ step.name }}</span>
                    <button v-else class="schema-builder__link font-mono" data-action="builder-trail-step" @click="open(step.pointer)">{{ step.name }}</button>
                </template>
            </nav>
            <div ref="fieldsRegion" class="schema-builder__fields" tabindex="-1" :aria-label="regionLabel" data-el="builder-fields-region">
                <ff-data-table :columns="columns" data-el="builder-fields">
                    <template #rows>
                        <ff-data-table-row v-if="!rows.length">
                            <ff-data-table-cell class="status-message" :colspan="columns.length" data-el="builder-no-fields">This schema has no fields yet</ff-data-table-cell>
                        </ff-data-table-row>
                        <ff-data-table-row v-for="row in rows" :key="row.pointer" :data-el="`builder-row-${row.path}`">
                            <ff-data-table-cell class="schema-builder__field-cell">
                                <div class="schema-builder__field" :style="{ '--depth': row.depth }">
                                    <span v-for="level in row.depth" :key="level" class="schema-builder__guide" />
                                    <button v-if="row.drillIn" class="schema-builder__toggle" :aria-label="`Open ${row.name}`" data-action="builder-drill-in" @click="open(row.pointer)">
                                        <ArrowRightCircleIcon class="ff-icon-sm" />
                                    </button>
                                    <button v-else-if="row.children !== null" class="schema-builder__toggle" :aria-expanded="row.expanded" :aria-label="`${row.expanded ? 'Collapse' : 'Expand'} ${row.name}`" data-action="builder-toggle" @click="toggle(row.pointer)">
                                        <ChevronDownIcon v-if="row.expanded" class="ff-icon-sm" />
                                        <ChevronRightIcon v-else class="ff-icon-sm" />
                                    </button>
                                    <span class="font-mono font-medium">{{ row.name }}</span>
                                </div>
                            </ff-data-table-cell>
                            <ff-data-table-cell class="font-mono schema-builder__muted">{{ row.type }}</ff-data-table-cell>
                            <ff-data-table-cell :class="row.required ? 'schema-builder__yes' : 'schema-builder__muted'">{{ row.required ? 'Yes' : 'No' }}</ff-data-table-cell>
                            <ff-data-table-cell v-if="row.problem" class="schema-builder__error" data-el="builder-row-problem">{{ row.problem }}</ff-data-table-cell>
                            <ff-data-table-cell v-else class="schema-builder__muted" :class="{ 'font-mono': !row.jsonOnly && row.constraints !== 'None' }">{{ row.constraints }}</ff-data-table-cell>
                            <ff-data-table-cell>
                                <button v-if="row.jsonOnly" class="schema-builder__link" data-action="builder-edit-in-json" @click="emit('edit-json')">Edit in JSON →</button>
                                <span v-else>{{ row.description }}</span>
                            </ff-data-table-cell>
                        </ff-data-table-row>
                    </template>
                </ff-data-table>
            </div>
            <div v-if="holdsFields" class="schema-builder__other-fields" data-el="builder-other-fields">
                <p class="schema-builder__label">Fields not listed in the schema</p>
                <p>{{ OTHER_FIELDS_TEXT[otherFieldsMode] }}</p>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ArrowRightCircleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'
import { computed, nextTick, ref, watch } from 'vue'

import { type OtherFields, builderRows, fieldTrail, fieldsHolder, focusedHolder, otherFields } from './builder'
import type { Schema } from './schemaTypes'

defineOptions({ name: 'SchemaBuilder' })

const props = defineProps<{ schema: Schema | null }>()
const emit = defineEmits<{ 'edit-json': [] }>()

const columns = [
    { label: 'Field', key: 'name', class: ['w-1/5'] },
    { label: 'Type', key: 'type', class: ['w-40'] },
    { label: 'Required', key: 'required', class: ['w-28'] },
    { label: 'Constraints', key: 'constraints' },
    { label: 'Description', key: 'description' }
]

const OTHER_FIELDS_TEXT: Record<OtherFields, string> = {
    allowed: 'Allowed (additionalProperties: true)',
    none: 'Not allowed (additionalProperties: false)',
    schema: 'Allowed, and checked against the schema in additionalProperties'
}

const expanded = ref(new Set<string>())
function toggle (pointer: string) {
    const next = new Set(expanded.value)
    if (!next.delete(pointer)) {
        next.add(pointer)
    }
    expanded.value = next
}

const focus = ref('')
const fieldsRegion = ref<HTMLElement | null>(null)

// The button that was clicked is gone once the view changes, so focus moves to the fields
async function open (pointer: string) {
    focus.value = pointer
    await nextTick()
    fieldsRegion.value?.focus()
}

const holder = computed(() => props.schema ? focusedHolder(props.schema, focus.value) : null)
watch(holder, value => {
    if (focus.value && !value) {
        focus.value = ''
    }
})

const trail = computed(() => fieldTrail(focus.value))
const regionLabel = computed(() => trail.value.length ? `Fields of ${trail.value.at(-1)?.name}` : 'Fields')
const rows = computed(() => props.schema ? builderRows(props.schema, expanded.value, focus.value) : [])
const objectSchema = computed(() => {
    if (holder.value) {
        return holder.value.schema
    }
    return props.schema && fieldsHolder(props.schema)?.suffix === '' ? props.schema : null
})
const holdsFields = computed(() => !!objectSchema.value)
const otherFieldsMode = computed(() => objectSchema.value ? otherFields(objectSchema.value) : 'allowed')
</script>

<style scoped lang="scss">
.schema-builder {
    &__blocked {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 12px 16px;
        border: 1px solid var(--ff-color-border);
        border-radius: 0.625rem;
        background: var(--ff-color-bg-surface);
        font-size: 0.875rem;

        p {
            margin: 0;
        }
    }

    &__trail {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.875rem;
    }

    &__field {
        display: flex;
        align-items: center;
        gap: 0.375rem;
    }

    // one guide per level of nesting, drawn where the parent's name starts
    &__guide {
        align-self: stretch;
        width: 1.25rem;
        flex-shrink: 0;
        border-left: 1px solid var(--ff-color-border-strong);
        margin-left: 0.5rem;
        margin-right: -0.5rem;
    }

    &__toggle {
        display: flex;
        color: var(--ff-color-text-subtle);

        &:hover {
            color: var(--ff-color-text);
        }
    }

    &__muted {
        color: var(--ff-color-text-subtle);
    }

    &__yes {
        color: var(--ff-color-status-success-text);
    }

    &__link {
        font-weight: 500;
        color: var(--ff-color-link);

        &:hover {
            text-decoration: underline;
        }
    }

    &__fields:focus {
        outline: none;
    }

    &__error {
        color: var(--ff-color-status-error-text);
    }

    &__label {
        margin: 0 0 0.25rem;
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--ff-color-text);
    }

    &__other-fields p:last-child {
        margin: 0;
        font-size: 0.875rem;
        color: var(--ff-color-text);
    }
}
</style>
