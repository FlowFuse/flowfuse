<template>
        <FormRow id="login-username" :error="errors.username" v-model="input.username" :onEnter="focusPassword">Username</FormRow>
        <FormRow id="login-password" type="password" :error="errors.password" v-model="input.password" :onEnter="login">Password</FormRow>
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

            <div v-if="settings['user:signup']" class="mt-4 text-xs text-center">
                <router-link class="forge-button-secondary" to="/account/create">Sign up</router-link>
            </div>

        </div>
        <!-- TODO
        <div class="text-sm">
            <a href="#" class="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot your password?
            </a>
        </div>
        -->
</template>

<script>
import { mapState } from 'vuex'
import FormRow from '@/components/FormRow'
import { LockClosedIcon } from '@heroicons/vue/outline'

export default {
    name: "AuthCredentials",
    computed:mapState('account',['settings', 'loginError']),
    data() {
        return {
            input: {
                username: "",
                password: "",
                remember: false
            },
            errors: {
                username: null,
                password: null
            }
        }
    },
    methods: {
        login() {
            let valid = true;
            this.errors.username = "";
            this.errors.password = "";
            if (this.input.username === "") {
                valid = false;
                this.errors.username = "Required field"
            }
            if (this.input.password === "") {
                valid = false;
                this.errors.password = "Required field"
            }
            if (valid) {
                this.$store.dispatch('account/login',this.input);
            }
        },
        focusUsername() {
            document.getElementById("login-username").focus();
        },
        focusPassword() {
            document.getElementById("login-password").focus();
        }
    },
    mounted() {
        this.focusUsername();
    },
    watch: {
        loginError(newError, oldError) {
            this.focusUsername();
            this.errors.username = "Login failed"
        }
    },
    components: {
        LockClosedIcon,
        FormRow
    }
}
</script>
