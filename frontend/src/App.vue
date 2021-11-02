<template>
    <div class="min-h-screen flex flex-col bg-gray-300 ">
        <div class="flex-grow">
            <template v-if="user">
                <Navbar />
                <main>
                    <div class="max-w-7xl mx-2 sm:mx-6 my-2 sm:my-8">
                        <router-view></router-view>
                    </div>
                </main>
            </template>
            <template v-else>
                <Login/>
            </template>
        </div>
        <div class="w-full bg-gray-800 flex-grow-0">
            <Footer />
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Footer from "@/components/Footer.vue"
import Navbar from "@/components/Navbar.vue"
import Login from "@/pages/Login.vue"

export default {
    name: 'App',
    computed: mapState('account',['user','team']),
    components: {
        Footer,
        Navbar,
        Login,
    },
    mounted() {
        this.$store.dispatch('account/checkState');
    }

}
</script>
