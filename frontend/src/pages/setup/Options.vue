<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4  pt-4">
        <FormHeading>3. Options</FormHeading>

        <FormRow v-model="input.telemetry" type="checkbox">Enable collection of anonymous statistics
            <template v-slot:description>
                <p><b>This release does not collect any information</b></p>
                <p>A future release will collect anonymous statistics about how
                FlowForge is used. This allows us to improve how it works and
                make a better platform.</p>
                <p>We will clearly communicate when this feature is implemented
                and exactly what information is being gathered.</p>
                <p>You can opt in or out of this feature at any time.</p>
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
