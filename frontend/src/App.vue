<template>
    <div class="flex flex-no-wrap bg-gray-200 h-screen">
        <template v-if="user">
            <Sidebar/>
            <div class="w-full flex overflow-hidden">
                <div class="w-full overflow-y-scroll">
                    <Navbar />
                    <main>
                        <div class="max-w-6xl mx-auto">
                            <div class="mx-2 sm:mx-8 my-2 sm:my-8 bg-white py-6 px-2 sm:px-6 lg:px-8 shadow rounded">
                                <router-view></router-view>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </template>
        <template v-else>
            <Login/>
        </template>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Sidebar from "@/components/Sidebar.vue"
import Navbar from "@/components/Navbar.vue"
import Login from "@/components/Login.vue"

export default {
    name: 'App',
    computed: mapState('account',['user']),
    components: {
        Sidebar,
        Navbar,
        Login
    },
    created() {
        this.$store.dispatch('account/checkState');
    }

}
</script>
