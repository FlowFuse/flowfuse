<template>
    <ff-loading v-if="loading" message="" />
    <form v-else class="space-y-6">
        <FormRow v-model="input.username" :error="errors.username">Username</FormRow>
        <FormRow v-model="input.name" :placeholder="input.username" :error="errors.name">Name</FormRow>
        <FormRow v-model="input.email" :error="errors.email">Email</FormRow>

        <ff-button :disabled="!formValid" @click="confirm">Save Changes</ff-button>

    </form>
</template>

<script>
import userApi from '@/api/user'

import alerts from '@/services/alerts'

import FormRow from '@/components/FormRow'

export default {
    name: 'AccountSettings',

    data () {
        const currentUser = this.$store.getters['account/user']
        return {
            loading: false,
            user: currentUser,
            errors: {},
            input: {
                username: currentUser.username,
                name: currentUser.name,
                email: currentUser.email
            },
            changed: {}
        }
    },
    watch: {
        'input.username': function (v) {
            if (v && !/^[a-z0-9-_]+$/i.test(v)) {
                this.errors.username = 'Must only contain a-z 0-9 - _'
            } else {
                this.errors.username = ''
            }
            this.changed.username = (this.user.username !== v)
        },
        'input.email': function (v) {
            if (v && !/.+@.+/.test(v)) {
                this.errors.email = 'Enter a valid email address'
            } else {
                this.errors.email = ''
            }
            this.changed.email = (this.user.email !== v)
        },
        'input.name': function (v) {
            if (v && /:\/\//i.test(v)) {
                this.errors.name = 'Names can not be URLs'
            } else {
                this.errors.name = ''
            }
            this.changed.name = (this.user.name !== v)
        }
    },
    methods: {
        confirm () {
            this.loading = true
            const opts = {}
            let changed = false
            if (this.input.username !== this.user.username) {
                opts.username = this.input.username
                changed = true
            }
            if (this.input.name !== this.user.name) {
                opts.name = this.input.name
                changed = true
            }
            if (this.input.email !== this.user.email) {
                opts.email = this.input.email
                changed = true
            }
            if (this.input.admin !== this.user.admin) {
                opts.admin = this.input.admin
                changed = true
            }

            if (changed) {
                userApi.updateUser(opts).then((response) => {
                    this.$store.dispatch('account/setUser', response)
                    alerts.emit('User successfully updated.', 'confirmation')
                    this.user = response
                    this.changed = {}
                }).catch(err => {
                    console.log(err.response.data)
                    if (err.response.data) {
                        if (/username/.test(err.response.data.error)) {
                            this.errors.username = 'Username unavailable'
                        }
                        if (/password/.test(err.response.data.error)) {
                            this.errors.password = 'Invalid username'
                        }
                        if (err.response.data.error === 'email must be unique') {
                            this.errors.email = 'Email already registered'
                        }
                    }
                }).finally(() => {
                    this.loading = false
                })
            }
        }
    },
    computed: {
        formValid () {
            return (this.changed.name || this.changed.username || this.changed.email) &&
                   (this.input.email && !this.errors.email) &&
                   (this.input.username && !this.errors.username) &&
                   (this.input.name && !this.errors.name)
        }
    },
    components: {
        FormRow
    }
}
</script>
