<template>
    <div class="forge-block flex flex-col justify-center">
        <div class="sm:max-w-xl mx-auto w-full space-y-2">
            <div class="max-w-xs mx-auto w-full mb-4">
                <FlowForgeLogo/>
                <h2 class="mt-2 text-center text-3xl font-bold text-gray-900">
                    <span>FLOW</span><span class="font-light">FORGE</span>
                </h2>
            </div>
            <form v-if="!verified" class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4 text-center">
                <p class="text-gray-700 text-lg mt-10 ">Confirm your email address</p>
                <p class="text-sm text-gray-700">Please click the verify button below to confirm your email address <b>{{user.email}}</b></p>
                <ff-button class="m-auto" :disabled="verified" @click="verifyEmail()">
                    <span v-if="!verified">Verify</span>
                    <span v-if="verified">Email verified</span>
                </ff-button>
            </form>
            <form v-if="verified" class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4 text-center">
                <p class="text-gray-700 text-lg mt-10 ">Email address confirmed</p>
                <p class="text-sm text-gray-700"><b>{{user.email}}</b></p>
                <ff-button class="m-auto" @click="reload">
                    <span>Continue</span>
                </ff-button>
            </form>
        </div>
    </div>
</template>

<script>

import { mapState } from 'vuex'
import userApi from '@/api/user'
import FlowForgeLogo from '@/components/Logo'
import alerts from '@/services/alerts'

export default {
    name: 'NoVerifiedEmail',
    computed: {
        ...mapState('account', ['user', 'verifyEmailInflight', 'verifyEmailToken']),
    },
    data () {
        return {
            verified: false
        }
    },
    mounted() {
        this.verified = !!this.user?.email_verified
    },
    methods: {
        async verifyEmail () {
            const timing = 4000
            try {
                await userApi.verifyEmailToken(this.verifyEmailToken)
                const user = await userApi.getUser()
                this.verified = user.email_verified
                if (this.verified === true) {
                    alerts.emit('Email verified','confirmation', timing)
                    setTimeout(() => {
                        this.reload()
                    }, timing);
                } else {
                    // somehow token was accepted but the user is NOT verified!
                    // throw an error to cause toast + reload (cause request for new token)
                    throw new Error()
                }
            } catch (err) {
                if (err.response?.data) {
                    alerts.emit(`Unable to verify email. ${err.response.data.error}`, 'warning', timing)
                } else {
                    alerts.emit('Unable to verify email. Check logs for details.', 'warning', timing)
                    console.log(err)
                }
                this.$store.dispatch('account/clearVerifyEmailInflight')
                this.reload()
            }
        },
        reload() {
            // dispatch checkState to cause redirection now that user.email_verified is set
            this.$store.dispatch('account/checkState')
        }
    },
    components: {
        FlowForgeLogo
    }
}
</script>
