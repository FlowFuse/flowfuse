<template>
    <ff-loading v-if="loading" message="" />
    <form v-else class="space-y-6" @submit.enter.prevent="">
        <FormRow v-model="input.username" :type="editing?'text':'uneditable'" :error="errors.username">Username</FormRow>
        <FormRow v-model="input.name" :type="editing?'text':'uneditable'" :placeholder="input.username" :error="errors.name">Name</FormRow>
        <FormRow v-model="input.email" :type="emailEditingEnabled?'email':'uneditable'" :error="errors.email">Email</FormRow>
        <FormRow v-if="!editing" v-model="defaultTeamName" :options="teams" type="uneditable">
            Default Team
        </FormRow>
        <FormRow v-else v-model="input.defaultTeam" :options="teams" :error="errors.defaultTeam">
            Default Team
            <template #description>The team you'll see when you log in</template>
        </FormRow>

        <template v-if="editing">
            <div class="flex space-x-4">
                <ff-button :disabled="!formValid" @click="confirm">Save Changes</ff-button>
                <ff-button kind="secondary" @click="cancelEdit">Cancel</ff-button>
            </div>
        </template>
        <template v-else>
            <ff-button @click="startEdit">Edit</ff-button>
        </template>
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
        const teams = this.$store.getters['account/teams']
        let defaultTeamName = 'none'
        const teamOptions = teams.map(team => {
            if (team.id === currentUser.defaultTeam) {
                defaultTeamName = team.name
            }
            return {
                value: team.id,
                label: team.name
            }
        })
        return {
            loading: false,
            editing: false,
            user: currentUser,
            errors: {},
            input: {
                username: currentUser.username,
                name: currentUser.name,
                email: currentUser.email,
                defaultTeam: currentUser.defaultTeam
            },
            defaultTeamName,
            changed: {},
            teams: teamOptions
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
        },
        'input.defaultTeam': function (v) {
            this.changed.defaultTeam = (this.user.defaultTeam !== v)
        }
    },
    methods: {
        startEdit () {
            this.editing = true
            if (this.user.sso_enabled) {
                this.errors.email = 'Cannot modify email for SSO enabled user'
            }
        },
        cancelEdit () {
            this.input.username = this.user.username
            this.input.name = this.user.name
            this.input.email = this.user.email
            this.input.defaultTeam = this.user.defaultTeam
            this.errors.email = ''
            this.editing = false
        },
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
            if (this.input.defaultTeam !== this.defaultTeam) {
                opts.defaultTeam = this.input.defaultTeam
                changed = true
            }
            if (changed) {
                userApi.updateUser(opts).then((response) => {
                    this.$store.dispatch('account/setUser', response)
                    alerts.emit('User successfully updated.', 'confirmation')
                    this.user = response
                    this.teams.forEach(team => {
                        if (team.value === this.user.defaultTeam) {
                            this.defaultTeamName = team.label
                        }
                    })
                    this.changed = {}
                    this.editing = false
                }).catch(err => {
                    if (err.response.data) {
                        if (/username/.test(err.response.data.error)) {
                            this.errors.username = 'Username unavailable'
                        }
                        if (err.response.data.code === 'invalid_email') {
                            this.errors.email = 'Invalid email'
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
            return (this.changed.name || this.changed.username || this.changed.email || this.changed.defaultTeam) &&
                   (this.input.email && !this.errors.email) &&
                   (this.input.username && !this.errors.username) &&
                   (this.input.name && !this.errors.name)
        },
        emailEditingEnabled () {
            return this.editing && !this.user.sso_enabled
        }
    },
    components: {
        FormRow
    }
}
</script>
