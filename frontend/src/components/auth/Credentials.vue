<template>
    <FormRow ref="login-username" :error="errors.username" v-model="input.username" @enter="focusPassword">Username</FormRow>
    <FormRow ref="login-password" type="password" :error="errors.password" v-model="input.password" @enter="login">Password</FormRow>
    <div class="flex flex-col justify-between">
        <div class="flex items-center">
            <input id="remember_me" name="remember_me" v-model="input.remember" type="checkbox" class="h-4 w-4 text-indigo-600  focus:ring-blue-700 border-gray-300 rounded" />
            <label for="remember_me" class="ml-2 block text-sm text-gray-900">
                Remember me
            </label>
        </div>
    </div>

    <div>
        <ff-button @click.prevent="login()" class="m-auto w-full" size="full-width">
            <template v-slot:icon-left><LockClosedIcon aria-hidden="true" /></template>
            Sign in
        </ff-button>

        <ff-button v-if="settings['user:reset-password']" class="m-auto mt-4 text-center" kind="tertiary" size="small" :to="{'name': 'ForgotPassword'}">
            Forgot your password?
        </ff-button>

        <ff-button v-if="settings['user:signup']" class="m-auto mt-4" kind="secondary" size="small" to="/account/create">
            Sign up
        </ff-button>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import FormRow from '@/components/FormRow'
import { LockClosedIcon } from '@heroicons/vue/outline'

export default {
    name: 'AuthCredentials',
    computed: mapState('account', ['settings', 'loginError']),
    data () {
        return {
            input: {
                username: '',
                password: '',
                remember: false
            },
            errors: {
                username: null,
                password: null
            }
        }
    },
    methods: {
        login () {
            let valid = true
            this.errors.username = ''
            this.errors.password = ''
            if (this.input.username === '') {
                valid = false
                this.errors.username = 'Required field'
            }
            if (this.input.password === '') {
                valid = false
                this.errors.password = 'Required field'
            }
            if (valid) {
                this.$store.dispatch('account/login', this.input)
            }
        },
        focusUsername () {
            this.$refs['login-username'].$el.focus()
        },
        focusPassword () {
            this.$refs['login-password'].$el.focus()
        }
    },
    async mounted () {
        await this.$nextTick()
        this.focusUsername()
    },
    watch: {
        loginError (newError, oldError) {
            this.focusUsername()
            this.errors.username = 'Login failed'
        }
    },
    components: {
        LockClosedIcon,
        FormRow
    }
}
</script>
