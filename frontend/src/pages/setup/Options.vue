<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4  pt-4">
        <FormHeading>3. Options</FormHeading>

        <FormRow v-model="input.telemetry" type="checkbox">Enable collection of anonymous statistics
            <template v-slot:description>
                We collect anonymous statistics about how FlowForge is used.
                This allows us to improve how it works and make a better product.
                For more information about the data we collect and how it is used,
                please see our <a class="underline" href="">Usage Data Collection Policy</a>.

            </template>
        </FormRow>
        <div class="space-x-2">
            <button type="button" @click="applyOptions" class="forge-button mt-6">
                Next
            </button>
        </div>
    </form>
</template>

<script>
import httpClient from '@/api/client'
import FormHeading from "@/components/FormHeading.vue"
import FormRow from "@/components/FormRow.vue"

export default {
    name: 'SetupOptions',
    props: ['state'],
    data() {
        return {
            input: {
                telemetry: true
            },
            errors: {}
        }
    },
    methods: {
        next() {
            this.$emit('next');
        },
        applyOptions() {
            let opts = { _csrf: SETUP_CSRF_TOKEN, ...this.input }
            this.$emit('next')
            // return httpClient.post(`/setup/add-license`, opts).then(res => {
            //     this.$emit('next')
            // }).catch(err => {
            //     this.errors.license = err.response.data.error
            // });
        }
    },
    components: {
        FormHeading,
        FormRow
    }
}
</script>
