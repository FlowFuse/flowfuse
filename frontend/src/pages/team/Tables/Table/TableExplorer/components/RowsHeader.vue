<template>
    <section class="rows-header flex gap-2">
        <button class="toggle-collapse" type="button" @click="$emit('toggle-collapse')">
            <MenuExpand v-if="menuCollapsed" />
            <MenuCollapse v-else />
        </button>
        <button
            class="refresh-table" type="button" title="Refresh table data"
            :disabled="!tableSelection"
            @click="refreshTable"
        >
            <ArrowPathIcon class="ff-icon ff-icon-md" aria-hidden="true" />
        </button>
        <span v-if="selectedTable" class="table-title truncate">
            {{ selectedTable.name }}
            <span class="schema-label">{{ selectedTable.dbSchema }}</span>
        </span>
    </section>
</template>

<script>
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { mapActions, mapState } from 'pinia'

import MenuCollapse from '../../.././../../../components/icons/menu-collapse.js'
import MenuExpand from '../../.././../../../components/icons/menu-expand.js'

import { useContextStore } from '@/stores/context.js'
import { useProductTablesStore } from '@/stores/product-tables.js'

export default {
    name: 'RowsHeader',
    components: { MenuCollapse, MenuExpand, ArrowPathIcon },
    props: {
        menuCollapsed: {
            type: Boolean,
            required: true
        }
    },
    emits: ['toggle-collapse'],
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useProductTablesStore, ['tableSelection', 'selectedTable'])
    },
    methods: {
        ...mapActions(useProductTablesStore, ['getTableData', 'setTableLoadingState']),
        refreshTable () {
            this.setTableLoadingState(true)
            return this.getTableData({
                teamId: this.team.id,
                databaseId: this.$route.params.id,
                tableName: this.tableSelection
            }).finally(() => this.setTableLoadingState(false))
        }
    }
}
</script>

<style scoped lang="scss">
.rows-header {
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--ff-color-border);
    align-items: center;

    .toggle-collapse, .refresh-table {
        border: 1px solid transparent;
    }

    .table-title {
        font-weight: bold;
        color: var(--ff-color-text-deep);

        .schema-label {
            font-weight: normal;
            font-size: 0.75rem;
            color: var(--ff-color-text-subtle);
        }
    }
}
</style>
