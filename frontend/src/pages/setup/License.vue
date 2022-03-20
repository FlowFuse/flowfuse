<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4  pt-4">
        <FormHeading>2. Upload License</FormHeading>
        <template v-if="!state.license">
            <p class="text-sm text-gray-700">FlowForge Community Edition is Open Source and can be used freely without a license.</p>
            <p class="text-sm text-gray-700">If you have a FlowForge Enterprise Edition license, upload it here.</p>
            <FormRow v-model="input.license" :error="errors.license">License</FormRow>
            <div class="space-x-2">
                <ff-button kind="secondary" @click="next()" class="mt-6">
                    Continue with FlowForge CE
                </ff-button>
                <ff-button :disabled="!formValid" @click="addLicense()" class="mt-6">
                    Next
                </ff-button>
            </div>
        </template>
        <template v-else>
            <p class="text-gray-700 mt-10 text-center">You have already applied a FlowForge Enterprise Edition license.</p>
            <p class="text-gray-700 mt-10 text-center">To apply a different license, complete this setup then login as the administrator and go to Admin Settings.</p>
            <ff-button @click="next()" class="mt-6">
                Next
            </ff-button>
        </template>
    </form>
</template>

<script>
import httpClient from '@/api/client'
import FormHeading from '@/components/FormHeading.vue'
import FormRow from '@/components/FormRow.vue'

export default {
    name: 'SetupLicense',
    props: ['state'],
    data () {
        return {
            input: {
                license: ''
            },
            errors: {}
        }
    },
    computed: {
        formValid () {
            return !!this.input.license
        }
    },
    methods: {
        next () {
            this.$emit('next')
        },
        addLicense () {
            // eslint-disable-next-line no-undef
            const opts = { _csrf: SETUP_CSRF_TOKEN, ...this.input }
            return httpClient.post('/setup/add-license', opts).then(res => {
                this.$emit('next')
            }).catch(err => {
                this.errors.license = err.response.data.error
            })
        }
    },
    components: {
        FormHeading,
        FormRow
    }
}
</script>
