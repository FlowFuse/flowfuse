<template>
    <div>
        <div>
            <label>username</label>
            <ff-text-input ref="login-username" label="username" :error="errors.username" v-model="input.username" @enter="focusPassword"/>
            <label class="ff-error-inline">{{ errors.username }}</label>
            <label>password</label>
            <ff-text-input ref="login-password" label="password" :error="errors.password" v-model="input.password" @enter="login" type="password"/>
            <label class="ff-error-inline">{{ errors.password }}</label>
        </div>
        <div>
            <ff-checkbox v-model="input.remember" label="Remember Me"></ff-checkbox>
        </div>
        <label class="ff-error-inline">{{ errors.general }}</label>
        <div class="ff-actions">
            <ff-button @click="login()">Login</ff-button>
            <ff-button v-if="settings['user:signup']" kind="tertiary" to="/account/create">Sign Up</ff-button>
            <ff-button v-if="settings['user:reset-password']" kind="tertiary" :to="{'name': 'ForgotPassword'}">Forgot your password?</ff-button>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

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
                general: null,
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
            if (this.input.username.includes('@')) {
                valid = false
                this.errors.username = 'Username cannot be an email address'
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
            this.errors.general = 'Login failed'
        }
    }
}
</script>
