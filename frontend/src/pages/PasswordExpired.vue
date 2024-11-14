<template>
    <ff-layout-box class="ff-password-expired">
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
    components: {
        'ff-layout-box': FFLayoutBox,
        UpdateExpiredPassword
    },
    computed: mapState('account', ['user']),
    methods: {
    }
}
</script>

<style lang="scss">
.ff-layout--box.ff-password-expired {
    flex-direction: column;
    min-height: fit-content;
    overflow: auto;

    .ff-layout--box--wrapper {
        display: flex;
        width: 100%;
        max-height: fit-content;
        height: fit-content;

        .ff-layout--box--left,
        .ff-layout--box--right {
            width: 100%;
        }
    }
}
</style>
