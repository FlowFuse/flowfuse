<template>
    <ff-layout-box>
        <form v-if="!pending" class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
            <div>
                <p class="text-lg mt-10 ">Confirm your email address</p>
                <p class="text-sm" :v-if="!verified">Please click the button below to confirm your email address</p>
                <ff-button class="m-auto" :disabled="verified" @click="verifyEmail()">
                    <span v-if="!verified">Confirm</span>
                    <span v-if="verified">Email confirmed</span>
                </ff-button>
            </div>
        </form>
    </ff-layout-box>
</template>

<script>

import { mapState } from 'vuex'
import store from '@/store'
import userApi from '@/api/user'
import alerts from '@/services/alerts'
import FFLayoutBox from '@/layouts/Box'

export default {
    name: 'VerifyEmail',
    computed: {
        ...mapState(['pending'])
    },
    data () {
        return {
            verified: false,
            verifyEmailInflight: null,
            verifyEmailToken: null
        }
    },
    async mounted () {
        this.verifyEmailInflight = store?.state?.account?.verifyEmailInflight
        this.verifyEmailToken = store?.state?.account?.verifyEmailToken
        if (!this.verifyEmailToken || !this.verifyEmailInflight) {
            this.reload()
        }
    },
    methods: {
        async verifyEmail () {
            const timing = 4000
            try {
                await userApi.verifyEmailToken(this.verifyEmailToken)
                this.$store.dispatch('account/clearVerifyEmailInflight')
                alerts.emit('Email verified', 'confirmation', timing)
                this.verified = true
                this.reload()
            } catch (err) {
                if (err.response?.data) {
                    alerts.emit(`Unable to verify email. ${err.response.data.error}`, 'warning', timing)
                } else {
                    alerts.emit('Unable to verify email. Check logs for details.', 'warning', timing)
                    console.log(err)
                }
            }
        },
        reload () {
            // dispatch checkState to cause redirection now that user.email_verified is set
            this.$store.dispatch('account/clearVerifyEmailInflight')
            this.$store.dispatch('account/checkState')
        }
    },
    components: {
        'ff-layout-box': FFLayoutBox
    }
}
</script>
