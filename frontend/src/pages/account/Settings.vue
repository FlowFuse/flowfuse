<template>
    <div>
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
                    <ff-button kind="secondary" @click="resetInputs">Cancel</ff-button>
                </div>
            </template>
            <template v-else>
                <ff-button @click="startEdit">Edit</ff-button>
            </template>
        </form>

        <FormHeading class="text-red-700 mt-6">Delete Account</FormHeading>
        <div class="flex flex-col space-y-4 max-w-2xl mt-3">
            <div class="min-w-fit flex-shrink-0">
                <ff-button class="warning" kind="danger" data-action="delete-account" :disabled="!canDeleteAccount" @click="deleteAccount">Delete Account</ff-button>
            </div>
            <div v-if="!canDeleteAccount" class="flex-grow text-gray-500">
                <div class="max-w-sm text-sm">
                    Before you can delete your account, teams you own must be deleted or have at least 1 other owner.
                </div>
            </div>
        </div>
        <div v-if="!canDeleteAccount" class=" max-w-2xl mt-4">
            <h3>Teams</h3>
            <ul class="space-y-2 border-t border-gray-200">
                <li v-for="team in teamsToDelete" :key="team.id" class="flex justify-between items-center border-b border-gray-200 h-11">
                    <div class="flex items-center space-x-2">
                        <label class="ff-link" @click="selectTeam(team)">{{ team.label }}</label>
                        <span class="text-gray-500 text-sm">({{ team.role }})</span>
                    </div>
                    <ff-button v-if="team.role === 'owner'" kind="secondary-danger" @click="deleteTeam(team.id)">Delete Team</ff-button>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import teamApi from '../../api/team.js'
import userApi from '../../api/user.js'

import FormHeading from '../../components/FormHeading.vue'
import FormRow from '../../components/FormRow.vue'
import alerts from '../../services/alerts.js'
import dialog from '../../services/dialog.js'
import { RoleNames, Roles } from '../../utils/roles.js'

export default {
    name: 'AccountSettings',
    components: {
        FormRow,
        FormHeading
    },
    data () {
        const currentUser = this.$store.getters['account/user']
        const defaultTeamName = 'none'

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
            ownerCounts: {},
            changed: {}
        }
    },
    computed: {
        ...mapState('account', ['settings']),
        formValid () {
            return (this.changed.name || this.changed.username || this.changed.email || this.changed.defaultTeam) &&
                   (!this.emailEditingEnabled || (this.input.email && !this.errors.email)) &&
                   (this.input.username && !this.errors.username) &&
                   (this.input.name && !this.errors.name)
        },
        emailEditingEnabled () {
            return this.editing && !this.user.sso_enabled
        },
        teams () {
            const currentUser = this.$store.getters['account/user']
            const teams = this.$store.getters['account/teams']
            const teamOptions = teams.map(team => {
                if (team.id === currentUser.defaultTeam) {
                    this.defaultTeamName = team.name
                }
                return {
                    id: team.id,
                    label: team.name,
                    slug: team.slug,
                    role: RoleNames[team.role],
                    memberCount: team.memberCount,
                    owner: team.role === Roles.Owner
                }
            })
            return teamOptions
        },
        teamsToDelete () {
            return this.teams?.filter(team => {
                // user is the owner and the only owner
                return team.owner && this.ownerCounts[team.id] === 1
            })
        },
        canDeleteAccount () {
            for (let i = 0; i < this.teams.length; i++) {
                if (!this.ownerCounts[this.teams[i].id] || this.ownerCounts[this.teams[i].id] === 1) {
                    return false
                }
            }
            return true
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
    mounted () {
        // get the members for each team, and check the owner count
        this.teams.forEach(team => {
            if (team.memberCount !== 1) {
                teamApi.getTeamMembers(team.id)
                    .then(data => {
                        this.ownerCounts[team.id] = data.members.filter(m => m.role === Roles.Owner).length
                    })
                    .catch(err => {
                        console.warn(err)
                    })
            } else {
                this.ownerCounts[team.id] = 1
            }
        })
    },
    methods: {
        startEdit () {
            this.editing = true
            if (this.user.sso_enabled) {
                this.errors.email = 'Cannot modify email for SSO enabled user'
            }
        },
        resetInputs () {
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
                    alerts.emit('User successfully updated.', 'confirmation', 3000)
                    if (response?.pendingEmailChange) {
                        // delay next alert for visual separation of concerns
                        setTimeout(() => {
                            alerts.emit('Check your inbox for a link to verify your new Email Address.', 'confirmation', 7000)
                        }, 800)
                    }
                    this.user = response
                    this.teams.forEach(team => {
                        if (team.id === this.user.defaultTeam) {
                            this.defaultTeamName = team.label
                        }
                    })
                    this.changed = {}
                    this.resetInputs()
                }).catch(err => {
                    if (err.response?.data) {
                        if (/username/.test(err.response.data.error)) {
                            this.errors.username = 'Username unavailable'
                        }
                        if (err.response.data.code === 'invalid_email') {
                            this.errors.email = 'Invalid email'
                        }
                        if (/password/.test(err.response.data.error)) {
                            this.errors.password = 'Invalid username'
                        }
                        if (err.response.data.error === 'email must be unique' || err.response.data.error.includes('already in use')) {
                            this.errors.email = 'Email already registered'
                        }
                    } else {
                        alerts.emit('Error updating user', 'warning')
                    }
                }).finally(() => {
                    this.loading = false
                })
            }
        },
        deleteAccount () {
            // ask user if they are sure, if so, delete account
            dialog.show({
                header: 'Delete Account',
                kind: 'danger',
                text: `Are you sure you want to delete your account?
                       This action cannot be undone.`,
                confirmLabel: 'Delete'
            }, async () => {
                userApi.deleteUser()
                    .then(() => {
                        if (this.settings['user:offboarding-required']) {
                            window.location.href = this.settings['user:offboarding-url']
                        } else {
                            this.$store.dispatch('account/checkState')
                        }
                    })
                    .catch(error => {
                        const msg = error.response?.data?.error || 'Error deleting account'
                        alerts.emit(msg, 'warning')
                    })
            })
        },
        deleteTeam (teamId) {
            dialog.show({
                header: 'Delete Team',
                kind: 'danger',
                text: 'Are you sure you want to delete this team? This cannot be undone. All Instances and resources within this team will be removed.',
                confirmLabel: 'Delete Team'
            }, async () => {
                teamApi.deleteTeam(teamId)
                    .then(() => {
                        alerts.emit('Team successfully deleted', 'confirmation')
                        // refresh teams
                        return this.$store.dispatch('account/refreshTeams')
                    }).then(() => {
                        const activeTeam = this.$store.getters['account/team']
                        // check if the active team is one deleted
                        if (activeTeam?.id === teamId) {
                            const teams = this.$store.getters['account/teams']
                            if (teams.length > 0) {
                                // get another team
                                this.$store.dispatch('account/setTeam', teams[0].slug)
                            }
                        }
                    }).catch(err => {
                        alerts.emit('Problem deleting team', 'warning')
                        console.warn(err)
                    })
            })
        },
        selectTeam (team) {
            this.$store.dispatch('account/setTeam', team.slug)
                .then(() => this.$router.push({
                    name: 'Team',
                    params: {
                        team_slug: team.slug
                    }
                }))
                .catch(e => console.warn(e))
        }
    }
}
</script>
