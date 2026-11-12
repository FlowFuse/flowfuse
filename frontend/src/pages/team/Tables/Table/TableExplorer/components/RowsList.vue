<template>
    <section id="rows-list" data-el="rows-list">
        <EmptyState v-if="hasNoTables" class="no-tables" data-el="no-tables">
            <template #img>
                <img alt="No tables" src="../../../../../../images/empty-states/team-tables.png">
            </template>
            <template #header>No tables yet</template>
            <template #message>
                <p>Create your first table and its rows will show up here, ready to browse.</p>
            </template>
            <template #actions>
                <ff-button data-action="create-table" @click="onCreateTable">
                    <template #icon-left><PlusIcon /></template>
                    Create Table
                </ff-button>
            </template>
        </EmptyState>

        <div v-else-if="!selectedTable" class="no-content w-full h-full" />

        <div v-else-if="selectedTable && selectedTable.schema" class="content h-full">
            <ff-data-table
                :loading="isLoading" loading-type="skeleton"
                :columns="columns" :rows="rows"
                :pagination="pagination"
                class="h-full"
                tableClass="table-auto"
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
import { PlusIcon } from '@heroicons/vue/24/outline'
import { mapActions, mapState } from 'pinia'
import { defineComponent, markRaw } from 'vue'

import { getColumnTypeLabel } from '../../../columnTypes.js'
import CreateTable from '../drawers/CreateTable.vue'

import TextCell from './table-cells/text-cell.vue'

import EmptyState from '@/components/EmptyState.vue'

import { escapeHtml } from '@/composables/strings/String.js'
import { useContextStore } from '@/stores/context.js'
import { useProductTablesStore } from '@/stores/product-tables.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

export default defineComponent({
    name: 'RowsList',
    components: { EmptyState, PlusIcon },
    computed: {
        ...mapState(useProductTablesStore, ['tables', 'tableSelection', 'isLoading', 'selectedTable', 'page', 'pageSize']),
        ...mapState(useContextStore, ['team']),
        columns () {
            return (this.selectedTable?.schema ?? []).map((row) => {
                return {
                    key: row.safeName,
                    html: `<span class="column-name">${escapeHtml(row.name)}</span><span class="column-type" title="${escapeHtml(row.type)}">${escapeHtml(getColumnTypeLabel(row.type))}</span>`,
                    component: {
                        is: this.getTableComponent(row.type),
                        extraProps: {},
                        bind: {
                            'row-value': row.safeName
                        }
                    },
                    tableCellClass: 'truncate',
                    tableLabelClass: 'truncate',
                    headerClass: 'sticky top-0'
                }
            })
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
                total: this.selectedTable?.payload?.total ?? 0
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
        this.updateTableSelection(null)
    },
    methods: {
        ...mapActions(useProductTablesStore, ['getTableSchema', 'getTableData', 'updateTableSelection', 'setPage', 'setPageSize', 'setTableLoadingState']),
        ...mapActions(useUxDrawersStore, ['openRightDrawer']),
        onCreateTable () {
            this.openRightDrawer({
                component: markRaw(CreateTable),
                wider: true,
                overlay: true
            })
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
                .catch(e => e)
                .finally(() => {
                    // a page picked in the meantime is still loading, so leave the state to it
                    if (this.latestPageLoad === load) this.setTableLoadingState(false)
                })
        },
        getTableComponent (type) {
            const componentMap = {
                text: TextCell
            }

            if (Object.prototype.hasOwnProperty.call(componentMap, type)) {
                return componentMap[type]
            } else {
                return markRaw({
                    props: ['row-value'],
                    template: '<span class="truncate">{{rowValue}}</span>'
                })
            }
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
