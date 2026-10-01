<template>
    <div class="flex flex-col items-center">
        <h2>An MCP agent is requesting access to your account</h2>
        <div v-if="user" class="flex flex-row justify-center my-4">
            <div class="flex items-center">
                <CommandLineIcon class="w-12" />
                <ArrowSmallLeftIcon class="w-8" />
                <KeyIcon class="w-8" />
                <ArrowSmallRightIcon class="w-8" />
                <div class="ff-user">
                    <img :src="user.avatar" class="ff-avatar-large">
                </div>
            </div>
        </div>

        <div class="w-full max-w-md space-y-4 my-4">
            <!-- Tool Permissions -->
            <div>
                <p class="text-gray-500 text-sm mb-2">
                    Choose what the agent can do in your teams. You can change this for individual teams below.
                </p>
                <McpToolPermissions v-model="defaultPermissions" :disabled="defaultUnused" />
                <p v-if="defaultPermissionsNote" class="text-gray-500 text-sm mt-2" data-el="default-permissions-note">
                    {{ defaultPermissionsNote }}
                </p>
            </div>

            <!-- Team Scope -->
            <div>
                <p class="text-gray-500 text-sm mb-2">
                    Limit the agent to specific teams, or grant access to all teams you belong to.
                </p>
                <ff-radio-group
                    v-model="teamScope"
                    label="Team Access"
                    orientation="vertical"
                    :options="teamScopeOptions"
                />
            </div>

            <!-- Team Permissions -->
            <div v-if="teams.length > 0">
                <label class="block text-sm font-medium mb-1">Team Permissions</label>
                <p class="text-gray-500 text-sm mb-2">
                    Each team uses the permissions above unless you edit it.
                </p>
                <div class="space-y-2">
                    <div v-for="team in teams" :key="team.id" data-el="mcp-team-row">
                        <div class="flex items-center justify-between min-h-6">
                            <ff-checkbox
                                v-if="teamScope === 'specific'"
                                :model-value="selectedTeamIds.includes(team.id)"
                                :label="team.name"
                                @update:model-value="toggleTeam(team.id)"
                            />
                            <span v-else class="text-sm font-medium">{{ team.name }}</span>
                            <div v-if="isInScope(team.id)" class="flex items-center gap-3 text-sm">
                                <span class="text-gray-500" data-el="team-permissions-state">{{ isCustom(team.id) ? 'Custom' : 'Default' }}</span>
                                <ff-button
                                    v-if="isCustom(team.id)"
                                    kind="tertiary"
                                    size="small"
                                    data-action="reset-team-default"
                                    @click="resetToDefault(team.id)"
                                >
                                    Reset
                                </ff-button>
                                <ff-button
                                    kind="tertiary"
                                    size="small"
                                    data-action="customise-team"
                                    :aria-expanded="isOpen(team.id)"
                                    @click="toggleCustomise(team.id)"
                                >
                                    {{ isOpen(team.id) ? 'Close' : 'Edit' }}
                                </ff-button>
                            </div>
                        </div>
                        <div v-if="isInScope(team.id) && isOpen(team.id)" class="ml-6 mt-2 mb-1">
                            <McpToolPermissions
                                :model-value="teamPermissions(team.id)"
                                @update:model-value="value => onTeamPermissionsChange(team.id, value)"
                            />
                        </div>
                    </div>
                </div>
                <div v-if="teamScope === 'specific' && selectedTeamIds.length === 0" class="mt-2 text-sm text-yellow-600">
                    Select at least one team.
                </div>
            </div>

            <!-- Expiry -->
            <div>
                <label class="block text-sm font-medium mb-1">Expiry</label>
                <p class="text-gray-500 text-sm mb-2">
                    Choose when this access expires. It cannot last longer than a year.
                </p>
                <FormRow v-model="expiresAt" data-form="expiry-date" type="date" />
                <div v-if="expiresAt && !expiryValid" class="mt-2 text-sm text-yellow-600">
                    Pick a date in the future, at most one year away.
                </div>
            </div>
        </div>

        <div v-if="error" class="text-red-600 text-sm mb-4">{{ error }}</div>

        <div class="ff-actions flex flex-row">
            <ff-button class="mx-8" data-action="deny-access" @click="denyAccess">Deny</ff-button>
            <ff-button class="mx-8" data-action="allow-access" :disabled="disableAllow" @click="allowAccess">Allow</ff-button>
        </div>
    </div>
</template>

<script>
import { ArrowSmallLeftIcon, ArrowSmallRightIcon, CommandLineIcon, KeyIcon } from '@heroicons/vue/20/solid'
import { mapState } from 'pinia'

import FormRow from '../../components/FormRow.vue'
import McpToolPermissions from '../../components/mcp/McpToolPermissions.vue'

import client from '@/api/client.ts'
import teamApi from '@/api/team.ts'
import { useAccountAuthStore } from '@/stores/account-auth.js'

const ONE_DAY = 1000 * 60 * 60 * 24
const ONE_YEAR = ONE_DAY * 365

function defaultExpiresAt () {
    const date = new Date(Date.now() + ONE_YEAR - ONE_DAY)
    return date.toISOString().split('T')[0]
}

function defaultToolPermissions () {
    return {
        platform: { read: true, write: true, destructive: false },
        flow_building: { read: true, write: true, destructive: true }
    }
}

function permissionsEqual (a, b) {
    return ['platform', 'flow_building'].every(group => (
        ['read', 'write', 'destructive'].every(category => !!a[group][category] === !!b[group][category])
    ))
}

export default {
    name: 'AccessRequestMCP',
    components: {
        CommandLineIcon,
        KeyIcon,
        ArrowSmallRightIcon,
        ArrowSmallLeftIcon,
        FormRow,
        McpToolPermissions
    },
    data () {
        return {
            teamScope: null,
            expiresAt: defaultExpiresAt(),
            selectedTeamIds: [],
            teams: [],
            defaultPermissions: defaultToolPermissions(),
            teamOverrides: {},
            openTeamIds: [],
            submitting: false,
            error: null,
            teamScopeOptions: [
                { label: 'All teams', value: 'all', description: 'Access all teams you belong to' },
                { label: 'Specific teams', value: 'specific', description: 'Choose which teams to grant access to' }
            ]
        }
    },
    computed: {
        ...mapState(useAccountAuthStore, ['user']),
        requestId () {
            return this.$router.currentRoute.value.params.id
        },
        expiryValid () {
            if (!this.expiresAt) return false
            const ts = Date.parse(this.expiresAt)
            if (Number.isNaN(ts)) return false
            return ts > Date.now() && ts <= Date.now() + ONE_YEAR
        },
        // With specific teams all customised, no team the token reaches uses the defaults. With all
        // teams they still apply to teams the user joins later.
        defaultUnused () {
            return this.teamScope === 'specific' && this.selectedTeamIds.length > 0 && this.selectedTeamIds.every(teamId => this.isCustom(teamId))
        },
        defaultPermissionsNote () {
            if (this.teamScope === 'all') {
                return this.teams.length > 0 && this.teams.every(team => this.isCustom(team.id))
                    ? 'Every team you belong to has custom permissions, so these only apply to teams you join later.'
                    : 'These apply to every team without custom permissions, including teams you join later.'
            }
            if (this.teamScope === 'specific') {
                return this.defaultUnused
                    ? 'Not used, every selected team has custom permissions.'
                    : 'These apply to the selected teams without custom permissions.'
            }
            return null
        },
        disableAllow () {
            if (this.submitting) return true
            if (!this.teamScope || !this.expiryValid) return true
            if (this.teamScope === 'specific' && this.selectedTeamIds.length === 0) return true
            return false
        }
    },
    watch: {
        teamScope () {
            this.teamOverrides = {}
            this.openTeamIds = []
        }
    },
    async mounted () {
        try {
            const data = await teamApi.getTeams()
            this.teams = data.teams
        } catch (err) {
            // Teams will just be empty, user can still grant all-teams access
        }
    },
    methods: {
        isInScope (teamId) {
            return this.teamScope === 'all' || (this.teamScope === 'specific' && this.selectedTeamIds.includes(teamId))
        },
        isCustom (teamId) {
            return Object.prototype.hasOwnProperty.call(this.teamOverrides, teamId)
        },
        isOpen (teamId) {
            return this.openTeamIds.includes(teamId)
        },
        teamPermissions (teamId) {
            return this.teamOverrides[teamId] || this.defaultPermissions
        },
        toggleTeam (teamId) {
            const idx = this.selectedTeamIds.indexOf(teamId)
            if (idx === -1) {
                this.selectedTeamIds.push(teamId)
            } else {
                this.selectedTeamIds.splice(idx, 1)
                this.resetToDefault(teamId)
                this.openTeamIds = this.openTeamIds.filter(id => id !== teamId)
            }
        },
        toggleCustomise (teamId) {
            this.openTeamIds = this.openTeamIds.includes(teamId)
                ? this.openTeamIds.filter(id => id !== teamId)
                : [...this.openTeamIds, teamId]
        },
        onTeamPermissionsChange (teamId, value) {
            if (permissionsEqual(value, this.defaultPermissions)) {
                const { [teamId]: _removed, ...rest } = this.teamOverrides
                this.teamOverrides = rest
            } else {
                this.teamOverrides = { ...this.teamOverrides, [teamId]: value }
            }
        },
        resetToDefault (teamId) {
            if (this.isCustom(teamId)) {
                const { [teamId]: _removed, ...rest } = this.teamOverrides
                this.teamOverrides = rest
            }
        },
        async allowAccess () {
            this.submitting = true
            this.error = null
            try {
                await client.put(`/account/authorize/${this.requestId}/consent`, {
                    teamIds: this.teamScope === 'all' ? [] : this.selectedTeamIds,
                    expiresAt: Date.parse(this.expiresAt),
                    toolPermissions: { default: this.defaultPermissions, teams: this.teamOverrides }
                })
                window.location.href = `/account/complete/${this.requestId}`
            } catch (err) {
                this.error = err.response?.data?.description || 'Failed to process request. Please try again.'
                this.submitting = false
            }
        },
        denyAccess () {
            window.location.href = `/account/reject/${this.requestId}`
        }
    }
}
</script>
