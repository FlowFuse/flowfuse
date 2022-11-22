<template>
    <form>
        <p class="text-lg text-center">Well done - that's all we need to get started.</p>
        <p class="text-center">All of these settings can be modified under the Admin Settings section of the platform.</p>
        <div class="flex justify-center">
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
            try {
                await httpClient.post('/setup/finish', opts)
                window.location = '/'
            } catch (err) {
                this.$emit('error')
            }
        }
    }
}
</script>
