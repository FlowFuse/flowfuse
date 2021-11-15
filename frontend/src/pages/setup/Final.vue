<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4">
        <p class="text-gray-700 text-lg mt-10 text-center">Well done - that's all we need to get started.</p>
        <p class="text-gray-700 text-center">All of these settings can be modified under the Admin Settings section of the platform.</p>
        <div class="space-x-2 text-center">
            <button type="button" @click="done" class="forge-button mt-6">
                Login to FlowForge
            </button>
        </div>
    </form>
</template>

<script>
import httpClient from "@/api/client"
import FormHeading from "@/components/FormHeading.vue"
import FormRow from "@/components/FormRow.vue"

export default {
    name: 'SetupFinal',
    methods: {
        async done() {
            let opts = { _csrf: SETUP_CSRF_TOKEN }
            await httpClient.post("/setup/finish",opts)
            window.location = '/'
        },
    },
    components: {
        FormHeading,
        FormRow
    }
}
</script>
