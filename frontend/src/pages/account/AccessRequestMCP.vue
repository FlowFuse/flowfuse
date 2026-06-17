<template>
    <div class="flex flex-col items-center">
        <h2>FlowFuse MCP Agent</h2>
        <p class="text-gray-500 mt-1 mb-4">An external application is requesting access to your FlowFuse account.</p>
        <div v-if="user" class="flex flex-row justify-center mb-4">
            <div class="flex items-center">
                <CommandLineIcon class="w-12 text-gray-500" />
                <ArrowSmallRightIcon class="w-8 text-gray-400" />
                <KeyIcon class="w-8 text-gray-400" />
                <ArrowSmallRightIcon class="w-8 text-gray-400" />
                <div class="ff-user">
                    <img :src="user.avatar" class="ff-avatar-large">
                </div>
            </div>
        </div>
        <div class="bg-gray-50 border rounded-md p-4 mb-4 w-full max-w-md">
            <h3 class="text-sm font-semibold text-gray-700 mb-2">This application will be able to:</h3>
            <ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Manage your FlowFuse instances, applications, and flows</li>
                <li>View and manage your teams</li>
                <li>Create and manage snapshots</li>
            </ul>
        </div>
        <div class="ff-actions flex flex-row">
            <ff-button kind="secondary" class="mx-8" data-action="deny-access" @click="denyAccess">Deny</ff-button>
            <ff-button class="mx-8" data-action="allow-access" @click="allowAccess">Allow</ff-button>
        </div>
    </div>
</template>

<script>
import { ArrowSmallRightIcon, CommandLineIcon, KeyIcon } from '@heroicons/vue/20/solid'
import { mapState } from 'pinia'

import { useAccountAuthStore } from '@/stores/account-auth.js'

export default {
    name: 'AccessRequestMCP',
    components: {
        CommandLineIcon,
        KeyIcon,
        ArrowSmallRightIcon
    },
    computed: {
        ...mapState(useAccountAuthStore, ['user'])
    },
    methods: {
        allowAccess () {
            window.location.href = `/account/complete/${this.$router.currentRoute.value.params.id}`
        },
        denyAccess () {
            window.location.href = `/account/reject/${this.$router.currentRoute.value.params.id}`
        }
    }
}
</script>
