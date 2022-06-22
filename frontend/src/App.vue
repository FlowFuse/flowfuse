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
        <template v-else-if="user && !user.password_expired">
            <ff-layout-platform>
                <router-view></router-view>
            </ff-layout-platform>
        </template>
        <!-- Password Reset Required -->
        <template v-else-if="user && user.password_expired">
            <PasswordExpired/>
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

import FFLayoutPlatform from '@/layouts/Platform.vue'

export default {
    name: 'App',
    computed: {
        ...mapState('account', ['pending', 'user', 'team', 'offline']),
        loginRequired () {
            return this.$route.meta.requiresLogin !== false
        }
    },
    components: {
        Login,
        PasswordExpired,
        Loading,
        Offline,
        'ff-layout-platform': FFLayoutPlatform
    },
    mounted () {
        this.$store.dispatch('account/checkState')
        this.$store.dispatch('account/countNotifications')
    }
}
</script>

<style lang="scss">
@import "./stylesheets/common.scss";
</style>
