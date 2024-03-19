<!-- eslint-disable vue/no-v-html -->

<template>
    <ff-layout-box class="ff-signup">
        <template v-if="splash" #splash-content>
            <div data-el="splash" v-html="splash" />
        </template>
        <form v-if="!emailSent && !ssoCreated" id="ff-sign-up" class="max-w-md m-auto" @submit.prevent="registerUser()">
            <p
                v-if="settings['branding:account:signUpTopBanner']"
                data-el="banner-text"
                class="text-center -mt-6 pb-4 text-gray-400"
                v-html="settings['branding:account:signUpTopBanner']"
            />
            <div>
                <label>Username</label>
                <ff-text-input ref="signup-username" v-model="input.username" data-form="signup-username" label="username" :error="showErrors.username ? errors.username : ''" />
                <span class="ff-error-inline">{{ showErrors.username ? errors.username : '' }}</span>
                <label>Full Name</label>
                <ff-text-input ref="signup-fullname" v-model="input.name" data-form="signup-fullname" label="Full Name" :error="showErrors.name ? errors.name : ''" />
                <span class="ff-error-inline">{{ showErrors.name ? errors.name : '' }}</span>
                <label>E-Mail Address</label>
                <ff-text-input ref="signup-email" v-model="input.email" data-form="signup-email" label="E-Mail Address" :error="showErrors.email ? errors.email : ''" />
                <span class="ff-error-inline">{{ showErrors.email ? errors.email : '' }}</span>
                <label>Password</label>
                <ff-text-input ref="signup-password" v-model="input.password" data-form="signup-password" label="password" :error="showErrors.password ? errors.password : ''" type="password" />
                <span class="ff-error-inline">{{ showErrors.password ? errors.password : '' }}</span>
            </div>
            <div v-if="askJoinReason" class="pt-3">
                <ff-radio-group
                    v-model="input.join_reason"
                    label="What brings you to FlowFuse?"
                    orientation="grid"
                    data-form="signup-join-reason"
                    :options="reasons"
                />
            </div>
            <div v-if="settings['user:tcs-required']" class="pt-3">
                <ff-checkbox v-model="input.tcs_accepted" data-form="signup-accept-tcs">
                    I accept the <a target="_blank" :href="settings['user:tcs-url']">FlowFuse Terms &amp; Conditions.</a>
                </ff-checkbox>
            </div>
            <label v-if="errors.general" class="pt-3 ff-error-inline">{{ errors.general }}</label>
            <div class="ff-actions pt-2">
                <ff-button type="submit" :disabled="!formValid || busy || tooManyRequests" data-action="sign-up">
                    <span>Sign Up</span>
                    <span class="w-4">
                        <SpinnerIcon v-if="busy || tooManyRequests" class="ff-icon ml-3 !w-3.5" />
                    </span>
                </ff-button>
                <p class="flex text-gray-400 font-light mt-6 gap-2 w-full justify-center">
                    Already registered? <a href="/" data-action="login">Log in here</a>
                </p>
            </div>
        </form>
        <div v-else-if="emailSent">
            <h5>Confirm your e-mail address.</h5>
            <p>Please click the link in the email we sent to {{ input.email }}</p>
        </div>
        <div v-else>
            <p>You can now login using your SSO Provider.</p>
            <ff-button :to="{ name: 'Home' }" data-action="login">Login</ff-button>
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
                name: false
            },
            teams: [],
            emailSent: false,
            ssoCreated: false,
            input: {
                name: '',
                username: '',
                email: '',
                password: '',
                join_reason: null,
                tcs_accepted: false,
                code: ''
            },
            errors: {
                email: '',
                password: '',
                username: '',
                name: '',
                general: ''
            },
            reasons: [
                { label: 'Business Needs', value: 'business' },
                { label: 'Personal Use', value: 'personal' },
                { label: 'Educational Use', value: 'education' },
                { label: 'Other', value: 'other' }
            ]
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
                   (this.askJoinReason ? this.input.join_reason : true) &&
                   (this.settings['user:tcs-required'] ? this.input.tcs_accepted : true) &&
                   (!this.errors.name)
        },
        askJoinReason () {
            return !!window.posthog
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
                if (newVal.password) {
                    this.showErrors.password = true
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
                this.errors.username = 'Username is required'
            } else if (!/^[a-z0-9-_]+$/i.test(this.input.username)) {
                this.errors.username = 'Must only contain a-z A-Z 0-9 - _'
            } else {
                this.errors.username = ''
            }

            if (this.input.name.trim() && /:\/\//i.test(this.input.name)) {
                this.errors.name = 'Names can not be URLs'
            } else {
                this.errors.name = ''
            }

            if (!this.input.email.trim()) {
                this.errors.email = 'Email is required'
            } else if (!/.+@.+/.test(this.input.email)) {
                this.errors.email = 'Enter a valid email address'
            } else {
                this.errors.email = ''
            }

            if (!this.input.password) {
                this.errors.password = 'Password is required'
            } else if (this.input.password.length < 8) {
                this.errors.password = 'Password needs to be longer than 8 chars'
            } else if (this.input.password === this.input.username.trim()) {
                this.errors.password = 'Password must not match username'
            } else if (this.input.password === this.input.email.trim()) {
                this.errors.password = 'Password must not match email'
            } else if (this.input.password === this.input.name.trim()) {
                this.errors.password = 'Password must not match name'
            } else if (zxcvbn(this.input.password).score < 2) {
                this.errors.password = 'Password needs to be more complex'
            } else {
                this.errors.password = ''
            }

            return !this.errors.username && !this.errors.email && !this.errors.password && !this.errors.name
        },
        registerUser () {
            // ensure errors are shown
            this.showErrors = {
                username: true,
                email: true,
                password: true,
                name: true
            }
            const inputsValid = this.validateFormInputs()
            if (!this.formValid || !inputsValid) {
                // should not reach here due to button being disabled (catch all)
                this.errors.general = 'Please check all fields are valid'
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
            userApi.registerUser(opts).then(result => {
                if (result.sso_enabled) {
                    this.ssoCreated = true
                } else {
                    this.emailSent = true
                }
                this.busy = false
                if (window.gtag && this.settings.adwords?.events?.conversion) {
                    window.gtag('event', 'conversion', this.settings.adwords.events.conversion)
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
                        this.errors.general = 'Too many attempts. Try again later.'
                        this.tooManyRequests = true
                        setTimeout(() => {
                            this.tooManyRequests = false
                        }, 10000)
                    } else if (err.response.data.error === 'user registration not enabled') {
                        this.errors.general = 'User registration is not enabled'
                    } else if (err.response.data.error === 'Validation isEmail on email failed') {
                        this.errors.email = 'Invalid email address'
                    } else {
                        this.errors.general = 'An unexpected error occurred. Please try again later or contact support.'
                    }
                } else {
                    this.errors.general = 'An unexpected error occurred. Please try again later or contact support.'
                }
            })
        }
    }
}
</script>
