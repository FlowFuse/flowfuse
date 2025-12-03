<template>
    <section id="rows-list" data-el="rows-list">
        <!--        <div class="header flex gap-2 w-full h-full">-->
        <!--            <CollapseLeft class="ff-icon ff-icon-md" />-->
        <!--        </div>-->

        <div v-if="!selectedTable" class="no-content w-full h-full flex justify-center items-center text-gray-400">
            <p>Select a table to get going!</p>
        </div>

        <div v-else-if="selectedTable && selectedTable.schema" class="content overflow-auto h-full">
            <ff-data-table
                :columns="columns" :rows="rows"
                class="h-full overflow-auto"
                tableClass="table-auto overflow-auto"
            />
        </div>

        <div v-else class="no-content w-full h-full flex justify-center items-center text-gray-400">
            <p>There doesn't seem to be anything here!</p>
        </div>
    </section>
</template>

<script>
import { defineComponent, markRaw } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import TextCell from './table-cells/text-cell.vue'

export default defineComponent({
    name: 'RowsList',
    computed: {
        ...mapState('product/tables', ['tableSelection']),
        ...mapGetters('product/tables', ['selectedTable']),
        ...mapState('account', ['team']),
        columns () {
            return (this.selectedTable?.schema ?? []).map((row) => {
                return {
                    key: row.safeName,
                    html: `<span >${row.name}</span> <span class="text-gray-400">${row.type}</span>`,
                    sortable: true,
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
        rows () {
            return (this.selectedTable?.payload?.safe ?? [])
        }
    },
    watch: {
        tableSelection (tableName) {
            this.getTableSchema({
                teamId: this.team.id,
                databaseId: this.$route.params.id,
                tableName
            })
                .then(() => this.getTableData({
                    teamId: this.team.id,
                    databaseId: this.$route.params.id,
                    tableName
                }))
                .catch(e => e)
        }
    },
    beforeUnmount () {
        this.updateTableSelection(null)
    },
    methods: {
        ...mapActions('product/tables', ['getTableSchema', 'getTableData', 'updateTableSelection']),
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
