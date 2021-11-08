<template>
    <div class="min-h-screen flex flex-col bg-gray-300 ">
        <template v-if="user && !user.password_expired">
            <PageHeader />
            <main class="flex-grow flex flex-col">
                <div class="max-w-7xl mx-2 sm:mx-6 my-2 sm:my-8 flex-grow flex flex-col">
                    <router-view></router-view>
                </div>
            </main>
        </template>
        <template v-else-if="user && user.password_expired">
            <PasswordExpired/>
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
import PageFooter from "@/components/PageFooter.vue"
import PageHeader from "@/components/PageHeader.vue"
import Login from "@/pages/Login.vue"
import PasswordExpired from "@/pages/PasswordExpired.vue"

export default {
    name: 'App',
    computed: mapState('account',['user','team']),
    components: {
        PageFooter,
        PageHeader,
        Login,
        PasswordExpired
    },
    mounted() {
        this.$store.dispatch('account/checkState');
    }

}
</script>
