<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4 pt-4">
        <FormHeading>1. Create Administrator User</FormHeading>
        <template v-if="!state.adminUser">
            <FormRow v-model="input.username" class="!max-w-full" :error="errors.username">
                Username
                <template #description>Unique, short, no spaces. Cannot be 'admin' or 'root'</template>
            </FormRow>
            <FormRow v-model="input.name" class="!max-w-full" :placeholder="input.username">
                Full Name
            </FormRow>
            <FormRow v-model="input.email" class="!max-w-full" :error="errors.email">
                Email
                <template v-if="!state.email" #description>
                    <div class="text-red-400">Email has not be configured. This will limit available features, such as inviting users to the platform. Check the documentation for how to configure email before running this setup.</div>
                </template>
            </FormRow>
            <FormRow id="password" v-model="input.password" class="!max-w-full" type="password" :error="errors.password" :onBlur="checkPassword">
                Password
                <template #description>At least 8 characters</template>
            </FormRow>
            <FormRow id="password_confirm" v-model="input.password_confirm" class="!max-w-full" type="password" :error="errors.password_confirm">Confirm Password</FormRow>
            <ff-button :disabled="!formValid" class="mt-6" @click="createUser()">
                Next
            </ff-button>
        </template>
        <template v-else>
            <p class="text-center">You have already created an admin user.</p>
            <div class="flex justify-center">
                <ff-button class="mt-3" @click="next()">
                    Next
                </ff-button>
            </div>
        </template>
    </form>
</template>

<script>
import httpClient from '../../api/client.js'
import FormHeading from '../../components/FormHeading.vue'
import FormRow from '../../components/FormRow.vue'

let zxcvbn

export default {
    name: 'CreateAdminUser',
    components: {
        FormHeading,
        FormRow
    },
    props: {
        state: {
            type: Object,
            required: true
        }
    },
    emits: ['next'],
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
    computed: {
        formValid () {
            return this.input.email &&
                   (this.input.username && !this.errors.username) &&
                   this.input.password !== '' &&
                   this.input.password === this.input.password_confirm &&
                   !this.errors.password
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
            if (this.errors.password && v.length >= 8 && zxcvbn(v).score >= 2) {
                this.errors.password = ''
            }
            if (v === this.input.username) {
                this.errors.password = 'Password must not match username'
            }
            if (v === this.input.email) {
                this.errors.password = 'Password must not match email'
            }
        }
    },
    async mounted () {
        const { default: zxcvbnImp } = await import('zxcvbn')
        zxcvbn = zxcvbnImp
    },
    methods: {
        next () {
            this.$emit('next')
        },
        checkPassword () {
            if (this.input.password && this.input.password.length < 8) {
                this.errors.password = 'Password must be at least 8 characters'
                return
            } else {
                this.errors.password = ''
            }
            if (this.input.password && this.input.password.length > 128) {
                this.errors.password = 'Password too long'
                return
            } else {
                this.errors.password = ''
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
                if (err.response?.data) {
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
    }
}
</script>
