<template>
    <ff-dialog ref="dialog" data-el="add-token-dialog" :header="(token ? 'Edit' : 'Add') + ' Token'" :confirm-label="token ? 'Save' : 'Create'" :disablePrimary="disableConfirm" @confirm="confirm()">
        <template #default>
            <form class="space-y-4" @submit.prevent>
                <p class="text-sm text-gray-500">
                    Personal access tokens allow external tools and scripts to authenticate with the platform API on your behalf.
                    Configure the token's permissions below to control what it can access.
                </p>

                <!-- Token Name -->
                <div class="border-t pt-4">
                    <label class="block text-sm font-medium mb-1">Token Name</label>
                    <p class="text-gray-500 text-sm mb-2">A descriptive name to help you identify this token later.</p>
                    <FormRow v-model="input.name" data-form="token-name" :disabled="edit" />
                </div>

                <!-- Expiry -->
                <div class="border-t pt-4">
                    <label class="block text-sm font-medium mb-1">Expiry</label>
                    <p class="text-gray-500 text-sm mb-2">Set an expiration date after which the token will stop working. Recommended for security.</p>
                    <ff-checkbox v-model="input.expires" data-form="expiry-toggle" label="Add Expiry Date" />
                    <div v-if="input.expires" class="mt-2 ml-6">
                        <FormRow v-model="input.expiresAt" data-form="token-expiry" type="date" />
                    </div>
                </div>

                <!-- Read Only -->
                <div class="border-t pt-4">
                    <label class="block text-sm font-medium mb-1">Access Level</label>
                    <p class="text-gray-500 text-sm mb-2">Restrict this token to read-only operations. Write operations like creating, updating, or deleting resources will be denied.</p>
                    <ff-checkbox v-model="input.readOnly" data-form="readonly-toggle" label="Read Only" />
                </div>

                <!-- Team Scope -->
                <div class="border-t pt-4">
                    <label class="block text-sm font-medium mb-1">Team Scope</label>
                    <p class="text-gray-500 text-sm mb-2">Limit this token to specific teams. If none are selected, the token can access all teams you belong to.</p>
                    <div v-if="teams.length > 0" class="space-y-2 ml-2">
                        <ff-checkbox
                            v-for="team in teams"
                            :key="team.id"
                            :model-value="input.teamIds.includes(team.id)"
                            :label="team.name"
                            :data-form="'team-scope-' + team.id"
                            @update:model-value="toggleTeam(team.id)"
                        />
                    </div>
                    <div v-if="input.teamIds.length === 0" class="mt-2 text-sm text-yellow-600">
                        This token will have access to all teams you belong to, including teams you join in the future.
                    </div>
                </div>

                <!-- Admin Opt-In -->
                <div v-if="isAdmin" class="border-t pt-4">
                    <label class="block text-sm font-medium mb-1">Admin Access</label>
                    <p class="text-gray-500 text-sm mb-2">By default, tokens do not carry admin privileges even if your account is an admin. Enable this to grant admin-level access to the token.</p>
                    <ff-checkbox v-model="input.adminOptIn" data-form="admin-optin-toggle" label="Enable Admin Privileges" />
                </div>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'pinia'

import userApi from '@/api/user.js'
import { useAccountAuthStore } from '@/stores/index.js'
import { useAccountStore } from '@/stores/index.js'

import FormRow from '../../../../components/FormRow.vue'

export default {
    name: 'TokenDialog',
    components: {
        FormRow
    },
    emits: ['token-created', 'token-updated'],
    setup () {
        return {
            showCreate () {
                this.$refs.dialog.show()
                this.token = null
                this.input = {
                    id: null,
                    name: '',
                    expiresAt: null,
                    expires: false,
                    readOnly: false,
                    adminOptIn: false,
                    teamIds: []
                }
                this.edit = false
            },
            showEdit (row) {
                this.token = row
                this.input = {
                    id: row.id,
                    name: row.name,
                    readOnly: row.readOnly ?? false,
                    adminOptIn: row.adminOptIn ?? false,
                    teamIds: (row.teams ?? []).map(t => t.id)
                }
                if (row.expiresAt === null) {
                    this.input.expires = false
                } else {
                    this.input.expires = true
                    this.input.expiresAt = row.expiresAt.split('T')[0]
                }
                this.edit = true
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            token: null,
            scopes: [],
            input: {
                id: null,
                name: '',
                scope: {},
                expiresAt: null,
                expires: true,
                readOnly: false,
                adminOptIn: false,
                teamIds: []
            },
            edit: false
        }
    },
    computed: {
        ...mapState(useAccountStore, ['teams']),
        isAdmin () {
            return useAccountAuthStore().isAdminUser
        },
        disableConfirm () {
            if (!this.input.name) {
                return true
            }
            return this.input.expires && !this.input.expiresAt;

        }
    },
    methods: {
        toggleTeam (teamId) {
            const idx = this.input.teamIds.indexOf(teamId)
            if (idx === -1) {
                this.input.teamIds.push(teamId)
            } else {
                this.input.teamIds.splice(idx, 1)
            }
        },
        confirm: async function () {
            const scopeOpts = {
                readOnly: this.input.readOnly,
                adminOptIn: this.input.adminOptIn,
                teamIds: this.edit ? this.input.teamIds : (this.input.teamIds.length > 0 ? this.input.teamIds : undefined)
            }
            if (!this.edit) {
                let array = []
                if (this.input.scope) {
                    array = Object.keys(this.input.scope).map(k => k)
                }
                const request = {
                    name: this.input.name,
                    scope: array.join(',')
                }
                if (this.input.expires) {
                    request.expiresAt = Date.parse(this.input.expiresAt)
                }
                const token = await userApi.createPersonalAccessToken(request.name, request.scope, request.expiresAt, scopeOpts)
                this.$emit('token-created', token)
            } else {
                let array = []
                if (this.input.scope) {
                    array = Object.keys(this.input.scope)?.map(k => k)
                }
                const request = {
                    id: this.input.id,
                    scope: array.join(',')
                }
                if (this.input.expires) {
                    request.expiresAt = Date.parse(this.input.expiresAt)
                } else {
                    request.expiresAt = undefined
                }

                try {
                    await userApi.updatePersonalAccessToken(request.id, request.scope, request.expiresAt, scopeOpts)
                } catch (err) {
                    console.error(err)
                }
                this.$emit('token-updated')
            }
        }
    }
}
</script>
