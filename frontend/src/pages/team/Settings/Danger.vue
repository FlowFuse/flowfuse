<template>
    <div class="space-y-6">
        <template v-if="teamTypes.length > 1 && !team.suspended">
            <FormHeading>Change Team Type</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="grow">
                    <div class="max-w-sm pr-2">Change to a different team type</div>
                </div>
                <div class="min-w-fit shrink-0">
                    <ff-button data-action="change-team-type" :to="{name: 'TeamChangeType'}">Change Team Type</ff-button>
                </div>
            </div>
        </template>
        <template v-if="!team.suspended">
            <FormHeading class="text-red-700">Suspend Team</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="grow">
                    <div class="max-w-sm pr-2">Suspending the team will suspend all instances and prevent any further activity on the team.</div>
                    <div v-if="features.billing">Billing stops immediately and <span class="font-bold">the team's subscription is canceled.</span></div>
                </div>
                <div class="min-w-fit shrink-0">
                    <ff-button kind="danger" data-action="suspend-team" @click="showConfirmSuspendDialog()">Suspend Team</ff-button>
                    <ConfirmTeamSuspendDialog ref="confirmTeamSuspendDialog" @suspend-team="suspendTeam" />
                </div>
            </div>
        </template>
        <template v-else>
            <FormHeading class="text-red-700">Reactivate Team</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="grow">
                    <div class="max-w-sm pr-2">This team is currently suspended.</div>
                </div>
                <div class="min-w-fit shrink-0">
                    <ff-button kind="danger" data-action="unsuspend-team" @click="unsuspendTeam()">Reactivate Team</ff-button>
                </div>
            </div>
        </template>
        <FormHeading class="text-red-700">Delete Team</FormHeading>
        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="grow">
                <div class="max-w-sm pr-2">Deleting the team cannot be undone. It permanently removes all data, users, and instances.</div>
                <div v-if="features.billing">Billing stops immediately and <span class="font-bold">the team's subscription is canceled.</span></div>
            </div>
            <div class="min-w-fit shrink-0">
                <ff-button kind="danger" data-action="delete-team" @click="showConfirmDeleteDialog()">Delete Team</ff-button>
                <ConfirmTeamDeleteDialog ref="confirmTeamDeleteDialog" @delete-team="deleteTeam" />
            </div>
        </div>
        <template v-if="featuresCheck.isAiFeatureEnabledForPlatform">
            <FormHeading>AI Features</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="grow">
                    <div class="max-w-sm pr-2">Enable or disable all AI features for this team. When disabled, AI functionality such as the Expert Assistant, inline code completions, and snapshot description generation will be unavailable.</div>
                </div>
                <div class="min-w-fit shrink-0">
                    <ff-toggle-switch v-model="aiEnabled" data-el="team-ai-toggle" @change="showConfirmAiToggleDialog" />
                </div>
            </div>
        </template>
        <TeamAdminTools v-if="isAdmin" :team="team" />
    </div>
</template>

<script>
import { mapState } from 'pinia'

import teamApi from '../../../api/team.js'
import teamTypesApi from '../../../api/teamTypes.js'

import FormHeading from '../../../components/FormHeading.vue'

import alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

import ConfirmTeamDeleteDialog from '../dialogs/ConfirmTeamDeleteDialog.vue'
import ConfirmTeamSuspendDialog from '../dialogs/ConfirmTeamSuspendDialog.vue'

import TeamAdminTools from './TeamAdminTools.vue'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'TeamSettingsDanger',
    components: {
        FormHeading,
        ConfirmTeamDeleteDialog,
        ConfirmTeamSuspendDialog,
        TeamAdminTools
    },
    data () {
        return {
            teamTypes: [],
            aiEnabledOverride: null
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['features', 'featuresCheck']),
        ...mapState(useAccountAuthStore, ['user']),
        isAdmin: function () {
            return this.user.admin
        },
        aiEnabled: {
            get () {
                if (this.aiEnabledOverride !== null) {
                    return this.aiEnabledOverride
                }
                return this.team?.type?.properties?.features?.ai !== false
            },
            set (value) {
                this.aiEnabledOverride = value
            }
        }
    },
    async created () {
        const teamTypesPromise = await teamTypesApi.getTeamTypes()

        this.teamTypes = (await teamTypesPromise).types
    },
    methods: {
        showConfirmDeleteDialog () {
            this.$refs.confirmTeamDeleteDialog.show(this.team)
        },
        deleteTeam () {
            teamApi.deleteTeam(this.team.id).then(() => {
                alerts.emit('Team successfully deleted', 'confirmation')
                useAccountAuthStore().checkState('/')
            }).catch(err => {
                alerts.emit('Problem deleting team', 'warning')
                console.warn(err)
            })
        },
        showConfirmSuspendDialog () {
            this.$refs.confirmTeamSuspendDialog.show(this.team)
        },
        suspendTeam () {
            teamApi.updateTeam(this.team.id, { suspended: true }).then(() => {
                alerts.emit('Team successfully suspended', 'confirmation')
                useContextStore().refreshTeam()
            }).catch(err => {
                alerts.emit('Problem suspending team', 'warning')
                console.warn(err)
            })
        },
        unsuspendTeam () {
            teamApi.updateTeam(this.team.id, { suspended: false }).then(() => {
                alerts.emit('Team successfully reactivated', 'confirmation')
                useContextStore().refreshTeam()
            }).catch(err => {
                alerts.emit('Problem suspending team', 'warning')
                console.warn(err)
            })
        },
        showConfirmAiToggleDialog () {
            const enabling = this.aiEnabled
            Dialog.show({
                header: enabling ? 'Enable AI Features' : 'Disable AI Features',
                kind: enabling ? 'primary' : 'danger',
                text: enabling
                    ? 'Are you sure you want to enable AI features for this team? This will make AI functionality such as the Expert Assistant, inline code completions, and snapshot description generation available to team members.'
                    : 'Are you sure you want to disable AI features for this team? This will make AI functionality such as the Expert Assistant, inline code completions, and snapshot description generation unavailable to team members. Running instances will need to be restarted for changes to take full effect.',
                confirmLabel: enabling ? 'Enable' : 'Disable'
            }, () => {
                teamApi.updateTeam(this.team.id, { features: { ai: enabling } }).then(() => {
                    alerts.emit(`AI features ${enabling ? 'enabled' : 'disabled'}`, 'confirmation')
                    this.aiEnabledOverride = null
                    useContextStore().refreshTeam()
                }).catch(err => {
                    alerts.emit('Problem updating AI settings', 'warning')
                    this.aiEnabledOverride = null
                    console.warn(err)
                })
            }, () => {
                this.aiEnabledOverride = null
            })
        }
    }
}
</script>
