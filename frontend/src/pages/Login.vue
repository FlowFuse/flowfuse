<template>
    <ff-layout-box class="ff-login">
        <AuthCredentials v-if="!pending"/>
        <div v-else>
            <div class="flex justify-center">
                <div class="w-1/2"><Logo /></div>
            </div>
        </div>
    </ff-layout-box>
</template>

<script>
import { mapState } from 'vuex'
import Logo from '@/components/Logo'
import AuthCredentials from '@/components/auth/Credentials'

import FFLayoutBox from '@/layouts/Box'

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
        AuthCredentials,
        'ff-layout-box': FFLayoutBox
    }
}
</script>

<style lang="scss">
@import "@/stylesheets/pages/login.scss";
</style>
