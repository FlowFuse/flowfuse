<template>
    <ff-loading v-if="loading" message="Personal Access Tokens" />
    <ff-data-table
        data-el="tokens-table"
        :rows="tokens" :columns="columns" :show-search="true" search-placeholder="Search Tokens..."
        :show-load-more="false"
    >
        <template #actions>
            <ff-button data-action="new-token" @click="newToken()">
                New Token
            </ff-button>
        </template>
        <template #context-menu="{row}">
            <ff-list-item data-action="edit-token" label="Edit" @click="editToken(row)" />
            <ff-list-item data-action="delete-token" label="Delete" @click="deleteToken(row)" />
        </template>
    </ff-data-table>
    <TokenDialog ref="tokenDialog" @token-created="newTokenDone" @token-updated="fetchData" />
    <TokenCreated ref="tokenCreated" />
</template>

<script>
import { markRaw } from 'vue'

import userApi from '../../../api/user.js'

import ExpiryCell from '../components/ExpiryCell.vue'

import TokenCreated from './dialogs/TokenCreated.vue'
import TokenDialog from './dialogs/TokenDialog.vue'

export default {
    name: 'PersonalAccessTokens',
    components: {
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
            this.tokens = await userApi.getPersonalAccessTokens()
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
