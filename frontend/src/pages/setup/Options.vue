<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4  pt-4">
        <FormHeading>3. Options</FormHeading>

        <FormRow v-model="input.telemetry" type="checkbox">Enable collection of anonymous statistics
            <template v-slot:description>
                <p>
                    We collect anonymous statistics about how FlowForge is used.
                    This allows us to improve how it works and make a better product.
                </p>
                <p>
                    For more information about the data we collect and how it is used,
                    please see our <a class="forge-link" href="https://github.com/flowforge/flowforge/tree/main/docs/admin/telemetry.md" target="_blank">Usage Data Collection Policy</a>
                </p>
            </template>
        </FormRow>
        <div class="space-x-2">
            <ff-button @click="applyOptions()" class="mt-6">
                Next
            </ff-button>
        </div>
    </form>
</template>

<script>
import httpClient from '@/api/client'
import FormHeading from '@/components/FormHeading.vue'
import FormRow from '@/components/FormRow.vue'

export default {
    name: 'SetupOptions',
    props: ['state'],
    data () {
        return {
            input: {
                telemetry: true
            },
            errors: {}
        }
    },
    methods: {
        next () {
            this.$emit('next')
        },
        applyOptions () {
            // eslint-disable-next-line no-undef
            const opts = { _csrf: SETUP_CSRF_TOKEN, ...this.input }
            return httpClient.post('/setup/settings', opts).then(res => {
                this.$emit('next')
            }).catch(err => {
                console.error(err)
            })
        }
    },
    components: {
        FormHeading,
        FormRow
    }
}
</script>
