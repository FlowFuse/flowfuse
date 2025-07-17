<template>
    <section id="rows-list" data-el="rows-list">
        <!--        <div class="header flex gap-2 w-full h-full">-->
        <!--            <CollapseLeft class="ff-icon ff-icon-md" />-->
        <!--        </div>-->

        <div v-if="!selectedTable" class="no-content w-full h-full flex justify-center items-center text-gray-400">
            <p>Select a table to get going!</p>
        </div>

        <div v-else-if="selectedTable && selectedTable.schema" class="content">
            <ff-data-table :columns="columns" :rows="rows" />
        </div>

        <div v-else class="no-content w-full h-full flex justify-center items-center text-gray-400">
            <p>There doesn't seem to be anything here!</p>
        </div>
    </section>
</template>

<script>
import { defineComponent } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

export default defineComponent({
    name: 'RowsList',
    computed: {
        ...mapState('product/tables', ['tableSelection']),
        ...mapGetters('product/tables', ['selectedTable']),
        ...mapState('account', ['team']),
        columns () {
            return (this.selectedTable?.schema ?? []).map(row => {
                return {
                    key: row.name,
                    html: `<span>${row.name}</span> <span class="text-gray-400">${row.type}</span>`,
                    sortable: true,
                    style: {
                        width: '32px',
                        'max-width': '35px'
                    },
                    tableCellClass: 'truncate',
                    tableLabelClass: 'truncate'
                }
            })
        },
        rows () {
            return (this.selectedTable?.data ?? [])
                .map(row => {
                    // console.log(Object.entries(row))
                    return row
                })
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
        ...mapActions('product/tables', ['getTableSchema', 'getTableData', 'updateTableSelection'])
    }
})
</script>

<style scoped lang="scss">
#rows-list {
    height: 100%;
    width: 100%;

    .header {
        border-bottom: 1px solid $ff-color--border;
        padding-bottom: 15px;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        height: 50px;
    }
}
</style>
