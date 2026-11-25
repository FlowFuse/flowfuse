<template>
    <ff-data-table-row class="schema-row" :data-el="`schema-row-${schema.id}`">
        <ff-data-table-cell class="schema-row__main">
            <div class="schema-row__in-group">
                <router-link class="schema-row__name" :to="{ name: 'team-schema', params: { schemaId: schema.id } }">{{ schema.name }}</router-link>
                <p v-if="schema.description" class="schema-row__description truncate" :title="schema.description">{{ schema.description }}</p>
            </div>
        </ff-data-table-cell>
        <ff-data-table-cell data-el="schema-latest-version">
            <span v-if="schema.latestVersion" class="font-mono">{{ schema.latestVersion }}</span>
            <span v-else class="schema-row__none">Not published</span>
        </ff-data-table-cell>
        <ff-data-table-cell data-el="schema-draft">
            <StatusBadge v-if="schema.hasDraft" status="info" text="Draft" />
            <span v-else class="schema-row__none">None</span>
        </ff-data-table-cell>
        <ff-data-table-cell data-el="schema-updated">{{ daysSince(schema.updatedAt, true) }}</ff-data-table-cell>
    </ff-data-table-row>
</template>

<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'
import type { DataSchemaSummary } from '@/types'

import daysSince from '@/utils/daysSince'

defineOptions({ name: 'SchemaRow' })

defineProps<{
    schema: DataSchemaSummary
}>()
</script>

<style scoped lang="scss">
.schema-row {
    // lets the cell shrink below its content, so a long description is cut short and the other columns keep their place
    &__main {
        max-width: 0;
    }

    &__name {
        font-weight: 500;
        color: var(--ff-color-link);

        &:hover {
            text-decoration: underline;
        }
    }

    &__description {
        margin: 0.125rem 0 0;
        font-size: 0.875rem;
        color: var(--ff-color-text-subtle);
        cursor: default;
    }

    // lines the name up with its group's name, past the chevron
    &__in-group {
        padding-left: 1.75rem;
    }

    &__none {
        color: var(--ff-color-text-subtle);
    }
}
</style>
