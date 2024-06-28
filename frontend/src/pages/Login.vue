<template>
    <ff-layout-box class="ff-login">
        <div v-if="!pending" data-form="login">
            <ff-loading v-if="loggingIn" message="Logging in..." color="white" />
            <template v-else-if="!mfaRequired">
                <label>username / email</label>
                <ff-text-input
                    ref="login-username"
                    v-model="input.username"
                    label="username"
                    :error="errors.username"
                    data-el="login-username"
                    @enter="login"
                />
                <span class="ff-error-inline" data-el="errors-username">{{ errors.username }}</span>
                <div v-if="passwordRequired">
                    <label>password</label>
                    <ff-text-input
                        ref="login-password"
                        v-model="input.password"
                        label="password"
                        :error="errors.password"
                        type="password"
                        data-el="login-password"
                        @enter="login"
                    />
                    <span class="ff-error-inline" data-el="errors-password">{{ errors.password }}</span>
                </div>
                <label class="ff-error-inline" data-el="errors-general">{{ errors.general }}</label>
                <div class="ff-actions">
                    <ff-button data-action="login" :disabled="loggingIn || tooManyRequests" @click="login()">
                        <span>Login</span>
                        <span class="w-4">
                            <SpinnerIcon v-if="loggingIn || tooManyRequests" class="ff-icon ml-3 !w-3.5" />
                        </span>
                    </ff-button>
                    <ff-button v-if="settings['user:signup']" kind="tertiary" to="/account/create" data-action="sign-up">Sign Up</ff-button>
                    <ff-button v-if="passwordRequired && settings['user:reset-password']" kind="tertiary" :to="{'name': 'ForgotPassword'}" data-action="forgot-password">Forgot your password?</ff-button>
                </div>
            </template>
            <template v-else>
                <label>Enter the 6-digit security code from your authenticator app</label>
                <ff-text-input ref="login-mfa-token" v-model="input.token" maxlength="6" label="token" @enter="submitMFAToken" />
                <div class="ff-actions">
                    <ff-button data-action="submit-token" :disabled="loggingIn || tokenInvalid" @click="submitMFAToken()">
                        <span>Continue</span>
                        <span class="w-4">
                            <SpinnerIcon v-if="loggingIn" class="ff-icon ml-3 !w-3.5" />
                        </span>
                    </ff-button>
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

import Logo from '../components/Logo.vue'
import SpinnerIcon from '../components/icons/Spinner.js'

import FFLayoutBox from '../layouts/Box.vue'

export default {
    name: 'LoginPage',
    components: {
        Logo,
        SpinnerIcon,
        'ff-layout-box': FFLayoutBox
    },
    data () {
        return {
            loggingIn: false,
            mfaRequired: false,
            passwordRequired: false,
            tooManyRequests: false,
            input: {
                username: '',
                password: '',
                token: ''
            },
            errors: {
                general: null,
                username: null,
                password: null
            }
        }
    },
    computed: {
        ...mapState('account', ['settings', 'pending', 'loginError', 'redirectUrlAfterLogin']),
        tokenInvalid () {
            return this.mfaRequired && !/^\d{6}$/.test(this.input.token)
        }
    },
    watch: {
        async loginError (newError, oldError) {
            this.errors.general = ''
            this.errors.username = ''
            this.errors.password = ''
            this.input.password = ''
            if (newError.code === 'password_required') {
                this.loggingIn = false
                this.passwordRequired = true
                await this.$nextTick()
                this.focusPassword()
            } else if (newError.code === 'sso_required') {
                this.passwordRequired = false
                this.input.password = ''
                if (newError.redirect) {
                    let redirectPath = newError.redirect
                    if (this.redirectUrlAfterLogin !== '/') {
                        redirectPath += '&r=' + encodeURIComponent(this.redirectUrlAfterLogin)
                    }
                    window.location = redirectPath
                } else {
                    this.loggingIn = false
                    await this.$nextTick()
                    this.focusUsername()
                    this.errors.username = newError.error
                }
            } else if (newError.code === 'mfa_required') {
                this.input.token = ''
                this.mfaRequired = true
                this.loggingIn = false
                await this.$nextTick()
                this.focusToken()
            } else if (newError.code === 'unauthorized') {
                this.loggingIn = false
                this.mfaRequired = false
                await this.$nextTick()
                this.focusUsername()
                this.errors.general = 'Login failed'
            } else if (newError.statusCode === 429) {
                this.loggingIn = false
                await this.$nextTick()
                this.focusUsername()
                this.errors.general = 'Too many login attempts. Try again later.'
                this.tooManyRequests = true
                setTimeout(() => {
                    this.tooManyRequests = false
                }, 10000)
            } else {
                this.loggingIn = false
                await this.$nextTick()
                this.focusUsername()
                this.errors.general = newError?.error
            }
        }
    },
    async mounted () {
        await this.$nextTick()
        this.focusUsername()
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
                this.$store.dispatch('account/login', {
                    username: this.input.username,
                    password: this.input.password
                })
            }
        },
        submitMFAToken () {
            this.loggingIn = true
            this.$store.dispatch('account/login', {
                token: this.input.token
            })
        },
        focusUsername () {
            this.$refs['login-username'].focus()
        },
        focusPassword () {
            this.$refs['login-password'].focus()
        },
        focusToken () {
            this.$refs['login-mfa-token'].focus()
        }
    }
}
</script>

<style lang="scss">
@import "../stylesheets/pages/login.scss";
</style>
