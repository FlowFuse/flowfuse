<template>
    <router-view />
</template>

<script>
import { mapState } from 'vuex'

import adminApi from '../../api/admin.js'

export default {
    name: 'AdminPage',
    data () {
        return {
            mounted: false
        }
    },
    computed: {
        ...mapState('account', ['features', 'user', 'team'])
    },
    async mounted () {
        try {
            await adminApi.getLicenseDetails()
        } catch (err) {
            if (err.response?.status === 403 || !err.response) {
                this.$router.push('/')
            } else {
                throw err
            }
        }
        this.mounted = true
    }
}
</script>

<style lang="scss">
@import "../../stylesheets/pages/admin.scss";
</style>
