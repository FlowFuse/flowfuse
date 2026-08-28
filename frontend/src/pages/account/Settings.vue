<template>
    <div>
        <ff-loading v-if="loading" message="" />
        <form v-else class="space-y-6" @submit.enter.prevent="">
            <FormRow v-model="input.username" :type="editing?'text':'uneditable'" :error="errors.username">{{ $t('common.fields.username') }}</FormRow>
            <FormRow v-model="input.name" :type="editing?'text':'uneditable'" :placeholder="input.username" :error="errors.name">{{ $t('account.settings.name') }}</FormRow>
            <FormRow v-model="input.email" :type="emailEditingEnabled?'email':'uneditable'" :error="errors.email">{{ $t('common.fields.email') }}</FormRow>
            <FormRow v-if="!editing" v-model="defaultTeamName" :options="teams" type="uneditable">
                {{ $t('account.settings.defaultTeam') }}
            </FormRow>
            <FormRow v-else v-model="input.defaultTeam" :options="teams" :error="errors.defaultTeam">
                {{ $t('account.settings.defaultTeam') }}
                <template #description>{{ $t('account.settings.defaultTeamDescription') }}</template>
            </FormRow>

            <FormRow v-if="!editing" v-model="themeLabel" type="uneditable">
                {{ $t('account.settings.theme') }}
            </FormRow>
            <FormRow v-else v-model="input.themeMode" :options="themeOptions">
                {{ $t('account.settings.theme') }}
                <template #description>{{ $t('account.settings.themeDescription') }}</template>
            </FormRow>

            <FormRow v-if="!editing" v-model="languageLabel" type="uneditable">
                {{ $t('account.settings.language') }}
            </FormRow>
            <FormRow v-else v-model="input.language" :options="languageOptions">
                {{ $t('account.settings.language') }}
                <template #description>{{ $t('account.settings.languageDescription') }}</template>
            </FormRow>

            <template v-if="editing">
                <div class="flex space-x-4">
                    <ff-button :disabled="!formValid" @click="confirm">{{ $t('common.actions.save') }}</ff-button>
                    <ff-button kind="secondary" @click="resetInputs">{{ $t('common.actions.cancel') }}</ff-button>
                </div>
            </template>
            <template v-else>
                <ff-button @click="startEdit">{{ $t('common.actions.edit') }}</ff-button>
            </template>
        </form>

        <FormHeading class="text-red-700 mt-6">{{ $t('account.settings.deleteAccount') }}</FormHeading>
        <div class="flex flex-col space-y-4 max-w-2xl mt-3">
            <div class="min-w-fit shrink-0">
                <ff-button class="warning" kind="danger" data-action="delete-account" :disabled="!canDeleteAccount" @click="deleteAccount">{{ $t('account.settings.deleteAccount') }}</ff-button>
            </div>
            <div v-if="!canDeleteAccount" class="grow text-gray-500">
                <div class="max-w-sm text-sm">
                    {{ $t('account.settings.deleteAccountBlocked') }}
                </div>
            </div>
        </div>
        <div v-if="!canDeleteAccount" class=" max-w-2xl mt-4">
            <h3>{{ $t('nav.teams') }}</h3>
            <ul class="space-y-2 border-t border-gray-200">
                <li v-for="team in teamsToDelete" :key="team.id" class="flex justify-between items-center border-b border-gray-200 h-11">
                    <div class="flex items-center space-x-2">
                        <label class="ff-link" @click="selectTeam(team)">{{ team.label }}</label>
                        <span class="text-gray-500 text-sm">({{ team.role }})</span>
                    </div>
                    <ff-button v-if="team.role === 'owner'" kind="secondary-danger" @click="deleteTeam(team.id)">{{ $t('account.settings.deleteTeam') }}</ff-button>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import { mapState } from 'pinia'

import teamApi from '../../api/team.js'
import userApi from '../../api/user.js'

import FormHeading from '../../components/FormHeading.vue'
import FormRow from '../../components/FormRow.vue'
import { SUPPORTED_LOCALES, setLocale, t } from '../../i18n.js'
import alerts from '../../services/alerts.js'
import dialog from '../../services/dialog.js'
import { RoleNames, Roles } from '../../utils/roles.js'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useAccountStore } from '@/stores/account.js'
import { useContextStore } from '@/stores/context.js'
import { useDataFarmTeamsStore } from '@/stores/data-farm-teams'
import { useThemeStore } from '@/stores/theme.ts'

export default {
    name: 'AccountSettings',
    components: {
        FormRow,
        FormHeading
    },
    data () {
        const currentUser = useAccountAuthStore().user
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
                defaultTeam: currentUser.defaultTeam,
                themeMode: useThemeStore().mode,
                // 'system' means "no preference stored" -> follow the browser.
                // A named sentinel rather than '' because an empty option value
                // reads as "nothing selected" to the select. Mapped to null for
                // the API in confirm().
                language: currentUser.language || 'system'
            },
            defaultTeamName,
            ownerCounts: {},
            changed: {}
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['settings']),
        ...mapState(useDataFarmTeamsStore, { storeTeams: 'teamList' }),
        themeLabel () {
            const opt = this.themeOptions.find(o => o.value === useThemeStore().mode)
            return opt ? opt.label : ''
        },
        themeOptions () {
            return [
                { label: this.$t('account.settings.themeSystem'), value: 'system' },
                { label: this.$t('account.settings.themeLight'), value: 'light' },
                { label: this.$t('account.settings.themeDark'), value: 'dark' }
            ]
        },
        languageOptions () {
            return [
                { label: this.$t('account.settings.languageSystem'), value: 'system' },
                ...SUPPORTED_LOCALES
            ]
        },
        languageLabel () {
            const opt = this.languageOptions.find(o => o.value === (this.user.language || 'system'))
            return opt ? opt.label : ''
        },
        formValid () {
            return (this.changed.name || this.changed.username || this.changed.email || this.changed.defaultTeam || this.changed.themeMode || this.changed.language) &&
                   (!this.emailEditingEnabled || (this.input.email && !this.errors.email)) &&
                   (this.input.username && !this.errors.username) &&
                   (this.input.name && !this.errors.name)
        },
        emailEditingEnabled () {
            return this.editing && !this.user.sso_enabled
        },
        teams () {
            const currentUser = this.user
            const teams = this.storeTeams
            const teamOptions = teams?.map(team => {
                if (team.id === currentUser.defaultTeam) {
                    this.defaultTeamName = team.name
                }
                return {
                    id: team.id,
                    value: team.id,
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
            for (let i = 0; i < this.teams?.length; i++) {
                if (!this.ownerCounts[this.teams[i].id] || (this.ownerCounts[this.teams[i].id] === 1 && this.teams[i].owner)) {
                    return false
                }
            }
            return true
        }
    },
    watch: {
        'input.username': function (v) {
            if (v && !/^[a-z0-9-_]+$/i.test(v)) {
                this.errors.username = t('ui.mustOnlyContainAZ09')
            } else {
                this.errors.username = ''
            }
            this.changed.username = (this.user.username !== v)
        },
        'input.email': function (v) {
            if (v && !/.+@.+/.test(v)) {
                this.errors.email = t('ui.enterAValidEmailAddress')
            } else {
                this.errors.email = ''
            }
            this.changed.email = (this.user.email !== v)
        },
        'input.name': function (v) {
            if (v && /:\/\//i.test(v)) {
                this.errors.name = this.$t('auth.signUp.errors.nameNotUrl')
            } else {
                this.errors.name = ''
            }
            this.changed.name = (this.user.name !== v)
        },
        'input.defaultTeam': function (v) {
            this.changed.defaultTeam = (this.user.defaultTeam !== v)
        },
        'input.themeMode': function (v) {
            this.changed.themeMode = (useThemeStore().mode !== v)
        },
        'input.language': function (v) {
            this.changed.language = ((this.user.language || 'system') !== v)
        }
    },
    mounted () {
        // get the members for each team, and check the owner count
        this.teams?.forEach(team => {
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
                this.errors.email = this.$t('account.settings.emailSsoLocked')
            }
        },
        resetInputs () {
            this.input.username = this.user.username
            this.input.name = this.user.name
            this.input.email = this.user.email
            this.input.defaultTeam = this.user.defaultTeam
            this.input.themeMode = useThemeStore().mode
            this.input.language = this.user.language || 'system'
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
            if (this.input.language !== (this.user.language || 'system')) {
                // 'system' clears the stored preference
                opts.language = this.input.language === 'system' ? null : this.input.language
                changed = true
            }
            const themeStore = useThemeStore()
            if (this.input.themeMode !== themeStore.mode) {
                themeStore.setMode(this.input.themeMode)
            }
            if (!changed) {
                // Only theme (a local preference) changed — no API call needed
                this.changed = {}
                this.resetInputs()
                this.loading = false
                return
            }
            if (changed) {
                userApi.updateUser(opts).then((response) => {
                    useAccountAuthStore().setUser(response)
                    if (Object.hasOwn(opts, 'language')) {
                        // Apply immediately rather than waiting for a reload
                        setLocale(response.language || navigator.language)
                    }
                    alerts.emit(this.$t('account.settings.updated'), 'confirmation', 3000)
                    if (response?.pendingEmailChange) {
                        // delay next alert for visual separation of concerns
                        setTimeout(() => {
                            alerts.emit(this.$t('account.settings.pendingEmailChange'), 'confirmation', 7000)
                        }, 800)
                    }
                    this.user = response
                    this.teams?.forEach(team => {
                        if (team.id === this.user.defaultTeam) {
                            this.defaultTeamName = team.label
                        }
                    })
                    this.changed = {}
                    this.resetInputs()
                }).catch(err => {
                    if (err.response?.data) {
                        if (/username/.test(err.response.data.error)) {
                            this.errors.username = t('ui.usernameUnavailable')
                        }
                        if (err.response.data.code === 'invalid_email') {
                            this.errors.email = t('ui.invalidEmail')
                        }
                        if (/password/.test(err.response.data.error)) {
                            this.errors.password = t('ui.invalidUsername')
                        }
                        if (err.response.data.error === 'email must be unique' || err.response.data.error.includes('already in use')) {
                            this.errors.email = t('ui.emailAlreadyRegistered')
                        }
                    } else {
                        alerts.emit(t('ui.errorUpdatingUser'), 'warning')
                    }
                }).finally(() => {
                    this.loading = false
                })
            }
        },
        deleteAccount () {
            // ask user if they are sure, if so, delete account
            dialog.show({
                header: t('ui.deleteAccount'),
                kind: 'danger',
                text: `Are you sure you want to delete your account?
                       This action cannot be undone.`,
                confirmLabel: 'Delete'
            }, async () => {
                await useAccountAuthStore().disconnectSubscribers()
                userApi.deleteUser()
                    .then(() => {
                        if (this.settings['user:offboarding-required']) {
                            window.location.href = this.settings['user:offboarding-url']
                        } else {
                            useAccountAuthStore().checkState()
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
                header: t('ui.deleteTeam'),
                kind: 'danger',
                text: t('ui.areYouSureYouWantToDeleteThisTeamThisCannotBeUnd'),
                confirmLabel: 'Delete Team'
            }, async () => {
                teamApi.deleteTeam(teamId)
                    .then(() => {
                        alerts.emit(t('ui.teamSuccessfullyDeleted'), 'confirmation')
                        // refresh teams
                        return useDataFarmTeamsStore().fetchTeamList()
                    }).then(() => {
                        const teams = useDataFarmTeamsStore().teamList
                        const team = useContextStore().team
                        // check if the active team is one deleted
                        if (team?.id === teamId) {
                            if (teams.length > 0) {
                                // get another team
                                useAccountStore().setTeam(teams[0].slug)
                            }
                        }
                    }).catch(err => {
                        alerts.emit(t('ui.problemDeletingTeam'), 'warning')
                        console.warn(err)
                    })
            })
        },
        selectTeam (team) {
            useAccountStore().setTeam(team.slug)
                .then(() => this.$router.push({
                    name: 'team',
                    params: {
                        team_slug: team.slug
                    }
                }))
                .catch(e => console.warn(e))
        }
    }
}
</script>
