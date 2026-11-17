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
            {{ selectedTable.dbSchema }}.{{ selectedTable.name }}
        </span>
        <TextCopier v-if="selectedTable" :text="qualifiedTableName" :show-text="false" />
        <div v-if="selectedTable" class="tools">
            <div class="show-original" data-el="show-original-values">
                <ff-toggle-switch size="small" :model-value="showOriginalValues" @update:model-value="setShowOriginalValues" />
                <span @click="setShowOriginalValues(!showOriginalValues)">Show original values</span>
            </div>
            <ff-popover :button-text="columnsLabel" button-kind="secondary" :disabled="columns.length === 0" data-el="visible-columns">
                <template #panel>
                    <section class="visible-columns" data-el="visible-columns-panel">
                        <ul>
                            <li v-for="column in columns" :key="column.name" :title="column.name">
                                <ff-checkbox
                                    :model-value="isVisible(column)" :label="column.name"
                                    :disabled="isLastVisible(column)" :data-column="column.name"
                                    @update:model-value="visible => setColumnVisible(column.name, visible)"
                                />
                            </li>
                        </ul>
                        <button
                            class="show-all" type="button" data-action="show-all-columns"
                            :disabled="hiddenCount === 0" @click="showAllColumns"
                        >
                            Show all
                        </button>
                    </section>
                </template>
            </ff-popover>
        </div>
    </section>
</template>

<script>
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { mapActions, mapState } from 'pinia'

import MenuCollapse from '../../.././../../../components/icons/menu-collapse.js'
import MenuExpand from '../../.././../../../components/icons/menu-expand.js'

import TextCopier from '@/components/TextCopier.vue'
import { useContextStore } from '@/stores/context.js'
import { useProductTablesStore } from '@/stores/product-tables.js'

export default {
    name: 'RowsHeader',
    components: { MenuCollapse, MenuExpand, ArrowPathIcon, TextCopier },
    props: {
        menuCollapsed: {
            type: Boolean,
            required: true
        }
    },
    emits: ['toggle-collapse'],
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useProductTablesStore, ['tableSelection', 'selectedTable', 'visibleColumns', 'showOriginalValues']),
        qualifiedTableName () {
            return `"${this.selectedTable.dbSchema}"."${this.selectedTable.name}"`
        },
        columns () {
            return this.selectedTable?.schema ?? []
        },
        hiddenCount () {
            return this.columns.length - this.visibleColumns.length
        },
        // says so when columns are hidden, so a hidden column is not taken for one the table does not have
        columnsLabel () {
            return this.hiddenCount > 0 ? `Columns (${this.visibleColumns.length} of ${this.columns.length})` : 'Columns'
        }
    },
    methods: {
        ...mapActions(useProductTablesStore, ['getTableData', 'setShowOriginalValues', 'setTableLoadingState', 'setColumnVisible', 'showAllColumns']),
        isVisible (column) {
            return this.visibleColumns.includes(column)
        },
        // the grid always keeps one column
        isLastVisible (column) {
            return this.visibleColumns.length === 1 && this.isVisible(column)
        },
        refreshTable () {
            this.setTableLoadingState(true)
            return this.getTableData({
                teamId: this.team.id,
                databaseId: this.$route.params.id,
                tableName: this.tableSelection?.name,
                schemaName: this.tableSelection?.dbSchema
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
    }

    .tools {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-left: auto;
        white-space: nowrap;
    }

    .show-original {
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        color: var(--ff-color-text-muted);
        cursor: pointer;
    }
}

// the panel is moved to the end of the page, so it does not sit inside .rows-header
.visible-columns {
    width: 260px;

    // a long column name is cut short, and shown in full on hover
    li, .ff-checkbox {
        min-width: 0;
    }

    :deep(.ff-checkbox label) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    ul {
        max-height: 50vh;
        overflow-y: auto;
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .show-all {
        width: 100%;
        padding: 8px 12px;
        text-align: left;
        border-top: 1px solid var(--ff-color-border);
        color: var(--ff-color-focus);

        &:disabled {
            color: var(--ff-color-text-disabled);
            cursor: default;
        }
    }
}
</style>
