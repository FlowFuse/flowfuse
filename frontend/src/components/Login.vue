<template>
    <div class="mx-auto min-h-screen flex items-center justify-center bg-gray-50 py-12">
        <div class="sm:w-72 w-xs w-screen space-y-2">
            <template v-if="!pending">
                <div class="max-w-xs mx-auto w-full">
                    <Logo/>
                    <h2 class="mt-2 text-center text-3xl font-bold text-gray-900">
                        <span>FLOW</span><span class="font-light">FORGE</span>
                    </h2>
                </div>
                <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
                    <input type="hidden" name="remember" value="true" />
                    <div class="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label for="username" class="sr-only">Username</label>
                            <input id="username" v-model="input.username" name="username" required="" class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none  focus:ring-blue-700 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Username" />
                        </div>
                        <div>
                            <label for="password" class="sr-only">Password</label>
                            <input id="password" v-model="input.password" name="password" type="password" autocomplete="current-password" required="" class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none  focus:ring-blue-700 focus:border-indigo-500 focus:z-10 sm:text-sm" placeholder="Password" @keyup.enter.native="login"/>
                        </div>
                    </div>

                    <div class="flex flex-col justify-between">
                        <div class="flex items-center">
                            <input id="remember_me" name="remember_me" v-model="input.remember" type="checkbox" class="h-4 w-4 text-indigo-600  focus:ring-blue-700 border-gray-300 rounded" />
                            <label for="remember_me" class="ml-2 block text-sm text-gray-900">
                                Remember me
                            </label>
                        </div>
                    </div>

                    <div>
                        <button type="button" @click="login" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700">
                            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                                <LockClosedIcon class="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
                            </span>
                            Sign in
                        </button>
                    </div>
<!-- TODO
                    <div class="text-sm">
                        <a href="#" class="font-medium text-indigo-600 hover:text-indigo-500">
                            Forgot your password?
                        </a>
                    </div>
-->
                </form>
            </template>
            <template v-else>
                <div class="flex justify-center">
                    <div class="w-1/2"><Logo /></div>
                </div>
            </template>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Logo from "@/components/Logo"
import { LockClosedIcon } from '@heroicons/vue/outline'

export default {
    name: "Login",
    computed: mapState('account',['pending']),
    data() {
        return {
            input: {
                username: "",
                password: "",
                remember: false
            }
        }
    },
    methods: {
        login() {
            this.$store.dispatch('account/login',this.input);
        }
    },
    components: {
        Logo,
        LockClosedIcon,
    }
}
</script>
