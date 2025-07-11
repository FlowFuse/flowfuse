<template>
    <DatabaseForm :database="currentDatabase" />
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters, mapState } from 'vuex'

import DatabaseForm from '../../components/DatabaseForm.vue'

export default defineComponent({
    name: 'TableCredentials',
    components: { DatabaseForm },
    computed: {
        ...mapState('product/tables', ['databases']),
        ...mapGetters('product/tables', ['database']),
        currentDatabase () {
            return this.database(this.$route.params.id)
        }
    }
})
</script>

<style scoped lang="scss">

</style>
