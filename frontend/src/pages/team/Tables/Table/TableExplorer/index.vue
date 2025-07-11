<template>
    <div id="table-explorer">
        <TablesList />
        <RowsList />
    </div>
</template>

<script>
import { defineComponent } from 'vue'

import RowsList from './components/RowsList.vue'
import TablesList from './components/TablesList.vue'

export default defineComponent({
    name: 'TableExplorer',
    components: { RowsList, TablesList }
})
</script>

<style scoped lang="scss">
#table-explorer {
    display: flex;
    gap: 15px;
    height: 100%;
    width: 100%;

    #tables-list {
        border-right: 1px solid $ff-color--border;
        padding-right: 10px;
    }
}
</style>
