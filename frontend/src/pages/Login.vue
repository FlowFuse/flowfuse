<template>
    <ff-layout-box class="ff-login">
        <div v-if="!pending">
            <ff-loading v-if="loggingIn" message="Logging in..." color="white"/>
            <template v-else>
                <div>
                    <label>username / email</label>
                    <ff-text-input ref="login-username" label="username" :error="errors.username" v-model="input.username" @enter="focusPassword"/>
                    <label class="ff-error-inline" data-el="errors-username">{{ errors.username }}</label>
                    <div v-if="passwordRequired">
                        <label>password</label>
                        <ff-text-input ref="login-password" label="password" :error="errors.password" v-model="input.password" @enter="login" type="password"/>
                        <label class="ff-error-inline" data-el="errors-password">{{ errors.password }}</label>
                    </div>
                </div>
                <label class="ff-error-inline" data-el="errors-general">{{ errors.general }}</label>
                <div class="ff-actions">
                    <ff-button @click="login()" data-action="login">Login</ff-button>
                    <ff-button v-if="settings['user:signup']" kind="tertiary" to="/account/create" data-action="sign-up">Sign Up</ff-button>
                    <ff-button v-if="passwordRequired && settings['user:reset-password']" kind="tertiary" :to="{'name': 'ForgotPassword'}" data-action="forgot-password">Forgot your password?</ff-button>
                </div>
            </template>
        </div>
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

import FFLayoutBox from '@/layouts/Box'

export default {
    name: 'LoginPage',
    data () {
        return {
            loggingIn: false,
            passwordRequired: false,
            input: {
                username: '',
                password: ''
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
            if (this.passwordRequired && this.input.password === '') {
                valid = false
                this.errors.password = 'Required field'
            }
            if (this.input.password.length > 1024) {
                valid = false
                this.errors.password = 'Too long'
            }
            if (valid) {
                this.loggingIn = true
                this.$store.dispatch('account/login', this.input)
            }
        },
        focusUsername () {
            this.$refs['login-username'].focus()
        },
        focusPassword () {
            this.$refs['login-password'].focus()
        }
    },
    computed: {
        ...mapState('account', ['settings', 'pending', 'loginError'])
    },
    async mounted () {
        await this.$nextTick()
        this.focusUsername()
    },
    watch: {
        async loginError (newError, oldError) {
            this.errors.general = ''
            this.errors.username = ''
            this.errors.password = ''
            if (newError.code === 'password_required') {
                this.loggingIn = false
                this.passwordRequired = true
                await this.$nextTick()
                this.focusPassword()
            } else if (newError.code === 'sso_required') {
                this.passwordRequired = false
                this.input.password = ''
                if (newError.redirect) {
                    window.location = newError.redirect
                } else {
                    this.loggingIn = false
                    await this.$nextTick()
                    this.focusUsername()
                    this.errors.username = newError.error
                }
            } else if (newError.code === 'unauthorized') {
                this.loggingIn = false
                await this.$nextTick()
                this.focusUsername()
                this.errors.general = 'Login failed'
            } else {
                this.loggingIn = false
                await this.$nextTick()
                this.focusUsername()
                this.errors.general = newError?.error
            }
        }
    },
    components: {
        Logo,
        'ff-layout-box': FFLayoutBox
    }
}
</script>

<style lang="scss">
@import "@/stylesheets/pages/login.scss";
</style>
