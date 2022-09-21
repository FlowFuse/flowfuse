<template>
    <ff-layout-box class="ff-signup">
        <div v-if="!emailSent">
            <h2>Sign Up</h2>
            <div>
                <label>Username</label>
                <ff-text-input ref="signup-username" label="username" :error="errors.username" v-model="input.username" />
                <label class="ff-error-inline">{{ errors.username }}</label>
                <label>Full Name</label>
                <ff-text-input ref="signup-fullname" label="Full Name" :error="errors.name" v-model="input.name" />
                <label class="ff-error-inline">{{ errors.name }}</label>
                <label>E-Mail Address</label>
                <ff-text-input ref="signup-email" label="E-Mail Address" :error="errors.email" v-model="input.email" />
                <label class="ff-error-inline">{{ errors.email }}</label>
                <label>Password</label>
                <ff-text-input ref="signup-password" label="password" :error="errors.password" v-model="input.password" type="password"/>
                <label class="ff-error-inline">{{ errors.password }}</label>
            </div>
            <div v-if="settings['user:tcs-required']">
                <ff-checkbox v-model="input.tcs_accepted">
                    I accept the <a target="_blank" :href="settings['user:tcs-url']">FlowForge Terms &amp; Conditions.</a>
                </ff-checkbox>
            </div>
            <label class="ff-error-inline">{{ errors.general }}</label>
            <div class="ff-actions">
                <ff-button :disabled="!formValid" @click="registerUser()" data-action="sign-up">Sign Up</ff-button>
            </div>
        </div>
        <div v-else>
            <h5>Confirm your e-mail address.</h5>
            <p>Please click the link in the email we sent to {{ input.email }}</p>
        </div>
    </ff-layout-box>
</template>

<script>
import { mapState } from 'vuex'

import userApi from '@/api/user'

import { useRoute } from 'vue-router'

import FFLayoutBox from '@/layouts/Box'

export default {
    name: 'AccountCreate',
    components: {
        'ff-layout-box': FFLayoutBox
    },
    data () {
        return {
            teams: [],
            emailSent: false,
            input: {
                name: '',
                username: '',
                email: '',
                password: '',
                tcs_accepted: false,
                code: ''
            },
            errors: {
                email: '',
                password: ''
            }
        }
    },
    mounted () {
        this.input.email = useRoute().query.email || ''
    },
    computed: {
        ...mapState('account', ['settings', 'pending']),
        formValid () {
            return (this.input.email && !this.errors.email) &&
                   (this.input.username && !this.errors.username) &&
                   this.input.password.length >= 8 &&
                   (this.settings['user:tcs-required'] ? this.input.tcs_accepted : true) &&
                   (!this.errors.name)
        }
    },
    watch: {
        'input.username': function (v) {
            if (v && !/^[a-z0-9-_]+$/i.test(v)) {
                this.errors.username = 'Must only contain a-z 0-9 - _'
            } else {
                this.errors.username = ''
            }
        },
        'input.email': function (v) {
            if (v && !/.+@.+/.test(v)) {
                this.errors.email = 'Enter a valid email address'
            } else {
                this.errors.email = ''
            }
        },
        'input.password': function (v) {
            if (this.errors.password && v.length >= 8) {
                this.errors.password = ''
            }
        },
        'input.name': function (v) {
            if (v && /:\/\//i.test(v)) {
                this.errors.name = 'Names can not be URLs'
            } else {
                this.errors.name = ''
            }
        }
    },
    methods: {
        checkPassword () {
            if (this.input.password.length < 8) {
                this.errors.password = 'Password must be at least 8 characters'
            } else {
                this.errors.password = ''
            }
        },
        registerUser () {
            if (this.$route.query.code) {
                this.input.code = this.$route.query.code
            }
            const opts = { ...this.input, name: this.input.name || this.input.username }
            userApi.registerUser(opts).then(result => {
                this.emailSent = true
            }).catch(err => {
                console.log(err.response.data)
                if (err.response.data) {
                    if (/username/.test(err.response.data.error)) {
                        this.errors.username = 'Username unavailable'
                    }
                    if (/password/.test(err.response.data.error)) {
                        this.errors.password = 'Invalid username'
                    }
                    if (/email/.test(err.response.data.error)) {
                        this.errors.email = 'Email unavailable'
                    }
                    if (err.response.data.error === 'user registration not enabled') {
                        // TODO Where to show this error?
                    }
                }
            })
        }
    }
}
</script>
