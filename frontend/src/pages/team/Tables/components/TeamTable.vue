<template>
    <div id="team-table">
        <ff-loading v-if="loading" message="Loading Tables..." />

        <div v-else-if="hasTables">
            <h1>TBD</h1>
        </div>

        <EmptyState v-else>
            <template #img>
                <img alt="empty-state-logo" src="../../../../images/empty-states/application-instances.png">
            </template>
            <template #header>No Tables Found</template>
            <template #message>
                <p>
                    We've not been able to find any Tables for this team.
                </p>
                <p>
                    After creating a Table, you can explore its contents, inspect rows, and query the data here.
                </p>
            </template>
        </EmptyState>
    </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

import tablesApi from '../../../../api/tables.js'

import EmptyState from '../../../../components/EmptyState.vue'

export default defineComponent({
    name: 'TeamTable',
    components: { EmptyState },
    data () {
        return {
            loading: true,
            tables: []
        }
    },
    computed: {
        ...mapGetters('account', ['team']),
        hasTables () {
            return this.tables.length > 0
        }
    },
    mounted () {
        this.getTables()
            .then(res => {
                this.tables = res
            })
            .catch(e => e)
            .finally(() => {
                this.loading = false
            })
    },
    methods: {
        getTables () {
            return tablesApi.getTables(this.team.id, this.$route.params.id)
        }
    }
})
</script>

<style scoped lang="scss">

</style>
