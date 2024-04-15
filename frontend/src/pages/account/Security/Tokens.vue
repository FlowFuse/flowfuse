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
                    <PlusSmIcon />
                </template>
                Add Token
            </ff-button>
        </template>
        <template #context-menu="{row}">
            <ff-list-item data-action="edit-token" label="Edit" @click="editToken(row)" />
            <ff-list-item data-action="delete-token" label="Delete" @click="deleteToken(row)" />
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
import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import userApi from '../../../api/user.js'

import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import ExpiryCell from '../components/ExpiryCell.vue'

import TokenCreated from './dialogs/TokenCreated.vue'
import TokenDialog from './dialogs/TokenDialog.vue'

export default {
    name: 'PersonalAccessTokens',
    components: {
        PlusSmIcon,
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
                // { label: 'Scope', key: 'scope' },
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
