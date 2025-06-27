<!-- eslint-disable vue/no-v-html -->

<template>
    <ff-layout-box class="ff-signup ff--center-box">
        <template v-if="splash" #splash-content>
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
                <label>{{ $t('auth.username') }}</label>
                <ff-text-input ref="signup-username" v-model="input.username" data-form="signup-username" label="username" :error="showErrors.username ? errors.username : ''" />
                <span class="ff-error-inline">{{ showErrors.username ? errors.username : '' }}</span>
                <label>{{ $t('auth.fullName') }}</label>
                <ff-text-input ref="signup-fullname" v-model="input.name" data-form="signup-fullname" :label="$t('auth.fullName')" :error="showErrors.name ? errors.name : ''" />
                <span class="ff-error-inline">{{ showErrors.name ? errors.name : '' }}</span>
                <label>{{ $t('auth.emailAddress') }}</label>
                <ff-text-input ref="signup-email" v-model="input.email" data-form="signup-email" :label="$t('auth.emailAddress')" :error="showErrors.email ? errors.email : ''" />
                <span class="ff-error-inline">{{ showErrors.email ? errors.email : '' }}</span>
                <label>{{ $t('auth.password') }}</label>
                <ff-text-input ref="signup-password" v-model="input.password" data-form="signup-password" label="password" :error="showErrors.password ? errors.password : ''" type="password" />
                <span class="ff-error-inline">{{ showErrors.password ? errors.password : '' }}</span>
                <label>{{ $t('auth.confirmPassword') }}</label>
                <ff-text-input ref="signup-repeat-password" v-model="input.repeatPassword" data-form="signup-repeat-password" :label="$t('auth.confirmPassword')" :error="showErrors.repeatPassword ? errors.repeatPassword : ''" type="password" />
                <span class="ff-error-inline">{{ showErrors.repeatPassword ? errors.repeatPassword : '' }}</span>
            </div>
            <div v-if="askJoinReason" class="pt-3">
                <ff-radio-group
                    v-model="input.join_reason"
                    :label="$t('auth.joinReason.label')"
                    orientation="grid"
                    data-form="signup-join-reason"
                    :options="reasons"
                />
            </div>
            <div v-if="settings['user:tcs-required']" class="pt-3">
                <ff-checkbox v-model="input.tcs_accepted" data-form="signup-accept-tcs">
                    {{ $t('auth.termsAndConditions') }}
                    <a target="_blank" :href="settings['user:tcs-url']">FlowFuse Terms &amp; Conditions.</a>
                </ff-checkbox>
            </div>
            <label v-if="errors.general" class="pt-3 ff-error-inline">{{ errors.general }}</label>
            <div class="ff-actions pt-2">
                <ff-button type="submit" :disabled="!formValid || busy || tooManyRequests" data-action="sign-up">
                    <span>{{ $t('auth.signup') }}</span>
                    <span class="w-4">
                        <SpinnerIcon v-if="busy || tooManyRequests" class="ff-icon ml-3 !w-3.5" />
                    </span>
                </ff-button>
                <p class="flex text-gray-400 font-light mt-6 gap-2 w-full justify-center">
                    {{ $t('auth.alreadyRegistered') }} <a href="/" data-action="login">{{ $t('auth.loginHere') }}</a>
                </p>
            </div>
        </form>
        <div v-else-if="ssoCreated">
            <p>{{ $t('auth.ssoCreated') }}</p>
            <ff-button :to="{ name: 'Home' }" data-action="login">{{ $t('auth.login') }}</ff-button>
        </div>
    </ff-layout-box>
</template>

<script>
import { useRoute } from 'vue-router'
import { mapState } from 'vuex'

import userApi from '../../api/user.js'

import SpinnerIcon from '../../components/icons/Spinner.js'
import FFLayoutBox from '../../layouts/Box.vue'

let zxcvbn

export default {
    name: 'AccountCreate',
    components: {
        'ff-layout-box': FFLayoutBox,
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
        ...mapState('account', ['settings', 'pending']),
        splash () {
            return this.settings['branding:account:signUpLeftBanner']
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
        reasons () {
            return [
                { label: this.$t('auth.joinReason.education'), value: 'education' },
                { label: this.$t('auth.joinReason.business'), value: 'business' },
                { label: this.$t('auth.joinReason.personal'), value: 'personal' }
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
                this.errors.username = this.$t('auth.errors.usernameRequired')
            } else if (!/^[a-z0-9-_]+$/i.test(this.input.username)) {
                this.errors.username = this.$t('auth.errors.usernameInvalidChars')
            } else {
                this.errors.username = ''
            }

            if (this.input.name.trim() && /:\/\//i.test(this.input.name)) {
                this.errors.name = this.$t('auth.errors.nameCannotBeUrl')
            } else {
                this.errors.name = ''
            }

            if (!this.input.email.trim()) {
                this.errors.email = this.$t('auth.errors.emailRequired')
            } else if (!/.+@.+/.test(this.input.email)) {
                this.errors.email = this.$t('auth.errors.invalidEmail')
            } else {
                this.errors.email = ''
            }

            let checkRepeat = false
            if (!this.input.password) {
                this.errors.password = this.$t('auth.errors.passwordRequired')
            } else if (this.input.password.length < 8) {
                this.errors.password = this.$t('auth.errors.passwordTooShort')
            } else if (this.input.password.length > 128) {
                this.errors.password = this.$t('auth.errors.passwordTooLong')
            } else if (this.input.password === this.input.username.trim()) {
                this.errors.password = this.$t('auth.errors.passwordMatchesUsername')
            } else if (this.input.password === this.input.email.trim()) {
                this.errors.password = this.$t('auth.errors.passwordMatchesEmail')
            } else if (this.input.password === this.input.name.trim()) {
                this.errors.password = this.$t('auth.errors.passwordMatchesName')
            } else if (zxcvbn(this.input.password).score < 2) {
                this.errors.password = this.$t('auth.errors.passwordTooWeak')
            } else {
                this.errors.password = ''
                checkRepeat = true
            }

            if (checkRepeat && this.input.password !== this.input.repeatPassword) {
                this.errors.repeatPassword = this.$t('auth.errors.passwordsDoNotMatch')
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
                this.errors.general = this.$t('auth.errors.checkAllFields')
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
                if (!result.sso_enabled) {
                    this.$store.dispatch('account/setUser', result)
                    this.$router.push('/')
                }
            }).catch(err => {
                console.error(err)
                this.busy = false
                if (err.response?.data) {
                    if (err.response.data.code === 'invalid_request') {
                        this.errors.username = err.response.data.error || 'Invalid request'
                    } else if (err.response.data.code === 'invalid_sso_email') {
                        this.errors.email = err.response.data.error
                    } else if (err.response.data.statusCode === 429) {
                        this.errors.general = this.$t('auth.errors.tooManyRegistrationAttempts')
                        this.tooManyRequests = true
                        setTimeout(() => {
                            this.tooManyRequests = false
                        }, 10000)
                    } else if (err.response.data.error === 'user registration not enabled') {
                        this.errors.general = this.$t('auth.errors.userRegistrationDisabled')
                    } else if (err.response.data.error === 'Validation isEmail on email failed') {
                        this.errors.email = this.$t('auth.errors.invalidEmail')
                    } else {
                        this.errors.general = this.$t('auth.errors.unexpectedError')
                    }
                } else {
                    this.errors.general = this.$t('auth.errors.unexpectedError')
                }
            })
        }
    }
}
</script>
