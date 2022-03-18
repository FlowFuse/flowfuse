<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4">
        <p class="text-gray-700 text-lg mt-10 text-center">Well done - that's all we need to get started.</p>
        <p class="text-gray-700 text-center">All of these settings can be modified under the Admin Settings section of the platform.</p>
        <div class="space-x-2 text-center">
            <ff-button @click="done()" class="mt-6">
                Login to FlowForge
            </ff-button>
        </div>
    </form>
</template>

<script>
import httpClient from '@/api/client'

export default {
    name: 'SetupFinal',
    methods: {
        async done () {
            // eslint-disable-next-line no-undef
            const opts = { _csrf: SETUP_CSRF_TOKEN }
            await httpClient.post('/setup/finish', opts)
            window.location = '/'
        }
    }
}
</script>
