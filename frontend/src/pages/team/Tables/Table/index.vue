<template>
    <div id="team-table" class="h-full">
        <router-view />
    </div>
</template>

<script>

import { defineComponent } from 'vue'

import { t } from '../../../../i18n.js'

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
                    label: t('ui.explorer'),
                    to: {
                        name: 'team-tables-table-explorer',
                        params: {
                            id: this.$route.params.id
                        }
                    }
                },
                {
                    label: t('ui.sqlEditor'),
                    to: {
                        name: 'team-tables-table-editor',
                        params: {
                            id: this.$route.params.id
                        }
                    },
                    hidden: true
                },
                {
                    label: t('ui.credentials'),
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
