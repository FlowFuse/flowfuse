<template>
    <ff-page>
        <template #header>
            <ff-page-header>
                <template #breadcrumbs>
                    <div class="flex-grow">
                        <div class="text-gray-800 text-xl">
                            <router-link class="ff-link font-bold" :to="{name: 'admin-users'}">Users</router-link>
                            <ChevronRightIcon class="ff-icon" />
                            <span>Create</span>
                        </div>
                    </div>
                </template>
            </ff-page-header>
        </template>
        <div class="max-w-2xl">
            <form class="space-y-6">
                <FormRow v-model="input.username" :error="errors.username">Username</FormRow>
                <FormRow v-model="input.name" :placeholder="input.username" :error="errors.name">Full Name</FormRow>
                <FormRow v-model="input.email" :error="errors.email">Email</FormRow>
                <FormRow id="password" v-model="input.password" type="password" :error="errors.password">Password</FormRow>
                <FormRow id="password_confirm" v-model="input.password_confirm" type="password" :error="errors.password_confirm">Confirm Password</FormRow>
                <FormRow id="isAdmin" v-model="input.isAdmin" type="checkbox">Administrator</FormRow>
                <FormHeading>Team options</FormHeading>
                <FormRow id="createDefaultTeam" v-model="input.createDefaultTeam" type="checkbox">
                    Create personal team
                    <template #description>A user needs to be in a team to create projects</template>
                </FormRow>
                <!-- <FormRow v-model="input.addToTeam">Add to existing team</FormRow> -->
                <ff-button :disabled="!formValid" @click="createUser()">
                    Create user
                </ff-button>
            </form>
        </div>
    </ff-page>
</template>

<script>
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import usersApi from '../../../api/users.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'

let zxcvbn

export default {
    name: 'AdminCreateUser',
    components: {
        ChevronRightIcon,
        FormRow,
        FormHeading
    },
    data () {
        return {
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            teams: [],
            input: {
                name: '',
                username: '',
                email: '',
                password: '',
                password_confirm: '',
                isAdmin: false,
                createDefaultTeam: false
            },
            errors: {}
        }
    },
    computed: {
        ...mapState('account', ['settings']),
        formValid () {
            return this.input.email &&
                   (this.input.username && !this.errors.username) &&
                   (this.input.password === this.input.password_confirm) &&
                   !this.errors.name && !this.errors.password
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
            if (this.input.password.length < 8) {
                this.errors.password = 'Password must be at least 8 characters'
                return
            }
            if (this.input.password.length > 128) {
                this.errors.password = 'Password too long'
                return
            }
            if (this.input.password === this.input.username) {
                this.errors.password = 'Password must not match username'
                return
            }
            if (this.input.password === this.input.email) {
                this.errors.password = 'Password must not match email'
                return
            }
            const zxcvbnResult = zxcvbn(this.input.password)
            if (zxcvbnResult.score < 2) {
                this.errors.password = `Password too weak, ${zxcvbnResult.feedback.suggestions[0]}`
                return
            }
            this.errors.password = ''
        },
        'input.name': function (v) {
            if (v && /:\/\//i.test(v)) {
                this.errors.name = 'Names can not be URLs'
            } else {
                this.errors.name = ''
            }
        }
    },
    async mounted () {
        this.mounted = true
        const { default: zxcvbnImp } = await import('zxcvbn')
        zxcvbn = zxcvbnImp
    },
    methods: {
        createUser () {
            const opts = { ...this.input, name: this.input.name || this.input.username }
            delete opts.password_confirm
            usersApi.create(opts).then(result => {
                this.$router.push({ path: '/admin/users' })
            }).catch(err => {
                console.error(err.response.data)
                if (err.response?.data) {
                    if (/username/.test(err.response.data.error)) {
                        this.errors.username = 'Username unavailable'
                    }
                    if (/password/.test(err.response.data.error)) {
                        this.errors.password = 'Invalid username'
                    }
                    if (/email/.test(err.response.data.error)) {
                        this.errors.email = 'Email unavailable'
                    }
                }
            })
        }
    }
}
</script>
