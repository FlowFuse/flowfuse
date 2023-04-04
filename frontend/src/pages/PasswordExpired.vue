<template>
    <ff-layout-box>
        <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
            <UpdateExpiredPassword />
        </form>
    </ff-layout-box>
</template>

<script>
import { mapState } from 'vuex'
import UpdateExpiredPassword from '../components/auth/UpdateExpiredPassword.vue'

import FFLayoutBox from '../layouts/Box.vue'

export default {
    name: 'PasswordExpired',
    methods: {
    },
    computed: mapState('account', ['user']),
    components: {
        'ff-layout-box': FFLayoutBox,
        UpdateExpiredPassword
    }
}
</script>
