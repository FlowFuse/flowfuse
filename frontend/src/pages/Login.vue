<template>
    <ff-layout-box class="ff-login">
        <div v-if="!pending">
            <ff-loading v-if="loggingIn" message="Logging in..." color="white" />
            <template v-else>
                <div v-if="isSSORequired">
                    <label>Single Sign-On Authentication</label>
                    <ff-button @click="redirectToSSO">Login with SSO</ff-button>
                </div>
                <div v-else>
                    <label>username / email</label>
                    <ff-text-input ref="login-username" v-model="input.username" label="username" :error="errors.username" @enter="login" />
                    <span class="ff-error-inline" data-el="errors-username">{{ errors.username }}</span>
                    <div v-if="passwordRequired">
                        <label>password</label>
                        <ff-text-input ref="login-password" v-model="input.password" label="password" :error="errors.password" type="password" @enter="login" />
                        <span class="ff-error-inline" data-el="errors-password">{{ errors.password }}</span>
                    </div>
                    <label class="ff-error-inline" data-el="errors-general">{{ errors.general }}</label>
                    <div class="ff-actions">
                        <ff-button data-action="login" :disabled="loggingIn || tooManyRequests" @click="login">
                            <span>Login</span>
                            <span class="w-4">
                                <SpinnerIcon v-if="loggingIn || tooManyRequests" class="ff-icon ml-3 !w-3.5" />
                            </span>
                        </ff-button>
                        <ff-button v-if="settings['user:signup']" kind="tertiary" to="/account/create" data-action="sign-up">Sign Up</ff-button>
                        <ff-button v-if="passwordRequired && settings['user:reset-password']" kind="tertiary" :to="{'name': 'ForgotPassword'}" data-action="forgot-password">Forgot your password?</ff-button>
                    </div>
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

const queryParams = new URLSearchParams(window.location.search)

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
            passwordRequired: false,
            tooManyRequests: false,
            input: {
                username: '',
                password: ''
            },
            errors: {
                general: null,
                username: null,
                password: null
            },
            ssoUrl: null
        }
    },
    computed: {
        ...mapState('account', ['settings', 'pending', 'loginError', 'redirectUrlAfterLogin']),
        isSSORequired () {
            return this.ssoUrl !== null
        }
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
            } else if (newError.code === 'unauthorized') {
                this.loggingIn = false
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
        await this.fetchSSOUrl()
        await this.$nextTick()
        this.focusUsername()
    },
    methods: {
        async fetchSSOUrl () {
            try {
                const response = await fetch('/ee/sso/auth-settings')
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText)
                }
                const data = await response.json()
                const loginLocal = queryParams.get('login') === 'local'

                if (data.ssoRedirect && !loginLocal) {
                    window.location.href = '/ee/sso/login?u=' + data.domainFilter
                    // this.ssoRedirectUrl = '/ee/sso/login?u=' + data.domainFilter
                }
            } catch (error) {
                console.error('Error fetching SSO URL:', error)
                this.errors.general = 'Failed to fetch SSO URL'
            }
        },
        redirectToSSO () {
            window.location.href = this.ssoUrl
        },
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
    }
}
</script>

  <style lang="scss">
  @import "../stylesheets/pages/login.scss";
  </style>
