<template>
    <DatabaseForm :has-back-button="true" @submit="onSubmit" />
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

import tablesApi from '../../../../api/tables.js'

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
        onSubmit (payload) {
            return tablesApi.createDatabase(this.team.id, payload.name)
        }
    }
})
</script>

<style scoped lang="scss">

</style>
