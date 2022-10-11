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
import userApi from '@/api/user'
import alerts from '@/services/alerts'
import FFLayoutBox from '@/layouts/Box'

export default {
    name: 'VerifyEmail',
    props: ['token'],
    computed: {
        ...mapState(['pending'])
    },
    data () {
        return {
            verified: false
        }
    },
    async beforeMount () {
        // TODO: Remove beforeMount before merge
        console.log('VerifyEmail beforeMount --> this.$route:', this.$route)
    },
    async mounted () {
        console.log('VerifyEmail mounted --> this.$route:', this.$route) // TODO: Remove before merge
        this.emailVerificationToken = this.$route.params.emailVerificationToken
    },
    methods: {
        async verifyEmail () {
            const timing = 4000
            try {
                await userApi.verifyEmailToken(this.emailVerificationToken)
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
            this.$store.dispatch('account/checkState')
        }
    },
    components: {
        'ff-layout-box': FFLayoutBox
    }
}
</script>
