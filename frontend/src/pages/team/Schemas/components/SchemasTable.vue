<template>
    <ff-data-table :columns="columns" data-el="schemas-table">
        <template #rows>
            <ff-data-table-row v-if="query && sections.length === 0">
                <ff-data-table-cell class="status-message" :colspan="columns.length" data-el="schemas-no-results">
                    No schemas or groups match "{{ query }}"
                </ff-data-table-cell>
            </ff-data-table-row>
            <template v-for="section in sections" :key="section.id">
                <ff-data-table-row class="schema-group" :data-el="`schema-group-${section.id}`">
                    <ff-data-table-cell :colspan="columns.length">
                        <button class="schema-group__toggle" type="button" :aria-expanded="!collapsed.has(section.id)" data-action="toggle-group" @click="toggle(section.id)">
                            <ChevronRightIcon class="ff-icon ff-icon-sm transition-transform" :class="{ 'rotate-90': !collapsed.has(section.id) }" />
                            <span class="schema-group__name">{{ section.name }}</span>
                            <span class="schema-group__count">{{ pluralize('schema', section.page.count) }}</span>
                        </button>
                    </ff-data-table-cell>
                </ff-data-table-row>
                <template v-if="!collapsed.has(section.id)">
                    <SchemaRow v-for="schema in section.page.schemas" :key="schema.id" :schema="schema" />
                    <ff-data-table-row v-if="section.page.nextCursor">
                        <ff-data-table-cell :colspan="columns.length">
                            <ff-button kind="tertiary" size="small" data-action="load-more" @click="emit('load-more', section.id)">Load more</ff-button>
                        </ff-data-table-cell>
                    </ff-data-table-row>
                </template>
            </template>
        </template>
    </ff-data-table>
</template>

<script setup lang="ts">
import { ChevronRightIcon } from '@heroicons/vue/24/outline'
import { computed, ref, watch } from 'vue'

import SchemaRow from './SchemaRow.vue'

import { type SchemaListPage, UNGROUPED, groupMatches } from '@/stores/data-farm-schemas'
import type { DataSchemaGroup } from '@/types'

defineOptions({ name: 'SchemasTable' })

const props = defineProps<{
    groups: DataSchemaGroup[]
    groupSchemas: Record<string, SchemaListPage>
    query: string
}>()

const emit = defineEmits<{
    'load-more': [groupId: string]
}>()

const columns = [
    { label: 'Name', key: 'name' },
    { label: 'Latest version', key: 'latestVersion', class: ['w-44'] },
    { label: 'Draft', key: 'hasDraft', class: ['w-32'] },
    { label: 'Updated', key: 'updatedAt', class: ['w-40'] }
]

// One section per group, then the schemas in no group, which only get a section when there are any.
// A search keeps the groups that match it by name or hold a schema that does.
const sections = computed(() => {
    const ungrouped = props.groupSchemas[UNGROUPED]
    return [
        ...props.groups
            .filter(group => !props.query || groupMatches(group, props.query) || props.groupSchemas[group.id]?.count)
            .map(group => ({ id: group.id, name: group.name, page: props.groupSchemas[group.id] })),
        ...(ungrouped?.count ? [{ id: UNGROUPED, name: 'Ungrouped', page: ungrouped }] : [])
    ].filter(section => section.page)
})

const collapsed = ref(new Set<string>())
function toggle (id: string) {
    if (!collapsed.value.delete(id)) collapsed.value.add(id)
}
// a closed group would hide what a search found in it
watch(() => props.query, () => collapsed.value.clear())

const pluralize = (noun: string, count: number) => `${count} ${noun}${count === 1 ? '' : 's'}`
</script>

<style scoped lang="scss">
.schema-group {
    :deep(td) {
        background: var(--ff-color-bg-surface);
    }

    &__toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        text-align: left;
    }

    &__name {
        font-weight: 600;
    }

    &__count {
        font-size: 0.875rem;
        color: var(--ff-color-text-subtle);
    }
}
</style>
