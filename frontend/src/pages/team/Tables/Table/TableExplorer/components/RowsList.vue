<template>
    <section id="rows-list" data-el="rows-list">
        <EmptyState v-if="hasNoTables" class="no-tables" data-el="no-tables">
            <template #img>
                <img alt="No tables" src="../../../../../../images/empty-states/team-tables.png">
            </template>
            <template #header>No tables yet</template>
            <template #message>
                <p v-if="canManageTables">Create your first table and its rows will show up here, ready to browse.</p>
                <p v-else>Once a team owner creates a table, its rows will show up here, ready to browse.</p>
            </template>
            <template v-if="canManageTables" #actions>
                <ff-button data-action="create-table" @click="onCreateTable">
                    <template #icon-left><PlusIcon /></template>
                    Create Table
                </ff-button>
            </template>
        </EmptyState>

        <div v-else-if="!selectedTable" class="no-content w-full h-full" />

        <div
            v-else-if="selectedTable && selectedTable.schema" class="content h-full" data-el="rows-grid"
            :tabindex="grid.tabStop === null ? 0 : -1"
            @focus.self="onGridFocus" @keydown="onGridKeydown"
        >
            <p v-if="pagination.totalCapped" class="too-big" data-el="table-too-big">
                <InformationCircleIcon class="ff-icon ff-icon-sm" aria-hidden="true" />
                This table is too big to show in full, so only its first {{ pagination.total.toLocaleString() }} rows are listed here.
                {{ sortKey ? `It can only be sorted by ${sortKey}.` : 'It cannot be sorted.' }}
            </p>
            <!-- made again for each table, so the sort shown in its header never outlives the table it was for -->
            <ff-data-table
                :key="`${selectedTable.dbSchema}.${selectedTable.name}.${sortResets}`"
                :loading="isLoading" loading-type="skeleton"
                :columns="columns" :rows="rows"
                :pagination="pagination"
                server-side-sort
                class="rows-table"
                tableClass="table-auto"
                @update:sort="onSortChange"
                @update:page="onPageChange"
                @update:page-size="onPageSizeChange"
            />
        </div>

        <ff-loading v-else-if="isLoading" message="Loading Table..." data-el="table-loading" />

        <div v-else class="no-content w-full h-full flex justify-center items-center text-gray-400">
            <p>There doesn't seem to be anything here!</p>
        </div>
    </section>
</template>

<script>
import { InformationCircleIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { mapActions, mapState } from 'pinia'
import { defineComponent, markRaw } from 'vue'

import CreateTable from '../drawers/CreateTable.vue'

import TableCell from './TableCell.vue'

import EmptyState from '@/components/EmptyState.vue'

import usePermissions from '@/composables/Permissions.js'
import { escapeHtml } from '@/composables/strings/String.js'
import Alerts from '@/services/alerts.js'
import { useContextStore } from '@/stores/context.js'
import { useProductTablesStore } from '@/stores/product-tables.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'
import { getColumnTypeLabel, isColumnTypeSortable } from '@/utils/tables/columnTypes.ts'

export default defineComponent({
    name: 'RowsList',
    components: { EmptyState, InformationCircleIcon, PlusIcon },
    provide () {
        return { grid: this.grid }
    },
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
    },
    data () {
        return {
            // the grid is one stop for the Tab key: the cell that last had focus, which the arrow keys move.
            // Until a cell has had focus the grid itself is the stop, and hands focus on to its first cell
            grid: { tabStop: null }
        }
    },
    computed: {
        ...mapState(useProductTablesStore, ['tables', 'tableSelection', 'isLoading', 'selectedTable', 'page', 'pageSize', 'showOriginalValues']),
        ...mapState(useContextStore, ['team']),
        canManageTables () {
            return this.hasPermission('team:database:create')
        },
        columns () {
            return (this.selectedTable?.schema ?? []).map((row) => {
                return {
                    key: row.safeName,
                    sortable: isColumnTypeSortable(row.type) && (!this.pagination.totalCapped || row.name === this.sortKey),
                    html: `<span class="column-name">${escapeHtml(row.name)}</span><span class="column-type" title="${escapeHtml(row.type)}">${escapeHtml(getColumnTypeLabel(row.type))}</span>`,
                    component: {
                        is: markRaw(TableCell),
                        extraProps: { name: row.name, type: row.type, showOriginal: this.showOriginalValues },
                        bind: { value: row.safeName }
                    },
                    tableCellClass: 'truncate',
                    tableLabelClass: 'truncate',
                    headerClass: 'sticky top-0'
                }
            })
        },
        // the one column a table too big to count can be sorted by: the first of its primary key, which has an index
        sortKey () {
            return this.selectedTable?.payload?.primaryKey?.[0]
        },
        // only once the tables have been loaded, so the empty state does not flash while they are
        hasNoTables () {
            return this.tables[this.$route.params.id]?.length === 0
        },
        rows () {
            return (this.selectedTable?.payload?.safe ?? [])
        },
        pagination () {
            return {
                page: this.page,
                pageSize: this.pageSize,
                total: this.selectedTable?.payload?.total ?? 0,
                totalCapped: this.selectedTable?.payload?.totalCapped ?? false
            }
        }
    },
    watch: {
        tableSelection (table) {
            if (!table) {
                this.setTableLoadingState(false)
                return
            }
            this.setTableLoadingState(true)
            this.getTableSchema({
                teamId: this.team.id,
                databaseId: this.$route.params.id,
                tableName: table.name,
                schemaName: table.dbSchema
            })
                .then(() => this.getTableData({
                    teamId: this.team.id,
                    databaseId: this.$route.params.id,
                    tableName: table.name,
                    schemaName: table.dbSchema
                }))
                .catch(e => e)
                .finally(() => {
                    // a table picked in the meantime is still loading, so leave the state to it
                    if (this.tableSelection === table) this.setTableLoadingState(false)
                })
        }
    },
    beforeUnmount () {
        this.setShowOriginalValues(false)
        this.updateTableSelection(null)
    },
    methods: {
        ...mapActions(useProductTablesStore, ['getTableSchema', 'getTableData', 'updateTableSelection', 'setPage', 'setPageSize', 'setSort', 'setShowOriginalValues', 'setTableLoadingState']),
        ...mapActions(useUxDrawersStore, ['openRightDrawer']),
        onCreateTable () {
            this.openRightDrawer({
                component: markRaw(CreateTable),
                wider: true,
                overlay: true
            })
        },
        onGridFocus (event) {
            // only when the keyboard brought focus here: a click on the scrollbar should not jump to the first cell
            if (event.target.matches(':focus-visible')) {
                this.$el.querySelector('tbody [data-el="table-cell"]')?.focus()
            }
        },
        onGridKeydown (event) {
            if (!event.target.matches('[data-el="table-cell"]')) return
            const cell = event.target.closest('td')
            const row = cell.parentElement
            const column = [...row.children].indexOf(cell)
            const moves = {
                ArrowLeft: () => cell.previousElementSibling,
                ArrowRight: () => cell.nextElementSibling,
                ArrowUp: () => row.previousElementSibling?.children[column],
                ArrowDown: () => row.nextElementSibling?.children[column],
                Home: () => row.firstElementChild,
                End: () => row.lastElementChild
            }
            if (!moves[event.key]) return
            // the keys would otherwise scroll the grid
            event.preventDefault()
            moves[event.key]()?.querySelector('[data-el="table-cell"]')?.focus()
        },
        // the grid names the column by its key and no column once the sort is cleared
        onSortChange (key, dir) {
            const column = this.selectedTable.schema.find(col => col.safeName === key)
            this.setSort(column ? { column: column.name, dir } : null)
            this.loadPage()
        },
        onPageChange (page) {
            this.setPage(page)
            this.loadPage()
        },
        onPageSizeChange (pageSize) {
            this.setPageSize(pageSize)
            this.loadPage()
        },
        loadPage () {
            const load = this.latestPageLoad = {}
            this.setTableLoadingState(true)
            return this.getTableData({
                teamId: this.team.id,
                databaseId: this.$route.params.id,
                tableName: this.tableSelection.name,
                schemaName: this.tableSelection.dbSchema
            })
                .catch(err => {
                    // a sort the table cannot do, by a column removed since the page was loaded for one
                    if (err.response?.data?.code === 'invalid_sort') {
                        Alerts.emit(err.response.data.error, 'warning')
                        // drop the sort the table refused, along with its arrow in the header
                        this.setSort(null)
                        this.sortResets++
                        this.loadPage()
                    }
                })
                .finally(() => {
                    // a page picked in the meantime is still loading, so leave the state to it
                    if (this.latestPageLoad === load) this.setTableLoadingState(false)
                })
        }
    }
})
</script>

<style scoped lang="scss">
#rows-list {
    flex: 1;
    min-height: 0;
    width: 100%;

    // fill the pane, so the empty state lines up with the tables list next to it
    .no-tables {
        height: 100%;

        // the content centres itself (margin: auto), and scrolls if the pane is too short for it
        :deep(.ff-empty-state) {
            height: 100%;
            display: flex;
            padding: 24px;
            overflow-y: auto;
        }
    }

    // the grid takes the height the note above it leaves
    .content {
        display: flex;
        flex-direction: column;

        .rows-table {
            flex: 1;
            min-height: 0;
        }
    }

    .too-big {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 10px;
        color: var(--ff-color-text-muted);
        font-size: 0.875rem;
        // the note runs onto a second line in a narrow pane
        .ff-icon {
            flex-shrink: 0;
        }
    }

    .header {
        border-bottom: 1px solid var(--ff-color-border);
        padding-bottom: 15px;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        height: 50px;
    }

    // the column headers are rendered from html, so they sit outside this component's scope
    :deep(thead) {
        .column-name, .column-type {
            display: block;
        }

        .column-type {
            color: var(--ff-color-text-muted);
            font-size: 0.75rem;
            font-weight: normal;
        }
    }
}
</style>
