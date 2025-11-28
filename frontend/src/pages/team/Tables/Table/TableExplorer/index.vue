<template>
    <div id="table-explorer" data-el="table-explorer">
        <TablesList />
        <RowsList />
    </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapActions } from 'vuex'

import RowsList from './components/RowsList.vue'
import TablesList from './components/TablesList.vue'

export default defineComponent({
    name: 'TableExplorer',
    components: { RowsList, TablesList },
    mounted () {
        this.getTables(this.$route.params.id)
            .catch(e => e)
            .finally(() => {
                this.loading = false
            })
    },
    methods: {
        ...mapActions('product/tables', ['getTables'])
    }
})
</script>

<style scoped lang="scss">
#table-explorer {
    display: flex;
    gap: 15px;
    height: 100%;
    width: 100%;
    overflow: auto;

    #tables-list {
        border-right: 1px solid var(--ff-color-border);
        padding-right: 10px;
    }
}
</style>
