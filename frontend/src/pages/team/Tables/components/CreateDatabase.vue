<template>
    <DatabaseForm :has-back-button="true" @submit="onSubmit" />
</template>

<script>
import { mapActions, mapState } from 'pinia'
import { defineComponent } from 'vue'

import DatabaseForm from './DatabaseForm.vue'

import { useContextStore } from '@/stores/context.js'

import { useProductTablesStore } from '@/stores/product-tables.js'

export default defineComponent({
    name: 'CreateDatabase',
    components: { DatabaseForm },
    beforeRouteEnter (to, from, next) {
        if (!to.params.type || !['postgres'].includes(to.params.type)) {
            next({ name: 'page-not-found' })
        }

        return next()
    },
    computed: {
        ...mapState(useContextStore, ['team'])
    },
    methods: {
        ...mapActions(useProductTablesStore, ['createDatabase']),
        onSubmit (payload) {
            return this.createDatabase({ teamId: this.team.id, databaseName: payload.name })
                .then(() => {
                    this.$router.push({
                        name: 'team-tables',
                        params: { team_slug: this.team.slug }
                    })
                })
        }
    }
})
</script>

<style scoped lang="scss">

</style>
