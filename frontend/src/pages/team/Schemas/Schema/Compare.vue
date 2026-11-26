<template>
    <div class="flex flex-col gap-6" data-el="schema-compare">
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
            <template v-if="comparison">
                <ff-data-table v-if="comparison.changes.length" :columns="columns" data-el="schema-changes">
                    <template #rows>
                        <ff-data-table-row v-for="change in comparison.changes" :key="change.path" data-el="schema-change">
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
                    </template>
                </ff-data-table>
                <p v-else class="schema-compare__empty" data-el="schema-compare-same">These two versions are the same.</p>
                <div class="schema-compare__json" data-el="schema-compare-json">
                    <SnapshotDiffChangePanel heading="JSON" :prettifiable="false" :label="schema?.name" :value1="diffText(comparison.from)" :value2="diffText(comparison.to)" />
                </div>
            </template>
            <p v-else-if="failed" class="schema-compare__empty" data-el="schema-compare-failed">The versions could not be compared.</p>
            <ff-loading v-else message="Comparing versions..." />
        </template>
    </div>
</template>

<script setup lang="ts">
import { ArrowRightIcon } from '@heroicons/vue/20/solid'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryValue } from 'vue-router'

import BackToVersions from './components/BackToVersions.vue'
import TabToolbar from './components/TabToolbar.vue'
import { defaultPair, diffText, fieldPath, formatValue } from './components/compare'

import SnapshotDiffChangePanel from '@/components/dialogs/SnapshotDiffChangePanel.vue'
import DiffTypeBadge from '@/components/diff/DiffTypeBadge.vue'
import DiffValuePill from '@/components/diff/DiffValuePill.vue'
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

const comparison = ref<SchemaComparison | null>(null)
const failed = ref(false)

watch([() => schema.value?.id, () => pair.value?.from, () => pair.value?.to], async ([schemaId, from, to], _, onCleanup) => {
    let stale = false
    onCleanup(() => {
        stale = true
    })
    comparison.value = null
    failed.value = false
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
