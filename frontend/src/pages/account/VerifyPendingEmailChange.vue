<template>
    <form v-if="!pending" class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        <div>
            <ff-button class="m-auto" @click="verify()">Click here to verify your change of email address</ff-button>
        </div>
    </form>
</template>

<script>

import { mapState } from 'vuex'

import userApi from '../../api/user.js'
import alerts from '../../services/alerts.js'

export default {
    name: 'VerifyPendingEmailChange',
    props: {
        token: { type: String, required: true }
    },
    computed: {
        ...mapState(['pending'])
    },
    methods: {
        async verify () {
            const timing = 4000
            try {
                await userApi.verifyPendingEmailChangeToken(this.$route.params.token)
                window.location = '/'
            } catch (err) {
                if (err.response?.data) {
                    alerts.emit(`Unable to confirm new email. ${err.response.data.error}`, 'warning', timing)
                } else {
                    alerts.emit('Unable to confirm new email. Check logs for details.', 'warning', timing)
                    console.error(err)
                }
            }
        }
    }
}
</script>
