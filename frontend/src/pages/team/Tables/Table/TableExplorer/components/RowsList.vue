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

        <div v-else-if="selectedTable && selectedTable.schema" class="content overflow-auto h-full">
            <ff-data-table
                :loading="isLoading"
                :columns="columns" :rows="rows"
                :pagination="pagination"
                class="h-full overflow-auto"
                tableClass="table-auto overflow-auto"
                @update:page="onPageChange"
                @update:page-size="onPageSizeChange"
            />
        </div>

        <div v-else class="no-content w-full h-full flex justify-center items-center text-gray-400">
            <p>There doesn't seem to be anything here!</p>
        </div>
    </section>
</template>

<script>
import { PlusIcon } from '@heroicons/vue/24/outline'
import { mapActions, mapState } from 'pinia'
import { defineComponent, markRaw } from 'vue'

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
                    html: `<span >${escapeHtml(row.name)}</span> <span class="text-gray-400">${escapeHtml(row.type)}</span>`,
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
            if (!table) return
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
            this.setTableLoadingState(true)
            return this.getTableData({
                teamId: this.team.id,
                databaseId: this.$route.params.id,
                tableName: this.tableSelection.name,
                schemaName: this.tableSelection.dbSchema
            })
                .catch(e => e)
                .finally(() => this.setTableLoadingState(false))
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
    height: 100%;
    width: 100%;
    overflow: auto;

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
}
</style>
