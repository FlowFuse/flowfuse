<template>
    <div class="flex flex-col items-center">
        <h2>{{ $t('ui.anMcpAgentIsRequestingAccessToYourAccount') }}</h2>
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
                    {{ $t('ui.chooseWhetherTheAgentCanMakeChangesOrOnlyReadDat') }}
                </p>
                <ff-radio-group
                    v-model="accessLevel"
                    :label="$t('ui.accessLevel')"
                    orientation="vertical"
                    :options="accessLevelOptions"
                />
            </div>

            <!-- Team Scope -->
            <div>
                <p class="text-gray-500 text-sm mb-2">
                    {{ $t('ui.limitTheAgentToSpecificTeamsOrGrantAccessToAllTe') }}
                </p>
                <ff-radio-group
                    v-model="teamScope"
                    :label="$t('ui.teamAccess')"
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
                    {{ $t('ui.selectAtLeastOneTeam') }}
                </div>
            </div>
        </div>

        <div v-if="error" class="text-red-600 text-sm mb-4">{{ error }}</div>

        <div class="ff-actions flex flex-row">
            <ff-button class="mx-8" data-action="deny-access" @click="denyAccess">{{ $t('ui.deny') }}</ff-button>
            <ff-button class="mx-8" data-action="allow-access" :disabled="disableAllow" @click="allowAccess">{{ $t('ui.allow') }}</ff-button>
        </div>
    </div>
</template>

<script>
import { ArrowSmallLeftIcon, ArrowSmallRightIcon, CommandLineIcon, KeyIcon } from '@heroicons/vue/20/solid'
import { mapState } from 'pinia'

import { t } from '../../i18n.js'

import client from '@/api/client.ts'
import teamApi from '@/api/team.ts'
import { useAccountAuthStore } from '@/stores/account-auth.js'

export default {
    name: 'AccessRequestMCP',
    components: {
        CommandLineIcon,
        KeyIcon,
        ArrowSmallRightIcon,
        ArrowSmallLeftIcon
    },
    data () {
        return {
            accessLevel: 'full',
            teamScope: 'all',
            selectedTeamIds: [],
            teams: [],
            submitting: false,
            error: null,
            accessLevelOptions: [
                { label: t('ui.fullAccess'), value: 'full', description: t('ui.readAndWriteOperations') },
                { label: t('ui.readOnly2'), value: 'readonly', description: t('ui.readOperationsOnly') }
            ],
            teamScopeOptions: [
                { label: t('ui.allTeams'), value: 'all', description: t('ui.accessAllTeamsYouBelongTo') },
                { label: t('ui.specificTeams'), value: 'specific', description: t('ui.chooseWhichTeamsToGrantAccessTo') }
            ]
        }
    },
    computed: {
        ...mapState(useAccountAuthStore, ['user']),
        requestId () {
            return this.$router.currentRoute.value.params.id
        },
        disableAllow () {
            if (this.submitting) return true
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
                    teamIds: this.teamScope === 'all' ? [] : this.selectedTeamIds
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
