<template>
    <form>
        <FormHeading>2. Upload License</FormHeading>
        <template v-if="!state.license">
            <p class="mt-4">FlowFuse Community Edition is Open Source and can be used freely without a license.</p>
            <p>If you have a FlowFuse Enterprise Edition license, upload it here.</p>
            <p>You can request a trial license <a href="https://flowfuse.com/docs/install/introduction/#request-a-trial-enterprise-license" target="_blank">here</a></p>
            <FormRow v-model="input.license" class="!max-w-full mt-6" :error="errors.license">License Key</FormRow>
            <div class="flex mt-8">
                <ff-button kind="tertiary" @click="next()">
                    Continue with FlowFuse CE
                </ff-button>
                <ff-button :disabled="!formValid" @click="addLicense()">
                    Next
                </ff-button>
            </div>
        </template>
        <template v-else>
            <p class="text-center">You have already applied a FlowFuse Enterprise Edition license.</p>
            <p class="text-center">To apply a different license, complete this setup then login as the administrator and go to Admin Settings.</p>
            <ff-button @click="next()">
                Next
            </ff-button>
        </template>
    </form>
</template>

<script>
import httpClient from '../../api/client.js'
import FormHeading from '../../components/FormHeading.vue'
import FormRow from '../../components/FormRow.vue'

export default {
    name: 'SetupLicense',
    components: {
        FormHeading,
        FormRow
    },
    props: {
        state: {
            type: Object,
            required: true
        }
    },
    emits: ['next'],
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
    }
}
</script>
