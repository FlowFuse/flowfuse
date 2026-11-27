<template>
    <div class="flex flex-col gap-4" data-el="schema-builder">
        <div v-if="!schema" class="ff-page-banner schema-builder__banner" data-el="builder-blocked">
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
            <div v-if="!focus && notes.length" class="ff-page-banner schema-builder__banner" data-el="builder-root-notes">
                <div>
                    <p v-for="note in notes" :key="note">{{ note }}</p>
                </div>
                <ff-button kind="secondary" size="small" data-action="builder-root-to-json" @click="emit('edit-json')">Edit in JSON</ff-button>
            </div>
            <div ref="fieldsRegion" class="schema-builder__fields flex min-h-0 flex-col" tabindex="-1" :aria-label="regionLabel" data-el="builder-fields-region">
                <ff-data-table class="schema-builder__table min-h-0" :columns="columns" data-el="builder-fields">
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
                                <ff-data-table-cell class="p-0!" :colspan="columns.length">
                                    <FieldEditPanel :root="schema" :pointer="entry.row.pointer" @apply="applied(entry.row.pointer, $event)" @cancel="cancelEdit" />
                                </ff-data-table-cell>
                            </ff-data-table-row>
                            <ff-data-table-row v-else-if="entry.row.deleted" :data-el="`builder-row-${entry.row.path}`" data-deleted="true">
                                <ff-data-table-cell v-if="!readOnly" />
                                <ff-data-table-cell>
                                    <div class="schema-builder__field">
                                        <span v-for="level in entry.row.depth" :key="level" class="schema-builder__guide" />
                                        <span class="font-mono line-through">{{ entry.row.name }}</span>
                                        <DiffTypeBadge type="deleted" />
                                    </div>
                                </ff-data-table-cell>
                                <ff-data-table-cell class="font-mono schema-builder__muted">{{ entry.row.type }}</ff-data-table-cell>
                                <ff-data-table-cell class="schema-builder__muted">{{ entry.row.required ? 'Yes' : 'No' }}</ff-data-table-cell>
                                <ff-data-table-cell class="schema-builder__muted">
                                    In {{ publishedVersion }}, deleted in this draft
                                    <button v-if="!readOnly" class="schema-builder__link ml-2" data-action="builder-restore" @click="restore(entry.row.pointer)">Restore</button>
                                </ff-data-table-cell>
                                <ff-data-table-cell class="schema-builder__muted">{{ entry.row.description }}</ff-data-table-cell>
                                <ff-data-table-cell v-if="!readOnly" />
                            </ff-data-table-row>
                            <ff-data-table-row v-else :data-el="`builder-row-${entry.row.path}`" v-bind="reorderRow(entry)">
                                <ff-data-table-cell v-if="!readOnly" class="schema-builder__drag-cell">
                                    <ff-drag-handle v-if="entry.row.pointer" data-action="builder-drag" v-bind="reorder.handle(entry.holder, entry.index)" />
                                </ff-data-table-cell>
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
                                        <!-- takes the room a toggle would, so the names of a level line up -->
                                        <span v-else class="ff-icon-sm shrink-0" aria-hidden="true" />
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
                                    <ff-kebab-menu v-if="entry.row.pointer">
                                        <ff-kebab-item v-if="!entry.row.jsonOnly" label="Edit" @click="edit(entry.row.pointer)" />
                                        <ff-kebab-item label="Move up" :disabled="entry.first" @click="move(entry.row.pointer, -1)" />
                                        <ff-kebab-item label="Move down" :disabled="entry.last" @click="move(entry.row.pointer, 1)" />
                                        <ff-kebab-item label="Delete field" kind="danger" @click="remove(entry.row)" />
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
import { computed, nextTick, onDeactivated, ref, watch } from 'vue'

import FieldEditPanel from './FieldEditPanel.vue'
import { type FieldRow, type OtherFields, builderRows, fieldTrail, fieldsHolder, focusedHolder, otherFields, propertiesOf, rootNotes, schemaAt } from './builder'
import { addField, deleteField, moveField, moveFieldTo, nestedPaths, removeField, restoreField, setOtherFieldsAllowed, splitPointer } from './builderEdits'
import { pointerFor } from './pointer'
import type { Schema } from './schemaTypes'

import DiffTypeBadge from '@/components/diff/DiffTypeBadge.vue'
import { useDragReorder } from '@/composables/DragReorder.js'
import Dialog from '@/services/dialog.js'

defineOptions({ name: 'SchemaBuilder' })

const props = defineProps<{ schema: Schema | null, readOnly: boolean, published?: Schema | null, publishedVersion?: string }>()
const emit = defineEmits<{ 'edit-json': [], 'update:schemaText': [text: string] }>()

const columns = computed(() => [
    ...(props.readOnly ? [] : [{ label: '', key: 'drag', class: ['w-8'] }]),
    // the names start after the chevron's slot and the gap next to it, so the heading does too
    { label: 'Field', key: 'name', class: ['w-1/5'], tableLabelClass: 'pl-5.5' },
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
const notes = computed(() => props.schema ? rootNotes(props.schema) : [])
const regionLabel = computed(() => trail.value.length ? `Fields of ${trail.value.at(-1)?.name}` : 'Fields')
const rows = computed(() => props.schema ? builderRows(props.schema, expanded.value, props.published, focus.value) : [])
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

type RowEntry = { kind: 'field' | 'panel', key: string, row: FieldRow, holder?: string, index?: number, first?: boolean, last?: boolean }
type AddEntry = { kind: 'add', key: string, holder: string, path: string, name: string, depth: number }
type Entry = RowEntry | AddEntry

// The field rows, with the edit panel under the field being edited and an add row closing each expanded object
const entries = computed<Entry[]>(() => {
    const list: Entry[] = []
    const parents: FieldRow[] = []
    const namesByHolder = new Map<string, string[]>()
    const namesOf = (holderPointer: string) => {
        if (!namesByHolder.has(holderPointer)) {
            namesByHolder.set(holderPointer, Object.keys(propertiesOf(schemaAt(props.schema!, holderPointer)!)))
        }
        return namesByHolder.get(holderPointer)!
    }
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
        const names = row.pointer ? namesOf(splitPointer(row.pointer).holder) : []
        const name = row.pointer ? splitPointer(row.pointer).name : ''
        const holder = row.pointer ? splitPointer(row.pointer).holder : ''
        list.push({ kind: 'field', key: row.pointer, row, holder, index: names.indexOf(name), first: names[0] === name, last: names.at(-1) === name })
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
    const pending = editing.value && editing.value === added.value ? editing.value : null
    const result = addField(pending ? removeField(props.schema!, pending) : props.schema!, holderPointer)
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

function restore (pointer: string) {
    write(restoreField(props.schema!, props.published!, pointer))
}

function move (pointer: string, offset: -1 | 1) {
    write(moveField(props.schema!, pointer, offset))
}

// Dragging reorders the fields of one object, which is the group a row is dragged within
const reorder = useDragReorder({
    onMove ({ group, from, to }) {
        const name = Object.keys(propertiesOf(schemaAt(props.schema!, group)!))[from]
        write(moveFieldTo(props.schema!, pointerFor(group, name), to))
    }
})

function reorderRow (entry: RowEntry) {
    if (props.readOnly || !entry.row.pointer) {
        return {}
    }
    return reorder.row(entry.holder!, entry.index!)
}

const NESTED_SHOWN = 10

async function remove (row: FieldRow) {
    const nested = nestedPaths(props.schema!, row.pointer, row.path)
    if (nested.length) {
        const holderName = fieldTrail(splitPointer(row.pointer).holder).at(-1)?.name ?? 'the root object'
        const hidden = nested.length - NESTED_SHOWN
        const result = await Dialog.showAsync({
            header: `Delete ${row.name}?`,
            text: [
                `This removes ${row.name} and the ${nested.length} ${nested.length === 1 ? 'field' : 'fields'} inside it from the draft:`,
                '',
                ...nested.slice(0, NESTED_SHOWN),
                ...(hidden > 0 ? [`and ${hidden} more`] : []),
                ...(row.required ? ['', `${row.name} is also removed from the required list of ${holderName}.`] : [])
            ].join('\n'),
            confirmLabel: `Delete ${row.name}`,
            kind: 'danger'
        })
        if (result !== 'confirm') {
            return
        }
    }
    if (editing.value === row.pointer || editing.value?.startsWith(`${row.pointer}/`)) {
        editing.value = null
    }
    write(deleteField(props.schema!, row.pointer))
}

function edit (pointer: string) {
    if (pointer !== editing.value) {
        cancelEdit()
    }
    editing.value = pointer
}

// The table scrolls inside its box, where a panel may open below what is in view. Its buttons are brought into view,
// and the row of the field it edits too when the box has room for both.
watch(editing, async (pointer) => {
    await nextTick()
    const panel = fieldsRegion.value?.querySelector<HTMLElement>('[data-el="field-panel"]')
    if (!pointer || !panel?.scrollIntoView) {
        return
    }
    panel.scrollIntoView({ block: 'nearest' })
    const box = panel.closest<HTMLElement>('.overflow-auto')
    const row = panel.closest('tr')?.previousElementSibling as HTMLElement | null
    const head = box?.querySelector('thead')
    if (!box || !row || !head) {
        return
    }
    const top = row.offsetTop - head.offsetHeight
    if (box.scrollTop > top && head.offsetHeight + row.offsetHeight + panel.offsetHeight <= box.clientHeight) {
        box.scrollTop = top
    }
})

// The builder is kept while the JSON is on screen. A panel left open would come back holding what the field
// was before the JSON was changed, so it is closed as cancelled.
onDeactivated(cancelEdit)

function setOtherFields (allowed: boolean) {
    write(setOtherFieldsAllowed(props.schema!, holderPointer.value, allowed))
}
</script>

<style scoped lang="scss">
.schema-builder {
    // the platform's banner, with its text on the left and its button on the right
    &__banner {
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 1rem;

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

    &__drag-cell {
        padding-right: 0;
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

    &__table {
        border-bottom: 1px solid var(--ff-color-border-strong);
        border-radius: 0 0 6px 6px;

        :deep(tbody tr:last-of-type td) {
            border-bottom: none;
        }

        // Where there is no room for its columns the table scrolls sideways inside its box. The edit panel keeps to
        // the width of the box and stays put, so all of it can be reached without that scroll.
        & > :deep(.overflow-auto) {
            container-type: inline-size;
        }

        :deep(.field-panel) {
            position: sticky;
            left: 0;
            width: 100cqi;
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
