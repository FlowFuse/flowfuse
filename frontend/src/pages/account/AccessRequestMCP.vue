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
            <!-- Access Level -->
            <div>
                <p class="text-gray-500 text-sm mb-2">
                    Choose whether the agent can make changes or only read data.
                </p>
                <ff-radio-group
                    v-model="accessLevel"
                    label="Access Level"
                    orientation="vertical"
                    :options="accessLevelOptions"
                />
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
                <div v-if="teamScope === 'specific' && teams.length > 0" class="mt-2 ml-6 space-y-1">
                    <ff-checkbox
                        v-for="team in teams"
                        :key="team.id"
                        :model-value="selectedTeamIds.includes(team.id)"
                        :label="team.name"
                        @update:model-value="toggleTeam(team.id)"
                    />
                </div>
                <div v-if="teamScope === 'specific' && selectedTeamIds.length === 0" class="mt-2 ml-6 text-sm text-yellow-600">
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

import client from '@/api/client.ts'
import teamApi from '@/api/team.ts'
import { useAccountAuthStore } from '@/stores/account-auth.js'

const ONE_YEAR = 1000 * 60 * 60 * 24 * 365

export default {
    name: 'AccessRequestMCP',
    components: {
        CommandLineIcon,
        KeyIcon,
        ArrowSmallRightIcon,
        ArrowSmallLeftIcon,
        FormRow
    },
    data () {
        return {
            // No defaults: the user must make an explicit choice before Allow enables
            accessLevel: null,
            teamScope: null,
            expiresAt: null,
            selectedTeamIds: [],
            teams: [],
            submitting: false,
            error: null,
            accessLevelOptions: [
                { label: 'Full access', value: 'full', description: 'Read and write operations' },
                { label: 'Read-only', value: 'readonly', description: 'Read operations only' }
            ],
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
        disableAllow () {
            if (this.submitting) return true
            if (!this.accessLevel || !this.teamScope || !this.expiryValid) return true
            if (this.teamScope === 'specific' && this.selectedTeamIds.length === 0) return true
            return false
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
        toggleTeam (teamId) {
            const idx = this.selectedTeamIds.indexOf(teamId)
            if (idx === -1) {
                this.selectedTeamIds.push(teamId)
            } else {
                this.selectedTeamIds.splice(idx, 1)
            }
        },
        async allowAccess () {
            this.submitting = true
            this.error = null
            try {
                await client.put(`/account/authorize/${this.requestId}/consent`, {
                    readOnly: this.accessLevel === 'readonly',
                    teamIds: this.teamScope === 'all' ? [] : this.selectedTeamIds,
                    expiresAt: Date.parse(this.expiresAt)
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
