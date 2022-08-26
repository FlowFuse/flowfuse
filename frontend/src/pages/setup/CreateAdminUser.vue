<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4 pt-4">
        <FormHeading>1. Create Administrator User</FormHeading>
        <template v-if="!state.adminUser">
            <FormRow v-model="input.username" :error="errors.username">
                Username
                <template v-slot:description>Unique, short, no spaces. Cannot be 'admin' or 'root'</template>
            </FormRow>
            <FormRow v-model="input.name" :placeholder="input.username">
                Full Name
            </FormRow>
            <FormRow v-model="input.email" :error="errors.email">
                Email
                <template v-if="!state.email" v-slot:description>
                    <div class="text-red-400">Email has not be configured. This will limit available features, such as inviting users to the platform. Check the documentation for how to configure email before running this setup.</div>
                </template>
            </FormRow>
            <FormRow type="password" :error="errors.password" v-model="input.password" id="password" :onBlur="checkPassword" >
                Password
                <template v-slot:description>At least 8 characters</template>
            </FormRow>
            <FormRow type="password" :error="errors.password_confirm" v-model="input.password_confirm" id="password_confirm">Confirm Password</FormRow>
            <ff-button :disabled="!formValid" @click="createUser()" class="mt-6">
                Next
            </ff-button>
        </template>
        <template v-else>
            <p class="text-center">You have already created an admin user.</p>
            <div class="flex justify-center">
                <ff-button @click="next()" class="mt-3">
                    Next
                </ff-button>
            </div>
        </template>
    </form>
</template>

<script>
import httpClient from '@/api/client'
import FormHeading from '@/components/FormHeading.vue'
import FormRow from '@/components/FormRow.vue'
export default {
    name: 'CreateAdminUser',
    data () {
        return {
            input: {
                name: '',
                username: '',
                email: '',
                password: '',
                password_confirm: ''
                // isAdmin: false,
                // createDefaultTeam: true
            },
            errors: {}
        }
    },
    props: ['state'],
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
        }
    },
    computed: {
        formValid () {
            return this.input.email &&
                   (this.input.username && !this.errors.username) &&
                   this.input.password !== '' &&
                   this.input.password === this.input.password_confirm
        }
    },
    methods: {
        next () {
            this.$emit('next')
        },
        checkPassword () {
            if (this.input.password && this.input.password.length < 8) {
                this.errors.password = 'Password must be at least 8 characters'
            } else {
                this.errors.password = ''
            }
            if (this.input.password && this.input.password.length > 1024) {
                this.errors.password = 'Password too long'
            } else {
                this.errors.password = ''
            }
        },
        createUser () {
            // eslint-disable-next-line no-undef
            const opts = { _csrf: SETUP_CSRF_TOKEN, ...this.input, name: this.input.name || this.input.username }
            delete opts.password_confirm

            return httpClient.post('/setup/create-user', opts).then(res => {
                this.$emit('next')
            }).catch(err => {
                if (err.response.data) {
                    if (/username/.test(err.response.data.error)) {
                        this.errors.username = 'Username unavailable'
                    } else if (/password/.test(err.response.data.error)) {
                        this.errors.password = 'Invalid username'
                    } else if (err.response.data.error === 'email must be unique') {
                        this.errors.email = 'Email already registered'
                    } else {
                        this.errors.username = err.response.data.error
                    }
                }
            })
        }
    },
    components: {
        FormHeading,
        FormRow
    }
}
</script>
