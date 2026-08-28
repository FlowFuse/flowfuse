<template>
    <ff-layout-box class="ff-unverified-email ff--center-box">
        <form class="px-4 sm:px-6 lg:px-8 mt-8 mx-auto space-y-6 max-w-md" @submit.prevent>
            <p>
                {{ $t('ui.beforeYouCanAccessThePlatformWeNeedToVerifyYourE') }}
            </p>
            <p class="font-bold pl-4">
                {{ user.email }}
            </p>
            <p>
                {{ $t('ui.pleaseEnterTheCodeBelowToContinue') }}
            </p>
            <div>
                <ff-text-input v-model="token" data-form="verify-token" maxlength="6" :label="$t('ui.token2')" @enter="submitVerificationToken" />
                <span class="ff-error-inline" data-el="token-error">{{ error }}</span>
            </div>

            <ff-button :disabled="token.length !== 6" data-action="submit-verify-token" @click="submitVerificationToken">{{ $t('ui.continue') }}</ff-button>
            <p>
                <ff-button kind="tertiary" :disabled="resendTimeoutCount > 0" @click="resend">
                    <span>{{ $t('ui.resendEmail') }} <span v-if="resendTimeoutCount > 0">({{ resendTimeoutCount }})</span></span>
                </ff-button>
                <ff-button kind="tertiary" @click="logout">{{ $t('ui.logOut') }}</ff-button>
            </p>
        </form>
    </ff-layout-box>
</template>

<script>
import { mapActions, mapState } from 'pinia'

import userApi from '../api/user.js'
import FFLayoutBox from '../layouts/Box.vue'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useUxToursStore } from '@/stores/ux-tours.js'
import { useUxStore } from '@/stores/ux.js'

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
        ...mapState(useAccountAuthStore, ['user'])
    },
    methods: {
        ...mapActions(useUxStore, ['setNewlyCreatedUser']),
        ...mapActions(useUxToursStore, ['presentTour']),
        async submitVerificationToken () {
            try {
                await userApi.verifyEmailToken(this.token)
                clearTimeout(this.resendTimeout)
                this.presentTour()
                this.setNewlyCreatedUser()
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
            useAccountAuthStore().logout()
        }
    }
}
</script>
