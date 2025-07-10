<template>
    <div id="team-table">
        <router-view />
    </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

export default defineComponent({
    name: 'TeamTable',
    emits: ['set-tabs'],
    data () {
        return {
            loading: true,
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
        ...mapState('product/tables', ['tables'])
    },
    mounted () {
        this.getTables(this.$route.params.id)
            .catch(e => e)
            .finally(() => {
                this.loading = false
            })
        this.$emit('set-tabs', this.tabs)
    },
    methods: {
        ...mapActions('product/tables', ['getTables'])
    }
})
</script>

<style scoped lang="scss">

</style>
