<template>
    <div class="flex flex-col items-center">
        <h2>An application would like to connect to your account</h2>
        <div v-if="user" class="flex flex-row justify-center">
            <div class="flex">
                <RectangleGroupIcon class="w-12" />
                <ArrowSmallLeftIcon class="w-8" />
                <KeyIcon class="w-8" />
                <ArrowSmallRightIcon class="w-8" />
                <div class="ff-user">
                    <img :src="user.avatar" class="ff-avatar-large">
                </div>
            </div>
        </div>
        <div class="my-4">
            This application will have access to your teams and instances.
        </div>
        <div v-if="error" class="text-red-600 text-sm mb-4">{{ error }}</div>
        <div class="ff-actions flex flex-row">
            <ff-button class="mx-8" data-action="deny-access" @click="denyAccess">Deny</ff-button>
            <ff-button class="mx-8" data-action="allow-access" @click="allowAccess">Allow</ff-button>
        </div>
    </div>
</template>

<script>
import { ArrowSmallLeftIcon, ArrowSmallRightIcon, KeyIcon, RectangleGroupIcon } from '@heroicons/vue/20/solid'
import { mapState } from 'pinia'

import client from '@/api/client.ts'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { redirectToOAuthClient } from '@/utils/oauthRedirect.ts'

export default {
    name: 'AccessRequest',
    components: {
        RectangleGroupIcon,
        KeyIcon,
        ArrowSmallRightIcon,
        ArrowSmallLeftIcon
    },
    data () {
        return {
            error: null
        }
    },
    computed: {
        ...mapState(useAccountAuthStore, ['user'])
    },
    methods: {
        async allowAccess () {
            await this.respond('complete')
        },
        async denyAccess () {
            await this.respond('reject')
        },
        async respond (action) {
            this.error = null
            try {
                const response = await client.put(`/account/${action}/${this.$router.currentRoute.value.params.id}`, {})
                redirectToOAuthClient(response.data.redirect)
            } catch (err) {
                this.error = err.response?.data?.description || 'Failed to process request. Please try again.'
            }
        }
    }
}
</script>
