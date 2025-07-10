<template>
    <div id="team-table">
        <ff-loading v-if="loading" message="Loading Tables..." />
        <router-view />
    </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

import tablesApi from '../../../../api/tables.js'

export default defineComponent({
    name: 'TeamTable',
    emits: ['set-tabs'],
    data () {
        return {
            loading: true,
            tables: [],
            tabs: [
                {
                    label: 'Explorer',
                    to: {
                        name: 'team-tables-table-explorer',
                        params: {
                            id: this.$route.params.id
                        }
                    }
                },
                {
                    label: 'SQL Editor',
                    to: {
                        name: 'team-tables-table-editor',
                        params: {
                            id: this.$route.params.id
                        }
                    }
                },
                {
                    label: 'Settings',
                    to: {
                        name: 'team-tables-table-settings',
                        params: {
                            id: this.$route.params.id
                        }
                    }
                }
            ]
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
        this.$emit('set-tabs', this.tabs)
    },
    beforeUnmount () {
        this.$emit('set-tabs', [])
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
