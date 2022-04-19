<template>
    <div class="ff-login">
        <div class="ff-login-wrapper">
            <!-- Login Box -->
            <AuthCredentials v-if="!pending"/>
            <div v-else>
                <div class="flex justify-center">
                    <div class="w-1/2"><Logo /></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Logo from '@/components/Logo'
import AuthCredentials from '@/components/auth/Credentials'
import { LockClosedIcon } from '@heroicons/vue/outline'

export default {
    name: 'LoginPage',
    data () {
        return {
            authMode: 'select'
        }
    },
    methods: {
        selectCredentials () {
            this.authMode = 'credentials'
        }
    },
    computed: mapState('account', ['settings', 'pending']),
    components: {
        Logo,
        LockClosedIcon,
        AuthCredentials
    }
}
</script>

<style lang="scss">
@import "@/stylesheets/pages/login.scss";
</style>
