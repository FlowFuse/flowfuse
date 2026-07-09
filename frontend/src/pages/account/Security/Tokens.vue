<template>
    <ff-loading v-if="loading" message="Personal Access Tokens" />
    <SectionTopMenu hero="Access Tokens" help-header="Access Tokens" info="A list of access tokens that can be used to interact with the platform API." />
    <ff-data-table
        data-el="tokens-table"
        :rows="tokens" :columns="columns" :show-search="true" search-placeholder="Search Tokens..."
        :show-load-more="false"
    >
        <template #actions>
            <ff-button data-action="new-token" @click="newToken()">
                <template #icon-left>
                    <PlusIcon />
                </template>
                Add Token
            </ff-button>
        </template>
        <template #context-menu="{row}">
            <ff-kebab-item data-action="edit-token" label="Edit" @click="editToken(row)" />
            <ff-kebab-item data-action="delete-token" label="Delete" @click="deleteToken(row)" />
        </template>
        <template v-if="tokens.length === 0" #table>
            <div class="ff-no-data ff-no-data-large">
                You don't have any tokens yet
            </div>
        </template>
    </ff-data-table>
    <TokenDialog ref="tokenDialog" @token-created="newTokenDone" @token-updated="fetchData" />
    <TokenCreated ref="tokenCreated" />
</template>

<script>
import { pluralize } from '@/composables/strings/String.js'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { markRaw } from 'vue'

import userApi from '../../../api/user.js'

import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import ExpiryCell from '../components/ExpiryCell.vue'

import TokenCreated from './dialogs/TokenCreated.vue'
import TokenDialog from './dialogs/TokenDialog.vue'

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
            tokens: [],
            columns: [
                { label: 'Name', key: 'name', sortable: true },
                {
                    label: 'Teams',
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
                                    return `This Token is scoped to the following ${pluralize('team', this.teams.length)}: \n${this.teams.map(t => t.name).join('\n')}`
                                }
                            }
                        })
                    }
                },
                {
                    label: 'Read Only',
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
                    label: 'Expires',
                    key: 'expiresAt',
                    component: {
                        is: markRaw(ExpiryCell)
                    }
                }
            ]
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
