<template>
    <ff-layout-box>
        <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6 max-w-md" @submit.prevent>
            <p>
                Before you can access the platform, we need to verify your email
                address.
            </p>
            <p>
                We sent you an email with a link to click when you signed up.
            </p>
            <ff-button :disabled="sent" @click="resend">
                <span v-if="!sent">Resend email</span>
                <span v-else>Sent</span>
            </ff-button>
            <ff-button kind="tertiary" @click="logout">Log out</ff-button>
        </form>
    </ff-layout-box>
</template>

<script>
import { mapState } from 'vuex'

import userApi from '../api/user.js'
import FFLayoutBox from '../layouts/Box.vue'
import store from '../store/index.js'

export default {
    name: 'UnverifiedEmail',
    components: {
        'ff-layout-box': FFLayoutBox
    },
    data () {
        return {
            sent: false
        }
    },
    computed: mapState('account', ['user']),
    methods: {
        async resend () {
            if (!this.sent) {
                this.sent = true
                await userApi.triggerVerification()
            }
        },
        logout () {
            store.dispatch('account/logout')
        }
    }
}
</script>
