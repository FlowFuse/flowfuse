<template>
    <div id="team-table" class="h-full">
        <router-view />
    </div>
</template>

<script>

import { defineComponent } from 'vue'

export default defineComponent({
    name: 'TeamTable',
    emits: ['set-tabs'],
    data () {
        return {
            loading: true
        }
    },
    computed: {
        tabs () {
            return [
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
                    },
                    hidden: true
                },
                {
                    label: 'Credentials',
                    to: {
                        name: 'team-tables-table-credentials',
                        params: {
                            id: this.$route.params.id
                        }
                    }
                }
            ].filter(e => e.hidden ?? true)
        }
    },
    mounted () {
        this.$emit('set-tabs', this.tabs)
    }
})
</script>

<style scoped lang="scss">

</style>
