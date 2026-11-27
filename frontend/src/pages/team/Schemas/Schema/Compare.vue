<template>
    <!-- fills the page and no more: the changes and the JSON share its height and each scrolls within itself -->
    <div class="flex min-h-0 flex-1 flex-col gap-6" data-el="schema-compare">
        <TabToolbar>
            <BackToVersions />
            <p v-if="!pair" class="schema-compare__empty" data-el="schema-compare-unavailable">A schema needs two versions before they can be compared.</p>
            <p v-else class="schema-compare__summary" data-el="schema-compare-summary">{{ summary }}</p>
            <template v-if="pair" #tools>
                <span class="schema-compare__label">From</span>
                <ff-listbox :model-value="pair.from" :options="fromOptions" aria-label="From version" data-el="compare-from" @update:model-value="pick({ from: $event })" />
                <ArrowRightIcon class="ff-icon-sm schema-compare__arrow" />
                <span class="schema-compare__label">To</span>
                <ff-listbox :model-value="pair.to" :options="toOptions" aria-label="To version" data-el="compare-to" @update:model-value="pick({ to: $event })" />
            </template>
        </TabToolbar>
        <template v-if="pair">
            <!-- the two sections share what the toolbar leaves of the height -->
            <div v-if="comparison" class="flex min-h-0 flex-1 flex-col gap-6">
                <!-- with the JSON open below, the changes take up to half of the height and the JSON has the rest -->
                <section v-if="comparison.changes.length" class="flex min-h-0 flex-col gap-2" :class="changesClass" data-el="schema-changes-section">
                    <button class="flex items-center gap-1 self-start font-medium" type="button" :aria-expanded="changesOpen" data-action="toggle-changes" @click="changesOpen = !changesOpen">
                        <ChevronRightIcon class="ff-icon ff-icon-sm transition-transform" :class="{ 'rotate-90': changesOpen }" />
                        Changes
                    </button>
                    <ff-data-table v-show="changesOpen" class="schema-compare__changes min-h-0" :columns="columns" data-el="schema-changes">
                        <template #rows>
                            <ff-data-table-row v-for="change in visibleChanges" :key="change.path" data-el="schema-change">
                                <ff-data-table-cell class="font-mono" data-el="change-path" :title="change.path">{{ fieldPath(change.path) }}</ff-data-table-cell>
                                <ff-data-table-cell data-el="change-type"><DiffTypeBadge :type="change.type" /></ff-data-table-cell>
                                <ff-data-table-cell class="schema-compare__detail-cell" data-el="change-detail">
                                    <div class="schema-compare__detail">
                                        <DiffValuePill v-if="change.type !== 'added'" kind="removed" :text="formatValue(change.detail.from)" />
                                        <span v-if="change.type === 'changed'" class="schema-compare__arrow">→</span>
                                        <DiffValuePill v-if="change.type !== 'deleted'" kind="added" :text="formatValue(change.detail.to)" />
                                    </div>
                                </ff-data-table-cell>
                            </ff-data-table-row>
                            <!-- more changes are drawn when this comes into view -->
                            <ff-data-table-row v-if="comparison.changes.length > shownChanges">
                                <ff-data-table-cell :colspan="columns.length"><span ref="moreChanges" /></ff-data-table-cell>
                            </ff-data-table-row>
                        </template>
                    </ff-data-table>
                </section>
                <p v-else class="schema-compare__empty" data-el="schema-compare-same">These two versions are the same.</p>
                <div class="schema-compare__json flex min-h-0 flex-col" :class="{ 'shrink-0': jsonCollapsed }" data-el="schema-compare-json">
                    <SnapshotDiffChangePanel heading="JSON" structured :label="schema?.name" :value1="documents.from" :value2="documents.to" @update:collapsed="jsonCollapsed = $event" />
                </div>
            </div>
            <p v-else-if="failed" class="schema-compare__empty" data-el="schema-compare-failed">The versions could not be compared.</p>
            <ff-loading v-else message="Comparing versions..." />
        </template>
    </div>
</template>

<script setup lang="ts">
import { ArrowRightIcon } from '@heroicons/vue/20/solid'
import { ChevronRightIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryValue } from 'vue-router'

import BackToVersions from './components/BackToVersions.vue'
import TabToolbar from './components/TabToolbar.vue'
import { defaultPair, fieldPath, formatValue, withoutId } from './components/compare'

import SnapshotDiffChangePanel from '@/components/dialogs/SnapshotDiffChangePanel.vue'
import DiffTypeBadge from '@/components/diff/DiffTypeBadge.vue'
import DiffValuePill from '@/components/diff/DiffValuePill.vue'
import { useRevealMore } from '@/composables/RevealMore'
import Alerts from '@/services/alerts.js'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'
import type { SchemaComparison } from '@/stores/data-farm-schemas'

// the schema page hands every tab the editor's state for the draft, which this one has no use for
defineOptions({ name: 'SchemaCompare', inheritAttrs: false })

const route = useRoute()
const router = useRouter()
const schemasStore = useDataFarmSchemasStore()
const { activeSchema: schema } = storeToRefs(schemasStore)

const columns = [
    { label: 'Path', key: 'path', class: ['w-1/4'] },
    { label: 'Change', key: 'type', class: ['w-32'] },
    { label: 'Detail', key: 'detail' }
]

const versions = computed(() => schema.value?.versions ?? [])
const toOptions = computed(() => versions.value.map(entry => entry.status === 'draft'
    ? { value: 'draft', label: 'Draft' }
    : { value: entry.version, label: entry.status === 'deprecated' ? `${entry.version} (deprecated)` : entry.version }))
const fromOptions = computed(() => toOptions.value.filter(option => option.value !== 'draft'))

// A query value repeated in the address is an array
const queryValue = (value: LocationQueryValue | LocationQueryValue[]) => (Array.isArray(value) ? value[0] : value) ?? undefined

const pair = computed(() => defaultPair(versions.value, queryValue(route.query.from), queryValue(route.query.to)))

function pick (change: { from?: string, to?: string }) {
    router.replace({ query: { ...pair.value, ...change } })
}

const changesOpen = ref(true)
const jsonCollapsed = ref(false)
// A collapsed section keeps its heading. Open, the changes take what they need, up to half the height while the JSON is open too.
const changesClass = computed(() => {
    if (!changesOpen.value) return 'shrink-0'
    return jsonCollapsed.value ? '' : 'max-h-1/2 shrink-0'
})

// a comparison can have hundreds of changes
const { shown: shownChanges, sentinel: moreChanges, reset: resetShownChanges } = useRevealMore(100)
const visibleChanges = computed(() => comparison.value?.changes.slice(0, shownChanges.value) ?? [])

// A comparison is only ever replaced as a whole, and its documents can be thousands of lines,
// so nothing inside it is watched
const comparison = shallowRef<SchemaComparison | null>(null)
// the two documents as the JSON section compares them, worked out once for each comparison
const documents = computed(() => comparison.value
    ? { from: withoutId(comparison.value.from), to: withoutId(comparison.value.to) }
    : { from: {}, to: {} })
const failed = ref(false)

watch([() => schema.value?.id, () => pair.value?.from, () => pair.value?.to], async ([schemaId, from, to], _, onCleanup) => {
    let stale = false
    onCleanup(() => {
        stale = true
    })
    comparison.value = null
    failed.value = false
    resetShownChanges()
    if (!schemaId || !from || !to) return
    try {
        const loaded = await schemasStore.fetchComparison(from, to)
        if (!stale) comparison.value = loaded
    } catch (err) {
        if (stale) return
        failed.value = true
        Alerts.emit(err.response?.data?.error || 'Failed to compare the versions.', 'warning')
    }
}, { immediate: true })

// the draft compared is the one on the server, not what may be unsaved in the editor
const label = (key: string) => key === 'draft' ? 'the last saved draft' : key
const summary = computed(() => {
    if (!comparison.value || !pair.value) return ''
    const count = comparison.value.changes.length
    return `${count} ${count === 1 ? 'change' : 'changes'} from ${label(pair.value.from)} to ${label(pair.value.to)}`
})
</script>

<style scoped lang="scss">
.schema-compare {
    &__summary,
    &__empty {
        margin: 0;
        color: var(--ff-color-text);
    }

    &__label {
        color: var(--ff-color-text-subtle);
    }

    &__arrow {
        color: var(--ff-color-text-subtle);
    }

    // The table scrolls inside its box, so its bottom edge belongs to the box: drawn by the last row,
    // as the table does by default, it would only show once scrolled to the end.
    &__changes {
        border-bottom: 1px solid var(--ff-color-border-strong);
        border-radius: 0 0 6px 6px;

        :deep(tbody tr:last-of-type td) {
            border-bottom: none;
        }
    }

    // lets the cell shrink below its content, so a long value is cut short instead of widening the table
    &__detail-cell {
        max-width: 0;
    }

    &__detail {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 0;

        & > :deep(span) {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }

    &__json {
        border: 1px solid var(--ff-color-border);
        border-radius: 0.625rem;
        overflow: hidden;
    }
}
</style>
