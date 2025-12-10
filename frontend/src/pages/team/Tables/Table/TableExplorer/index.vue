<template>
    <div id="table-explorer" data-el="table-explorer" :class="{collapsed: menuCollapsed}">
        <TablesList />
        <div class="flex-1 flex flex-col overflow-auto">
            <rows-header :menu-collapsed="menuCollapsed" @toggle-collapse="menuCollapsed = !menuCollapsed" />
            <RowsList />
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapActions } from 'vuex'

import RowsHeader from './components/RowsHeader.vue'

import RowsList from './components/RowsList.vue'
import TablesList from './components/TablesList.vue'

export default defineComponent({
    name: 'TableExplorer',
    components: { RowsHeader, RowsList, TablesList },
    data () {
        return {
            menuCollapsed: false
        }
    },
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

    &.collapsed {
        gap: 0;
        #tables-list {
            max-width: 0;
            min-width: 0;
            overflow: hidden;
            padding: 0;
            border-right-color: transparent;
        }
    }

    #tables-list {
        border-right: 1px solid $ff-color--border;
        padding-right: 10px;
        transition: ease-in-out .3s, border-right-color ease-out .3s;
    }
}
</style>
