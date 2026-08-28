<template>
    <ff-loading v-if="loading" :message="$t('ui.personalAccessTokens')" />
    <SectionTopMenu :hero="$t('ui.accessTokens')" :help-header="$t('ui.accessTokens')" :info="$t('ui.aListOfAccessTokensThatCanBeUsedToInteractWithTh')" />
    <ff-data-table
        data-el="tokens-table"
        :rows="tokens" :columns="columns" :show-search="true" :search-placeholder="$t('ui.searchTokens')"
        :show-load-more="false"
    >
        <template #actions>
            <ff-button data-action="new-token" @click="newToken()">
                <template #icon-left>
                    <PlusIcon />
                </template>
                {{ $t('ui.addToken') }}
            </ff-button>
        </template>
        <template #context-menu="{row}">
            <ff-kebab-item data-action="edit-token" :label="$t('ui.edit')" @click="editToken(row)" />
            <ff-kebab-item data-action="delete-token" :label="$t('ui.delete')" @click="deleteToken(row)" />
        </template>
        <template v-if="tokens.length === 0" #table>
            <div class="ff-no-data ff-no-data-large">
                {{ $t('ui.youDonTHaveAnyTokensYet') }}
            </div>
        </template>
    </ff-data-table>
    <TokenDialog ref="tokenDialog" @token-created="newTokenDone" @token-updated="fetchData" />
    <TokenCreated ref="tokenCreated" />
</template>

<script>
import { PlusIcon } from '@heroicons/vue/24/outline'
import { markRaw } from 'vue'

import userApi from '../../../api/user.js'

import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import { t } from '../../../i18n.js'
import ExpiryCell from '../components/ExpiryCell.vue'

import TokenCreated from './dialogs/TokenCreated.vue'
import TokenDialog from './dialogs/TokenDialog.vue'

import { useAccountAuthStore } from '@/stores/account-auth.js'

export default {
    name: 'PersonalAccessTokens',
    components: {
        PlusIcon,
        SectionTopMenu,
        TokenDialog,
        TokenCreated
    },
    data () {
        return {
            loading: false,
            tokens: []
        }
    },
    computed: {
        isAdmin () {
            return useAccountAuthStore().isAdminUser
        },
        columns () {
            return [
                { label: t('ui.name'), key: 'name', sortable: true },
                {
                    label: t('ui.teams'),
                    key: 'teams',
                    sortable: false,
                    component: {
                        is: markRaw({
                            name: 'TeamsCell',
                            props: ['teams'],
                            template: '<span :title="tooltip" style="cursor:help">{{ label }}</span>',
                            computed: {
                                label () {
                                    if (!this.teams || this.teams.length === 0) {
                                        return 'All Teams'
                                    }
                                    return 'Team Scoped'
                                },
                                tooltip () {
                                    if (!this.teams || this.teams.length === 0) {
                                        return 'This token has access to all teams in your account'
                                    }
                                    return `${this.$t('ui.thisTokenIsScopedToTheFollowingTeams')}\n${this.teams.map(t => t.name).join('\n')}`
                                }
                            }
                        })
                    }
                },
                {
                    label: t('ui.readOnly'),
                    key: 'readOnly',
                    sortable: false,
                    component: {
                        is: markRaw({
                            name: 'ReadOnlyCell',
                            props: ['readOnly'],
                            template: '<span v-if="readOnly" class="ff-badge ff-badge--info">Read Only</span><span v-else></span>'
                        })
                    }
                },
                {
                    label: t('ui.adminAccess'),
                    key: 'adminOptIn',
                    sortable: false,
                    hidden: !this.isAdmin,
                    component: {
                        is: markRaw({
                            name: 'AdminOptInCell',
                            props: ['adminOptIn'],
                            template: '<span v-if="adminOptIn" class="text-green-500">&#x2714;</span><span v-else class="text-red-500">&#x2718;</span>'
                        })
                    }
                },
                {
                    label: t('ui.expires'),
                    key: 'expiresAt',
                    component: {
                        is: markRaw(ExpiryCell)
                    }
                }
            ].filter(col => !col.hidden)
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData: async function () {
            this.loading = true
            const tokenResponse = await userApi.getPersonalAccessTokens()
            this.tokens = tokenResponse.tokens
            this.loading = false
        },
        newToken () {
            this.$refs.tokenDialog.showCreate()
        },
        newTokenDone (token) {
            this.$refs.tokenCreated.showToken(token)
            this.fetchData()
        },
        editToken (row) {
            this.$refs.tokenDialog.showEdit(row)
        },
        deleteToken: async function (row) {
            await userApi.deletePersonalAccessToken(row.id)
            this.fetchData()
        }
    }
}
</script>
