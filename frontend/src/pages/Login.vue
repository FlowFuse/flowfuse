<template>
    <ff-layout-box class="ff-login">
        <div v-if="!pending" data-form="login">
            <ff-loading v-if="loggingIn" :message="$t('auth.loggingIn')" color="white" />
            <template v-else-if="!mfaRequired">
                <label>{{ $t('auth.username') }}</label>
                <ff-text-input
                    ref="login-username"
                    v-model="input.username"
                    autocomplete="username"
                    label="username"
                    :error="errors.username"
                    data-el="login-username"
                    @enter="login"
                />
                <span class="ff-error-inline" data-el="errors-username">{{ errors.username }}</span>
                <div v-if="passwordRequired">
                    <label>{{ $t('auth.password') }}</label>
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
                        <span>{{ $t('auth.login') }}</span>
                        <span v-if="loggingIn || tooManyRequests" class="w-4">
                            <SpinnerIcon class="ff-icon ml-3 !w-3.5" />
                        </span>
                    </ff-button>
                    <ff-button v-if="settings['user:signup']" kind="tertiary" to="/account/create" data-action="sign-up">{{ $t('auth.signup') }}</ff-button>
                    <ff-button v-if="passwordRequired && settings['user:reset-password']" kind="tertiary" :to="{'name': 'ForgotPassword'}" data-action="forgot-password">{{ $t('auth.forgotPassword') }}</ff-button>
                    <template v-if="googleSSOEnabled">
                        <hr class="mb-4">
                        <GoogleLogin class="w-full" :client-id="settings['platform:sso:google:clientId']" popup-type="TOKEN" :callback="ggCallback">
                            <ff-button class="w-full space-x-2" kind="secondary" data-action="google-login" :disabled="loggingIn">
                                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yMy41MiAxMi4yNzI3QzIzLjUyIDExLjQyMTggMjMuNDQzNiAxMC42MDM2IDIzLjMwMTggOS44MTgxNkgxMlYxNC40NkgxOC40NTgyQzE4LjE4IDE1Ljk2IDE3LjMzNDUgMTcuMjMwOSAxNi4wNjM2IDE4LjA4MThWMjEuMDkyN0gxOS45NDE4QzIyLjIxMDkgMTkuMDAzNiAyMy41MiAxNS45MjczIDIzLjUyIDEyLjI3MjdaIiBmaWxsPSIjNDI4NUY0Ii8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTIgMjRDMTUuMjQgMjQgMTcuOTU2NCAyMi45MjU1IDE5Ljk0MTggMjEuMDkyN0wxNi4wNjM3IDE4LjA4MThDMTQuOTg5MSAxOC44MDE4IDEzLjYxNDYgMTkuMjI3MyAxMiAxOS4yMjczQzguODc0NTYgMTkuMjI3MyA2LjIyOTExIDE3LjExNjQgNS4yODU0NyAxNC4yOEgxLjI3NjM4VjE3LjM4OTFDMy4yNTA5MyAyMS4zMTA5IDcuMzA5MTEgMjQgMTIgMjRaIiBmaWxsPSIjMzRBODUzIi8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNNS4yODU0NSAxNC4yOEM1LjA0NTQ1IDEzLjU2IDQuOTA5MDkgMTIuNzkwOSA0LjkwOTA5IDEyQzQuOTA5MDkgMTEuMjA5MSA1LjA0NTQ1IDEwLjQ0IDUuMjg1NDUgOS43MTk5OFY2LjYxMDg5SDEuMjc2MzZDMC40NjM2MzYgOC4yMzA4OSAwIDEwLjA2MzYgMCAxMkMwIDEzLjkzNjMgMC40NjM2MzYgMTUuNzY5MSAxLjI3NjM2IDE3LjM4OTFMNS4yODU0NSAxNC4yOFoiIGZpbGw9IiNGQkJDMDUiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiA0Ljc3MjczQzEzLjc2MTggNC43NzI3MyAxNS4zNDM3IDUuMzc4MTggMTYuNTg3MyA2LjU2NzI3TDIwLjAyOTEgMy4xMjU0NUMxNy45NTA5IDEuMTg5MDkgMTUuMjM0NiAwIDEyIDBDNy4zMDkxMSAwIDMuMjUwOTMgMi42ODkwOSAxLjI3NjM4IDYuNjEwOTFMNS4yODU0NyA5LjcyQzYuMjI5MTEgNi44ODM2NCA4Ljg3NDU2IDQuNzcyNzMgMTIgNC43NzI3M1oiIGZpbGw9IiNFQTQzMzUiLz4KPC9zdmc+Cg==" class="ml-2">
                                <span>{{ $t('auth.signInWithGoogle') }}</span>
                                <span v-if="loggingIn || tooManyRequests" class="w-4">
                                    <SpinnerIcon class="ff-icon ml-3 !w-3.5" />
                                </span>
                            </ff-button>
                        </GoogleLogin>
                        <span class="ff-error-inline" data-el="errors-googleSSO">{{ errors.googleSSO }}</span>
                    </template>
                </div>
            </template>
            <template v-else>
                <label>{{ $t('auth.securityCodePrompt') }}</label>
                <ff-text-input ref="login-mfa-token" v-model="input.token" maxlength="6" label="token" @enter="submitMFAToken" />
                <div class="ff-actions">
                    <ff-button data-action="submit-token" :disabled="loggingIn || tokenInvalid" @click="submitMFAToken()">
                        <span>{{ $t('auth.continue') }}</span>
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
import { GoogleLogin } from 'vue3-google-login'

import { mapState } from 'vuex'

import SSOApi from '../api/sso.js'
import Logo from '../components/Logo.vue'
import SpinnerIcon from '../components/icons/Spinner.js'

import FFLayoutBox from '../layouts/Box.vue'

export default {
    name: 'LoginPage',
    components: {
        GoogleLogin,
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
                password: null,
                googleSSO: null
            }
        }
    },
    computed: {
        ...mapState('account', ['settings', 'pending', 'loginError', 'redirectUrlAfterLogin']),
        tokenInvalid () {
            return this.mfaRequired && !/^\d{6}$/.test(this.input.token)
        },
        googleSSOEnabled () {
            return this.settings['platform:sso:google'] && this.settings['platform:sso:google:clientId']
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
                this.errors.general = this.$t('auth.errors.loginFailed')
            } else if (newError.statusCode === 429) {
                this.loggingIn = false
                await this.$nextTick()
                this.focusUsername()
                this.errors.general = this.$t('auth.errors.tooManyAttempts')
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
                this.errors.username = this.$t('auth.errors.requiredField')
            }
            if (this.passwordRequired && this.input.password === '') {
                valid = false
                this.errors.password = this.$t('auth.errors.requiredField')
            }
            if (this.input.password.length > 1024) {
                valid = false
                this.errors.password = this.$t('auth.errors.tooLong')
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
        },
        async ggCallback (response) {
            const result = await SSOApi.googleSSOCallback(response.access_token)
            if (result.url) {
                window.location = result.url
            } else if (result.error) {
                this.errors.googleSSO = result.error
            } else {
                // Handle error response - not sure what this will look like yet
                console.error(result)
            }
        }
    }
}
</script>

<style lang="scss">
@import "../stylesheets/pages/login.scss";
</style>
