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
                        <template v-for="entry in entries" :key="entry.key">
                            <ff-data-table-row v-if="entry.kind === 'add'" :data-el="`builder-add-${entry.path}`">
                                <ff-data-table-cell :colspan="columns.length">
                                    <div class="schema-builder__field">
                                        <span v-for="level in entry.depth" :key="level" class="schema-builder__guide" />
                                        <button class="schema-builder__link" data-action="builder-add-field" @click="add(entry.holder)">+ Add field to {{ entry.name }}</button>
                                    </div>
                                </ff-data-table-cell>
                            </ff-data-table-row>
                            <ff-data-table-row v-else-if="entry.kind === 'panel'" data-el="builder-editing">
                                <ff-data-table-cell class="schema-builder__panel-cell" :colspan="columns.length">
                                    <FieldEditPanel :root="schema" :pointer="entry.row.pointer" @apply="applied(entry.row.pointer, $event)" @cancel="cancelEdit" />
                                </ff-data-table-cell>
                            </ff-data-table-row>
                            <ff-data-table-row v-else :data-el="`builder-row-${entry.row.path}`">
                                <ff-data-table-cell class="schema-builder__field-cell">
                                    <div class="schema-builder__field" :style="{ '--depth': entry.row.depth }">
                                        <span v-for="level in entry.row.depth" :key="level" class="schema-builder__guide" />
                                        <button v-if="entry.row.drillIn" class="schema-builder__toggle" :aria-label="`Open ${entry.row.name}`" data-action="builder-drill-in" @click="open(entry.row.pointer)">
                                            <ArrowRightCircleIcon class="ff-icon-sm" />
                                        </button>
                                        <button v-else-if="entry.row.children !== null" class="schema-builder__toggle" :aria-expanded="entry.row.expanded" :aria-label="`${entry.row.expanded ? 'Collapse' : 'Expand'} ${entry.row.name}`" data-action="builder-toggle" @click="toggle(entry.row.pointer)">
                                            <ChevronDownIcon v-if="entry.row.expanded" class="ff-icon-sm" />
                                            <ChevronRightIcon v-else class="ff-icon-sm" />
                                        </button>
                                        <span class="font-mono font-medium">{{ entry.row.name }}</span>
                                    </div>
                                </ff-data-table-cell>
                                <ff-data-table-cell class="font-mono schema-builder__muted">{{ entry.row.type }}</ff-data-table-cell>
                                <ff-data-table-cell :class="entry.row.required ? 'schema-builder__yes' : 'schema-builder__muted'">{{ entry.row.required ? 'Yes' : 'No' }}</ff-data-table-cell>
                                <ff-data-table-cell v-if="entry.row.problem" class="schema-builder__error" data-el="builder-row-problem">{{ entry.row.problem }}</ff-data-table-cell>
                                <ff-data-table-cell v-else class="schema-builder__muted" :class="{ 'font-mono': !entry.row.jsonOnly && entry.row.constraints !== 'None' }">{{ entry.row.constraints }}</ff-data-table-cell>
                                <ff-data-table-cell>
                                    <button v-if="entry.row.jsonOnly" class="schema-builder__link" data-action="builder-edit-in-json" @click="emit('edit-json')">Edit in JSON →</button>
                                    <span v-else>{{ entry.row.description }}</span>
                                </ff-data-table-cell>
                                <ff-data-table-cell v-if="!readOnly">
                                    <ff-kebab-menu v-if="!entry.row.jsonOnly && entry.row.pointer">
                                        <ff-kebab-item label="Edit" @click="editing = entry.row.pointer" />
                                    </ff-kebab-menu>
                                </ff-data-table-cell>
                            </ff-data-table-row>
                        </template>
                        <ff-data-table-row v-if="!readOnly && holdsFields">
                            <ff-data-table-cell :colspan="columns.length">
                                <ff-button kind="secondary" class="w-full" data-action="builder-add-root-field" @click="add(holderPointer)">
                                    <template #icon-left><PlusIcon /></template>
                                    Add field
                                </ff-button>
                            </ff-data-table-cell>
                        </ff-data-table-row>
                    </template>
                </ff-data-table>
            </div>
            <div v-if="holdsFields" class="schema-builder__other-fields" data-el="builder-other-fields">
                <p class="schema-builder__label">Fields not listed in the schema</p>
                <ff-checkbox v-if="!readOnly" :model-value="otherFieldsMode !== 'none'" data-action="builder-other-fields" @update:model-value="setOtherFields">Allow them (additionalProperties)</ff-checkbox>
                <p v-if="readOnly || otherFieldsMode === 'schema'">{{ OTHER_FIELDS_TEXT[otherFieldsMode] }}</p>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ArrowRightCircleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { computed, nextTick, ref, watch } from 'vue'

import FieldEditPanel from './FieldEditPanel.vue'
import { type FieldRow, type OtherFields, builderRows, fieldTrail, fieldsHolder, focusedHolder, otherFields, schemaAt } from './builder'
import { addField, removeField, setOtherFieldsAllowed } from './builderEdits'
import type { Schema } from './schemaTypes'

defineOptions({ name: 'SchemaBuilder' })

const props = defineProps<{ schema: Schema | null, readOnly: boolean }>()
const emit = defineEmits<{ 'edit-json': [], 'update:schemaText': [text: string] }>()

const columns = computed(() => [
    { label: 'Field', key: 'name', class: ['w-1/5'] },
    { label: 'Type', key: 'type', class: ['w-40'] },
    { label: 'Required', key: 'required', class: ['w-28'] },
    { label: 'Constraints', key: 'constraints' },
    { label: 'Description', key: 'description' },
    ...(props.readOnly ? [] : [{ label: '', key: 'actions', class: ['w-16'] }])
])

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
// The object the Add field button and the checkbox below the table work on
const holderPointer = computed(() => holder.value ? focus.value + holder.value.suffix : '')

// The pointer of the field whose edit panel is open, and of the one just added, which Cancel removes
const editing = ref<string | null>(null)
const added = ref<string | null>(null)

type RowEntry = { kind: 'field' | 'panel', key: string, row: FieldRow }
type AddEntry = { kind: 'add', key: string, holder: string, path: string, name: string, depth: number }
type Entry = RowEntry | AddEntry

// The field rows, with the edit panel under the field being edited and an add row closing each expanded object
const entries = computed<Entry[]>(() => {
    const list: Entry[] = []
    const parents: FieldRow[] = []
    const closeTo = (depth: number) => {
        while (parents.length && parents.at(-1)!.depth >= depth) {
            const parent = parents.pop()!
            if (props.readOnly) {
                continue
            }
            const inner = fieldsHolder(schemaAt(props.schema!, parent.pointer)!)
            list.push({ kind: 'add', key: `add:${parent.pointer}`, holder: parent.pointer + inner!.suffix, path: parent.path, name: parent.name, depth: parent.depth + 1 })
        }
    }
    for (const row of rows.value) {
        closeTo(row.depth)
        list.push({ kind: 'field', key: row.pointer, row })
        if (editing.value === row.pointer) {
            list.push({ kind: 'panel', key: `panel:${row.pointer}`, row })
        }
        if (row.expanded) {
            parents.push(row)
        }
    }
    closeTo(0)
    return list
})

const write = (root: Schema) => emit('update:schemaText', JSON.stringify(root, null, 2))

// A renamed field gets a new pointer, which the expanded fields under it follow
function applied (pointer: string, result: { root: Schema, pointer: string }) {
    expanded.value = new Set([...expanded.value].map(entry => entry === pointer || entry.startsWith(`${pointer}/`) ? result.pointer + entry.slice(pointer.length) : entry))
    editing.value = null
    added.value = null
    write(result.root)
}

function add (holderPointer: string) {
    const result = addField(props.schema!, holderPointer)
    write(result.root)
    editing.value = result.pointer
    added.value = result.pointer
}

function cancelEdit () {
    if (editing.value && editing.value === added.value) {
        write(removeField(props.schema!, editing.value))
    }
    editing.value = null
    added.value = null
}

function setOtherFields (allowed: boolean) {
    write(setOtherFieldsAllowed(props.schema!, holderPointer.value, allowed))
}
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

    &__panel-cell {
        padding: 0;
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
