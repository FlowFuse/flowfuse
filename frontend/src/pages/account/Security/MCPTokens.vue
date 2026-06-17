<template>
    <TokenManager
        hero="MCP Access Tokens"
        info="A list of MCP access tokens that can be used to connect AI assistants and tools to the platform via the Model Context Protocol."
        token-prefix="ffmcp_"
        :fetch-tokens="fetchTokens"
        :create-token="createToken"
        :update-token="updateToken"
        :delete-token="deleteToken"
    />
</template>

<script>
import userApi from '../../../api/user.js'

import TokenManager from './components/TokenManager.vue'

export default {
    name: 'MCPAccessTokens',
    components: {
        TokenManager
    },
    methods: {
        fetchTokens () {
            return userApi.getMCPTokens()
        },
        createToken (data) {
            return userApi.createMCPToken(data.name, data.expiresAt)
        },
        updateToken (id, data) {
            return userApi.updateMCPToken(id, data.expiresAt)
        },
        deleteToken (id) {
            return userApi.deleteMCPToken(id)
        }
    }
}
</script>
