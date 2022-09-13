<template>
    <div class="forge-block flex flex-col justify-center">
        <div class="sm:max-w-xl mx-auto w-full space-y-2">
            <div class="max-w-xs mx-auto w-full mb-4">
                <FlowForgeLogo/>
                <h2 class="mt-2 text-center text-3xl font-bold text-gray-900">
                    <span>FLOW</span><span class="font-light">FORGE</span>
                </h2>
            </div>
            <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4 text-center">
                <p class="text-gray-700 text-lg mt-10 ">Confirm your email address</p>
                <p class="text-sm text-gray-700">Please click the link in the email we sent to <b>{{user.email}}</b></p>
                <ff-button class="m-auto" :disabled="sent" @click="resend()">
                    <span v-if="!sent">Resend email</span>
                    <span v-else>Sent</span>
                </ff-button>
            </form>
        </div>
    </div>
</template>

<script>

import { mapState } from 'vuex'
import userApi from '@/api/user'
import FlowForgeLogo from '@/components/Logo'

export default {
    name: 'NoVerifiedEmail',
    computed: {
        ...mapState('account', ['user'])
    },
    data () {
        return {
            code: '',
            sent: false
        }
    },
    methods: {
        async resend () {
            if (!this.sent) {
                this.sent = true
                await userApi.triggerVerification()
            }
        }
    },
    components: {
        FlowForgeLogo
    }
}
</script>
