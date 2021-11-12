<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4  pt-4">
        <FormHeading>2. Upload License</FormHeading>
        <template v-if="!state.license">
            <p class="text-sm text-gray-700">If you have a FlowForge Platform License, upload it here.</p>
            <p class="text-sm text-gray-700">You can skip this step and upload a license later.</p>
            <FormRow v-model="input.license" :error="errors.license">License</FormRow>
            <div class="space-x-2">
                <button type="button" @click="next" class="forge-button-secondary mt-6">
                    Skip
                </button>
                <button type="button" :disabled="!formValid" @click="addLicense" class="forge-button mt-6">
                    Next
                </button>
            </div>
        </template>
        <template v-else>
            <p class="text-gray-700 mt-10 text-center">You have already applied a license.</p>
            <p class="text-gray-700 mt-10 text-center">To apply a different license, complete this setup then login as the administrator and go to Admin Settings.</p>
            <button type="button" @click="next" class="forge-button mt-6">
                Next
            </button>
        </template>
    </form>
</template>

<script>
import httpClient from '@/api/client'
import FormHeading from "@/components/FormHeading.vue"
import FormRow from "@/components/FormRow.vue"

export default {
    name: 'SetupLicense',
    props: ['state'],
    data() {
        return {
            input: {
                license: "",
            },
            errors: {}
        }
    },
    computed: {
        formValid() {
            return !!this.input.license
        }
    },
    methods: {
        next() {
            this.$emit('next');
        },
        addLicense() {
            let opts = { _csrf: SETUP_CSRF_TOKEN, ...this.input }
            return httpClient.post(`/setup/add-license`, opts).then(res => {
                this.$emit('next')
            }).catch(err => {
                this.errors.license = err.response.data.error
            });
        }
    },
    components: {
        FormHeading,
        FormRow
    }
}
</script>
