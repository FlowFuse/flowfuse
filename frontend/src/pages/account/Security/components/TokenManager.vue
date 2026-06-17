<template>
    <ff-loading v-if="loading" :message="hero" />
    <SectionTopMenu :hero="hero" :help-header="helpHeader || hero" :info="info" />
    <ff-data-table
        data-el="tokens-table"
        :rows="tokens" :columns="columns" :show-search="true" search-placeholder="Search Tokens..."
        :show-load-more="false"
    >
        <template #actions>
            <ff-button data-action="new-token" @click="newToken()">
                <template #icon-left>
                    <PlusSmallIcon />
                </template>
                Add Token
            </ff-button>
        </template>
        <template #context-menu="{row}">
            <ff-kebab-item data-action="edit-token" label="Edit" @click="editToken(row)" />
            <ff-kebab-item data-action="delete-token" label="Delete" @click="onDeleteToken(row)" />
        </template>
        <template v-if="tokens.length === 0" #table>
            <div class="ff-no-data ff-no-data-large">
                You don't have any tokens yet
            </div>
        </template>
    </ff-data-table>
    <TokenDialog ref="tokenDialog" @token-create="onTokenCreate" @token-update="onTokenUpdate" />
    <TokenCreated ref="tokenCreated" />
</template>

<script>
import { PlusSmallIcon } from '@heroicons/vue/24/outline'
import { markRaw } from 'vue'

import SectionTopMenu from '../../../../components/SectionTopMenu.vue'
import ExpiryCell from '../../components/ExpiryCell.vue'

import TokenCreated from '../dialogs/TokenCreated.vue'
import TokenDialog from '../dialogs/TokenDialog.vue'

export default {
    name: 'TokenManager',
    components: {
        PlusSmallIcon,
        SectionTopMenu,
        TokenDialog,
        TokenCreated
    },
    props: {
        hero: {
            type: String,
            required: true
        },
        info: {
            type: String,
            default: ''
        },
        helpHeader: {
            type: String,
            default: null
        },
        tokenPrefix: {
            type: String,
            default: ''
        },
        fetchTokens: {
            type: Function,
            required: true
        },
        createToken: {
            type: Function,
            required: true
        },
        updateToken: {
            type: Function,
            required: true
        },
        deleteToken: {
            type: Function,
            required: true
        }
    },
    data () {
        return {
            loading: false,
            tokens: [],
            columns: [
                { label: 'Name', key: 'name', sortable: true },
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
            const response = await this.fetchTokens()
            this.tokens = response.tokens
            this.loading = false
        },
        newToken () {
            this.$refs.tokenDialog.showCreate()
        },
        editToken (row) {
            this.$refs.tokenDialog.showEdit(row)
        },
        onTokenCreate: async function (data) {
            const token = await this.createToken(data)
            this.$refs.tokenCreated.showToken(token)
            this.fetchData()
        },
        onTokenUpdate: async function (data) {
            try {
                await this.updateToken(data.id, data)
            } catch (err) {
                console.error(err)
            }
            this.fetchData()
        },
        onDeleteToken: async function (row) {
            await this.deleteToken(row.id)
            this.fetchData()
        }
    }
}
</script>
