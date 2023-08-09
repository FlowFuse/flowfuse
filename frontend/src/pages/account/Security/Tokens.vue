<template>
    <ff-loading v-if="loading" message="Personal Access Tokens"/>
    <ff-data-table
        data-el=""
        :rows="tokens" :columns="columns" :show-search="true" search-placeholder="Search Tokens..."
        :rows-selectable="true" :show-load-more="false"
    >
        <template #actions>
                <ff-button @click="newToken()">
                    New Token
                </ff-button>
        </template>
        <template v-slot:context-menu="{row}">
		<ff-list-item label="Edit" @click.stop="editToken(row)"/>
		<ff-list-item label="Delete" @click.stop="deleteToken(row)"/>
	</template>
    </ff-data-table>
    <TokenDialog ref="tokenDialog"/>
</template>

<script>
import userApi from '../../../api/user.js'

import TokenDialog from './dialogs/TokenDialog.vue'

export default ({
    name: 'PersonalAccessTokens',
    data() {
        return {
            loading: false,
            tokens: [],
            columns: [
                { label: 'Name', key: 'name', sortable: true },
                { label: "Scope", key: 'scope'},
                { label: "Expires", key: 'expiresAt' }
            ]
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData: async function () {
            this.loading = true
            try {
                this.tokens = await userApi.getPersonalAccessTokens()
            } catch (err) {
                console.log(err)
            }
            this.loading = false
        },
        newToken () {
            this.$refs.tokenDialog.showCreate()
        },
        editToken (row) {
            this.$refs.tokenDialog.showEdit(row)
        },
        deleteToken (row) {
            console.log(row)
        }
    },
    components: {
        TokenDialog
    }
})
</script>
