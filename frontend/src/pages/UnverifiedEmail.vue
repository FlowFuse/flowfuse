<template>
    <ff-layout-box class="ff-unverified-email ff--center-box">
        <form class="px-4 sm:px-6 lg:px-8 mt-8 mx-auto space-y-6 max-w-md" @submit.prevent>
            <p>
                Before you can access the platform, we need to verify your email
                address. We have sent a code in an email to:
            </p>
            <p class="font-bold pl-4">
                {{ user.email }}
            </p>
            <p>
                Please enter the code below to continue.
            </p>
            <div>
                <ff-text-input v-model="token" data-form="verify-token" maxlength="6" label="token" @enter="submitVerificationToken" />
                <span class="ff-error-inline" data-el="token-error">{{ error }}</span>
            </div>

            <ff-button :disabled="token.length !== 6" data-action="submit-verify-token" @click="submitVerificationToken">Continue</ff-button>
            <p>
                <ff-button kind="tertiary" :disabled="resendTimeoutCount > 0" @click="resend">
                    <span>Resend email <span v-if="resendTimeoutCount > 0">({{ resendTimeoutCount }})</span></span>
                </ff-button>
                <ff-button kind="tertiary" @click="logout">Log out</ff-button>
            </p>
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
            token: '',
            error: '',
            resendTimeoutCount: 0,
            resendTimeout: null
        }
    },
    computed: {
        ...mapState('account', ['user'])
    },
    methods: {
        async submitVerificationToken () {
            try {
                await userApi.verifyEmailToken(this.token)
                clearTimeout(this.resendTimeout)
                this.$store.dispatch('ux/activateTour', 'welcome')
                this.$router.go()
            } catch (err) {
                console.error(err)
                // Verification failed.
                this.token = ''
                this.error = 'Verification failed. Click resend to receive a new code to try again'
                clearTimeout(this.resendTimeout)
                this.resendTimeout = 0
            }
        },
        async resend () {
            this.resendTimeoutCount = 30
            try {
                await userApi.triggerVerification()
            } catch (err) {

            }
            const tick = () => {
                this.resendTimeoutCount--
                if (this.resendTimeoutCount > 0) {
                    this.resendTimeout = setTimeout(tick, 1000)
                }
            }
            tick()
        },
        logout () {
            store.dispatch('account/logout')
        }
    }
}
</script>
