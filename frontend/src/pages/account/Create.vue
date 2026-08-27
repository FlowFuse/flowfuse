<!-- eslint-disable vue/no-v-html -->

<template>
    <ff-layout-box class="ff-signup ff--center-box">
        <template v-if="splash && !isPopup" #splash-content>
            <div data-el="splash" v-html="splash" />
        </template>
        <form v-if="!ssoCreated" id="ff-sign-up" class="max-w-md m-auto" @submit.prevent="registerUser()">
            <p
                v-if="settings['branding:account:signUpTopBanner']"
                data-el="banner-text"
                class="text-center -mt-6 pb-4 text-gray-400"
                v-html="settings['branding:account:signUpTopBanner']"
            />
            <div>
                <label>{{ $t('common.fields.username') }}</label>
                <ff-text-input ref="signup-username" v-model="input.username" data-form="signup-username" label="username" :error="showErrors.username ? errors.username : ''" />
                <span class="ff-error-inline">{{ showErrors.username ? errors.username : '' }}</span>
                <label>{{ $t('common.fields.fullName') }}</label>
                <ff-text-input ref="signup-fullname" v-model="input.name" data-form="signup-fullname" label="Full Name" :error="showErrors.name ? errors.name : ''" />
                <span class="ff-error-inline">{{ showErrors.name ? errors.name : '' }}</span>
                <label>{{ $t('common.fields.email') }}</label>
                <ff-text-input ref="signup-email" v-model="input.email" data-form="signup-email" label="E-Mail Address" :error="showErrors.email ? errors.email : ''" />
                <span class="ff-error-inline">{{ showErrors.email ? errors.email : '' }}</span>
                <label>{{ $t('common.fields.password') }}</label>
                <ff-text-input ref="signup-password" v-model="input.password" data-form="signup-password" label="password" :error="showErrors.password ? errors.password : ''" type="password" />
                <span class="ff-error-inline">{{ showErrors.password ? errors.password : '' }}</span>
                <label>{{ $t('common.fields.confirmPassword') }}</label>
                <ff-text-input ref="signup-repeat-password" v-model="input.repeatPassword" data-form="signup-repeat-password" label="Confirm Password" :error="showErrors.repeatPassword ? errors.repeatPassword : ''" type="password" />
                <span class="ff-error-inline">{{ showErrors.repeatPassword ? errors.repeatPassword : '' }}</span>
            </div>
            <div v-if="askJoinReason" class="pt-3">
                <ff-radio-group
                    v-model="input.join_reason"
                    :label="$t('auth.signUp.joinReason')"
                    orientation="grid"
                    data-form="signup-join-reason"
                    :options="reasons"
                />
            </div>
            <div v-if="settings['user:tcs-required']" class="pt-3">
                <ff-checkbox v-model="input.tcs_accepted" data-form="signup-accept-tcs">
                    <i18n-t keypath="auth.signUp.tcs" tag="span" scope="global">
                        <template #termsLink>
                            <a target="_blank" :href="settings['user:tcs-url']">{{ $t('auth.signUp.tcsLink') }}</a>
                        </template>
                    </i18n-t>
                </ff-checkbox>
            </div>
            <label v-if="errors.general" class="pt-3 ff-error-inline">{{ errors.general }}</label>
            <div class="ff-actions pt-2">
                <ff-button type="submit" :disabled="!formValid || busy || tooManyRequests" data-action="sign-up">
                    <span>{{ $t('common.actions.signUp') }}</span>
                    <span class="w-4">
                        <SpinnerIcon v-if="busy || tooManyRequests" class="ff-icon ml-3 w-3.5!" />
                    </span>
                </ff-button>
                <GoogleLoginButton :label="$t('auth.signUp.signUpWithGoogle')" :disabled="busy" />
                <p class="flex text-gray-400 font-light mt-6 gap-2 w-full justify-center">
                    <i18n-t keypath="auth.signUp.alreadyRegistered" tag="span" scope="global">
                        <template #loginLink>
                            <a href="/" data-action="login">{{ $t('auth.signUp.loginHere') }}</a>
                        </template>
                    </i18n-t>
                </p>
            </div>
        </form>
        <div v-else-if="ssoCreated">
            <p>{{ $t('auth.signUp.ssoCreated') }}</p>
            <ff-button :to="{ name: 'home' }" data-action="login">{{ $t('common.actions.login') }}</ff-button>
        </div>
    </ff-layout-box>
</template>

<script>

import { mapState } from 'pinia'
import { useRoute } from 'vue-router'

import userApi from '../../api/user.js'

import GoogleLoginButton from '../../components/GoogleLoginButton.vue'
import SpinnerIcon from '../../components/icons/Spinner.js'
import FFLayoutBox from '../../layouts/Box.vue'
import { handoffFromPopup, isPopupContext } from '../../utils/popupContext.js'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'

let zxcvbn

export default {
    name: 'AccountCreate',
    components: {
        'ff-layout-box': FFLayoutBox,
        GoogleLoginButton,
        SpinnerIcon
    },
    data () {
        return {
            busy: false,
            tooManyRequests: false,
            // flags to prevent showing errors until user has interacted with the form elements
            showErrors: {
                username: false,
                email: false,
                password: false,
                repeatPassword: false,
                name: false
            },
            teams: [],
            ssoCreated: false,
            input: {
                name: '',
                username: '',
                email: '',
                password: '',
                repeatPassword: '',
                join_reason: null,
                tcs_accepted: false,
                code: ''
            },
            errors: {
                email: '',
                password: '',
                repeatPassword: '',
                username: '',
                name: '',
                general: ''
            }
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['settings']),
        splash () {
            return this.settings['branding:account:signUpLeftBanner']
        },
        isPopup () {
            return isPopupContext(this.$route.query)
        },
        formValid () {
            return (this.input.email && !this.errors.email) &&
                   (this.input.username && !this.errors.username) &&
                   (this.input.password && !this.errors.password) &&
                   (this.input.repeatPassword && !this.errors.repeatPassword) &&
                   (this.askJoinReason ? this.input.join_reason : true) &&
                   (this.settings['user:tcs-required'] ? this.input.tcs_accepted : true) &&
                   (!this.errors.name)
        },
        askJoinReason () {
            return !!window.posthog
        },
        // Computed rather than data so the labels re-render when the locale
        // changes, and so $t is definitely available when they are read.
        reasons () {
            return [
                { label: this.$t('auth.signUp.reasons.education'), value: 'education' },
                { label: this.$t('auth.signUp.reasons.business'), value: 'business' },
                { label: this.$t('auth.signUp.reasons.personal'), value: 'personal' }
            ]
        }
    },
    watch: {
        // watch deep to ensure we catch all changes
        input: {
            handler: function (newVal) {
                if (newVal.name) {
                    this.showErrors.name = true
                }
                if (newVal.username) {
                    this.showErrors.username = true
                }
                if (newVal.email) {
                    this.showErrors.email = true
                }
                if (newVal.password || newVal.repeatPassword) {
                    this.showErrors.password = true
                    this.showErrors.repeatPassword = true
                }
                this.validateFormInputs()
            },
            deep: true
        }
    },
    async mounted () {
        this.input.email = useRoute().query.email || ''
        const { default: zxcvbnImp } = await import('zxcvbn')
        zxcvbn = zxcvbnImp
    },
    methods: {
        /**
         * Single validation routine for inputs
         * @returns {boolean} - true if all inputs are valid
         */
        validateFormInputs () {
            if (!this.input.username.trim()) {
                this.errors.username = this.$t('auth.signUp.errors.usernameRequired')
            } else if (!/^[a-z0-9-_]+$/i.test(this.input.username)) {
                this.errors.username = this.$t('auth.signUp.errors.usernameCharset')
            } else {
                this.errors.username = ''
            }

            if (this.input.name.trim() && /:\/\//i.test(this.input.name)) {
                this.errors.name = this.$t('auth.signUp.errors.nameNotUrl')
            } else {
                this.errors.name = ''
            }

            if (!this.input.email.trim()) {
                this.errors.email = this.$t('auth.signUp.errors.emailRequired')
            } else if (!/.+@.+/.test(this.input.email)) {
                this.errors.email = this.$t('auth.signUp.errors.emailInvalid')
            } else {
                this.errors.email = ''
            }

            let checkRepeat = false
            if (!this.input.password) {
                this.errors.password = this.$t('auth.signUp.errors.passwordRequired')
            } else if (this.input.password.length < 8) {
                this.errors.password = this.$t('auth.signUp.errors.passwordTooShort')
            } else if (this.input.password.length > 128) {
                this.errors.password = this.$t('auth.signUp.errors.passwordTooLong')
            } else if (this.input.password === this.input.username.trim()) {
                this.errors.password = this.$t('auth.signUp.errors.passwordMatchUsername')
            } else if (this.input.password === this.input.email.trim()) {
                this.errors.password = this.$t('auth.signUp.errors.passwordMatchEmail')
            } else if (this.input.password === this.input.name.trim()) {
                this.errors.password = this.$t('auth.signUp.errors.passwordMatchName')
            } else if (zxcvbn(this.input.password).score < 2) {
                this.errors.password = this.$t('auth.signUp.errors.passwordComplexity')
            } else {
                this.errors.password = ''
                checkRepeat = true
            }

            if (checkRepeat && this.input.password !== this.input.repeatPassword) {
                this.errors.repeatPassword = this.$t('auth.signUp.errors.passwordMismatch')
            } else {
                this.errors.repeatPassword = ''
            }

            return !this.errors.username && !this.errors.email && !this.errors.password && !this.errors.repeatPassword && !this.errors.name
        },
        registerUser () {
            // ensure errors are shown
            this.showErrors = {
                username: true,
                email: true,
                password: true,
                repeatPassword: true,
                name: true
            }
            const inputsValid = this.validateFormInputs()
            if (!this.formValid || !inputsValid) {
                // should not reach here due to button being disabled (catch all)
                this.errors.general = this.$t('auth.signUp.errors.checkFields')
                return
            }

            if (this.$route.query.code) {
                this.input.code = this.$route.query.code
            }
            const name = this.input.name.trim()
            const email = this.input.email.trim()
            const opts = { ...this.input, name: name || this.input.username, email }
            this.busy = true // show spinner
            this.errors.general = '' // clear any previous errors
            userApi.registerUser(opts).then(async result => {
                if (result.sso_enabled) {
                    this.ssoCreated = true
                }
                this.busy = false
                if (window.gtag && this.settings.adwords?.events?.conversion) {
                    window.gtag('event', 'conversion', this.settings.adwords.events.conversion)
                }
                if (this.isPopup) {
                    handoffFromPopup()
                    return
                }
                if (!result.sso_enabled) {
                    useAccountAuthStore().setUser(result)
                    this.$router.push('/')
                }
            }).catch(err => {
                console.error(err)
                this.busy = false
                if (err.response?.data) {
                    if (err.response.data.code === 'invalid_request') {
                        this.errors.username = err.response.data.error || this.$t('auth.signUp.errors.invalidRequest')
                    } else if (err.response.data.code === 'invalid_sso_email') {
                        this.errors.email = err.response.data.error
                    } else if (err.response.data.statusCode === 429) {
                        this.errors.general = this.$t('auth.signUp.errors.tooManyAttempts')
                        this.tooManyRequests = true
                        setTimeout(() => {
                            this.tooManyRequests = false
                        }, 10000)
                    } else if (err.response.data.error === 'user registration not enabled') {
                        this.errors.general = this.$t('auth.signUp.errors.registrationDisabled')
                    } else if (err.response.data.error === 'Validation isEmail on email failed') {
                        this.errors.email = this.$t('common.errors.invalidEmail')
                    } else {
                        this.errors.general = this.$t('common.errors.unexpected')
                    }
                } else {
                    this.errors.general = this.$t('common.errors.unexpected')
                }
            })
        }
    }
}
</script>
