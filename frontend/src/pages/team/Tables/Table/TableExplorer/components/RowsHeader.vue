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
            <RefreshIcon class="ff-icon ff-icon-md" aria-hidden="true" />
        </button>
    </section>
</template>

<script>
import { RefreshIcon } from '@heroicons/vue/outline'
import { mapActions, mapState } from 'vuex'

import MenuCollapse from '../../.././../../../components/icons/menu-collapse.js'
import MenuExpand from '../../.././../../../components/icons/menu-expand.js'

export default {
    name: 'RowsHeader',
    components: { MenuCollapse, MenuExpand, RefreshIcon },
    props: {
        menuCollapsed: {
            type: Boolean,
            required: true
        }
    },
    emits: ['toggle-collapse'],
    computed: {
        ...mapState('account', ['team']),
        ...mapState('product/tables', ['tableSelection'])
    },
    methods: {
        ...mapActions('product/tables', ['getTableData', 'setTableLoadingState']),
        refreshTable () {
            return this.setTableLoadingState(true)
                .then(() => this.getTableData({
                    teamId: this.team.id,
                    databaseId: this.$route.params.id,
                    tableName: this.tableSelection
                }))
                .finally(() => this.setTableLoadingState(false))
        }
    }
}
</script>

<style scoped lang="scss">
.rows-header {
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid $ff-color--border;

    .toggle-collapse, .refresh-table {
        border: 1px solid transparent;
    }
}
</style>
