<template>
    <DatabaseForm :database="databases[0]" />
</template>

<script>
import { defineComponent } from 'vue'
import { mapState } from 'vuex'

import DatabaseForm from '../../components/DatabaseForm.vue'

export default defineComponent({
    name: 'TableSettings',
    components: { DatabaseForm },
    computed: {
        ...mapState('product/tables', ['databases'])
    }
})
</script>

<style scoped lang="scss">

</style>
