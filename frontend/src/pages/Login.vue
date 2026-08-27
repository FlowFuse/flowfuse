<template>
    <ff-layout-box class="ff-login">
        <div v-if="!appLoader" data-form="login">
            <ff-loading v-if="loggingIn" :message="$t('auth.login.loggingIn')" />
            <template v-else-if="!mfaRequired">
                <label>{{ $t('auth.login.usernameOrEmail') }}</label>
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
                    <label>{{ $t('common.fields.password') }}</label>
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
                        <span>{{ $t('common.actions.login') }}</span>
                        <span v-if="loggingIn || tooManyRequests" class="w-4">
                            <SpinnerIcon class="ff-icon ml-3 w-3.5!" />
                        </span>
                    </ff-button>
                    <ff-button v-if="settings['user:signup']" kind="tertiary" to="/account/create" data-action="sign-up">{{ $t('common.actions.signUp') }}</ff-button>
                    <ff-button v-if="passwordRequired && settings['user:reset-password']" kind="tertiary" :to="{'name': 'forgot-password'}" data-action="forgot-password">{{ $t('auth.login.forgotPassword') }}</ff-button>
                    <GoogleLoginButton :label="$t('auth.login.signInWithGoogle')" :disabled="loggingIn" />
                    <template v-if="directSSOEnabled">
                        <hr class="mb-4">
                        <ul>
                            <li v-for="{name, id} in settings['platform:sso:direct:list']" :key="id">
                                <ff-button kind="secondary" :data-action="`direct-sso-${id}`" @click="directSSO(id)">
                                    <span>{{ $t('auth.login.signInWith', { provider: name.toUpperCase() }) }}</span>
                                </ff-button>
                            </li>
                        </ul>
                    </template>
                </div>
            </template>
            <template v-else>
                <label>{{ $t('auth.login.mfaPrompt') }}</label>
                <ff-text-input ref="login-mfa-token" v-model="input.token" maxlength="6" label="token" @enter="submitMFAToken" />
                <div class="ff-actions">
                    <ff-button data-action="submit-token" :disabled="loggingIn || tokenInvalid" @click="submitMFAToken()">
                        <span>{{ $t('common.actions.continue') }}</span>
                        <span class="w-4">
                            <SpinnerIcon v-if="loggingIn" class="ff-icon ml-3 w-3.5!" />
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
import { mapState } from 'pinia'

import GoogleLoginButton from '../components/GoogleLoginButton.vue'
import Logo from '../components/Logo.vue'
import SpinnerIcon from '../components/icons/Spinner.js'

import FFLayoutBox from '../layouts/Box.vue'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useUxLoadingStore } from '@/stores/ux-loading.js'

export default {
    name: 'LoginPage',
    components: {
        GoogleLoginButton,
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
        ...mapState(useAccountSettingsStore, ['settings']),
        ...mapState(useUxLoadingStore, ['appLoader']),
        ...mapState(useAccountAuthStore, ['loginError', 'redirectUrlAfterLogin']),
        tokenInvalid () {
            return this.mfaRequired && !/^\d{6}$/.test(this.input.token)
        },
        directSSOEnabled () {
            return !!this.settings['platform:sso:direct:list'] &&
                Array.isArray(this.settings['platform:sso:direct:list']) &&
                this.settings['platform:sso:direct:list'].length >= 1
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
                this.errors.general = this.$t('auth.login.errors.loginFailed')
            } else if (newError.statusCode === 429) {
                this.loggingIn = false
                await this.$nextTick()
                this.focusUsername()
                this.errors.general = this.$t('auth.login.errors.tooManyAttempts')
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
        if (this.settings['platform:sso:only'] &&
            this.settings['platform:sso:only:provider'] &&
            !/^\/admin\//.test(this.redirectUrlAfterLogin)) {
            await this.directSSO(this.settings['platform:sso:only:provider'])
        }
    },
    methods: {
        login () {
            let valid = true
            this.errors.username = ''
            this.errors.password = ''
            if (this.input.username === '') {
                valid = false
                this.errors.username = this.$t('common.errors.requiredField')
            }
            if (this.passwordRequired && this.input.password === '') {
                valid = false
                this.errors.password = this.$t('common.errors.requiredField')
            }
            if (this.input.password.length > 1024) {
                valid = false
                this.errors.password = this.$t('common.errors.tooLong')
            }
            if (valid) {
                this.loggingIn = true
                useAccountAuthStore().loginWithCredentials({
                    username: this.input.username,
                    password: this.input.password
                })
            }
        },
        submitMFAToken () {
            this.loggingIn = true
            useAccountAuthStore().loginWithCredentials({
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
        async directSSO (id) {
            const matched = this.redirectUrlAfterLogin?.match(/^\/account\/request\/([a-zA-Z0-9\-_]+)(\/editor)?$/)
            window.location = `/ee/sso/login?p=${id}${this.$route.query.r ? `&r=${this.$route.query.r}` : ''}${matched?.[1] ? `&t=${matched[1]}` : ''}`
        }
    }
}
</script>

<style lang="scss">
@use "../stylesheets/pages/login.scss" as *;
</style>
