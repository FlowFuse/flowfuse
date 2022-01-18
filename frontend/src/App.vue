<template>
    <div class="min-h-screen flex flex-col bg-gray-300 ">
        <template v-if="offline">
            <main class="flex-grow flex flex-col">
                <div class="w-full max-w-screen-2xl mx-auto my-2 sm:my-8 flex-grow flex flex-col">
                    <Offline />
                </div>
            </main>
        </template>
        <template v-else-if="pending">
            <main class="flex-grow flex flex-col">
                <div class="w-full max-w-screen-2xl mx-auto my-2 sm:my-8 flex-grow flex flex-col">
                    <Loading />
                </div>
            </main>
        </template>
        <template v-else-if="user && !user.password_expired">
            <PageHeader />
            <main class="flex-grow flex flex-col">
                <div class="w-full max-w-screen-2xl mx-auto my-2 sm:my-8 flex-grow flex flex-col">
                    <router-view></router-view>
                </div>
            </main>
        </template>
        <template v-else-if="user && user.password_expired">
            <PasswordExpired/>
        </template>
        <template v-else-if="!loginRequired">
            <router-view></router-view>
        </template>
        <template v-else>
            <Login/>
        </template>
        <div class="w-full bg-gray-800 flex-grow-0">
            <PageFooter />
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import { useRouter } from 'vue-router';
import router from "@/routes"
import PageFooter from "@/components/PageFooter.vue"
import PageHeader from "@/components/PageHeader.vue"
import Login from "@/pages/Login.vue"
import Loading from '@/components/Loading';
import Offline from '@/components/Offline';
import PasswordExpired from "@/pages/PasswordExpired.vue"

export default {
    name: 'App',
    computed: {
        ...mapState('account',['pending','user','team','offline']),
        loginRequired() {
            return this.$route.meta.requiresLogin !== false
        }
    },
    components: {
        PageFooter,
        PageHeader,
        Login,
        PasswordExpired,
        Loading,
        Offline
    },
    mounted() {
        this.$store.dispatch('account/checkState');
    }
}
</script>
