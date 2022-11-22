<template>
    <div id="ff-app" class="min-h-screen flex flex-col">
        <template v-if="offline">
            <main class="ff-bg-dark flex-grow flex flex-col">
                <div class="w-full max-w-screen-2xl mx-auto my-2 sm:my-8 flex-grow flex flex-col">
                    <Offline />
                </div>
            </main>
        </template>
        <template v-else-if="pending">
            <main class="ff-bg-dark flex-grow flex flex-col">
                <div class="w-full mx-auto flex-grow flex flex-col">
                    <Loading color="white" />
                </div>
            </main>
        </template>
        <!-- Platform Entry Point -->
        <template v-else-if="user && !user.password_expired && !termsAndConditionsRequired && user.email_verified !== false">
            <template v-if="!isModalPage">
                <ff-layout-platform>
                    <router-view></router-view>
                </ff-layout-platform>
            </template>
            <template v-else>
                <ff-layout-box>
                    <router-view></router-view>
                </ff-layout-box>
            </template>
        </template>
        <!-- Password Reset Required -->
        <template v-else-if="user && user.password_expired">
            <PasswordExpired/>
        </template>
        <!-- Email Verification Required (Show "Resend")-->
        <template v-else-if="user && user.email_verified === false && !isEmailVerificationPage">
            <UnverifiedEmail/>
        </template>
        <!-- T+Cs Acceptance Required -->
        <template v-else-if="user && termsAndConditionsRequired">
            <TermsAndConditions/>
        </template>
        <template v-else-if="!loginRequired">
            <router-view></router-view>
        </template>
        <!-- Authentication Screen -->
        <template v-else>
            <Login/>
        </template>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Login from '@/pages/Login.vue'
import Loading from '@/components/Loading'
import Offline from '@/components/Offline'
import PasswordExpired from '@/pages/PasswordExpired.vue'
import UnverifiedEmail from '@/pages/UnverifiedEmail.vue'
import TermsAndConditions from '@/pages/TermsAndConditions.vue'
import FFLayoutPlatform from '@/layouts/Platform.vue'
import FFLayoutBox from '@/layouts/Box.vue'
export default {
    name: 'App',
    computed: {
        ...mapState('account', ['pending', 'user', 'team', 'offline', 'settings']),
        loginRequired () {
            return this.$route.meta.requiresLogin !== false
        },
        isEmailVerificationPage () {
            // This is the one page a user with email_verified === false is allowed
            // to access (so that they can get verified)
            return this.$route.name === 'VerifyEmail'
        },
        isModalPage () {
            return !!this.$route.meta.modal
        },
        termsAndConditionsRequired () {
            if (!this.user || !this.settings || !this.settings['user:tcs-required']) {
                return false
            }
            const platformTcsDate = this.settings['user:tcs-date']
            const userTcsDate = this.user.tcs_accepted
            if (!userTcsDate && !platformTcsDate) {
                // assume existing installation, don't ask existing user unless platformTcsDate has been updated
                return false
            }
            if (!userTcsDate && platformTcsDate) {
                // platform has T&C date, user has not - needs to (re) accept
                return true
            }
            return platformTcsDate > userTcsDate
        }
    },
    components: {
        Login,
        PasswordExpired,
        UnverifiedEmail,
        TermsAndConditions,
        Loading,
        Offline,
        'ff-layout-platform': FFLayoutPlatform,
        'ff-layout-box': FFLayoutBox
    },
    mounted () {
        this.$store.dispatch('account/checkState')
    }
}
</script>

<style lang="scss">
@import "./stylesheets/common.scss";
</style>
