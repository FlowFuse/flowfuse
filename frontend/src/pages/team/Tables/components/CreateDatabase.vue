<template>
    <DatabaseForm :has-back-button="true" @submit="onSubmit" />
</template>

<script>
import { defineComponent } from 'vue'
import { mapActions, mapGetters } from 'vuex'

import DatabaseForm from './DatabaseForm.vue'

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
        ...mapGetters('account', ['team'])
    },
    methods: {
        ...mapActions('product/tables', ['createDatabase']),
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
