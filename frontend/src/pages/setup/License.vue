<template>
    <form>
        <FormHeading>{{ $t('ui.n2UploadLicense') }}</FormHeading>
        <template v-if="!state.license">
            <p class="mt-4">{{ $t('ui.flowfuseCommunityEditionIsOpenSourceAndCanBeUsed') }}</p>
            <p>{{ $t('ui.ifYouHaveAFlowfuseCommercialLicenseUploadItHere') }}</p>
            <p>{{ $t('ui.youCanRequestATrialLicense') }} <a href="https://flowfuse.com/docs/install/introduction/#request-a-trial-enterprise-license" target="_blank">{{ $t('ui.here') }}</a></p>
            <FormRow v-model="input.license" class="max-w-full! mt-6" :error="errors.license">{{ $t('ui.licenseKey') }}</FormRow>
            <div class="flex mt-8">
                <ff-button kind="tertiary" @click="next()">
                    {{ $t('ui.continueWithFlowfuseCe') }}
                </ff-button>
                <ff-button :disabled="!formValid" @click="addLicense()">
                    {{ $t('ui.next') }}
                </ff-button>
            </div>
        </template>
        <template v-else>
            <p class="text-center">{{ $t('ui.youHaveAlreadyAppliedAFlowfuseCommercialLicense') }}</p>
            <p class="text-center">{{ $t('ui.toApplyADifferentLicenseCompleteThisSetupThenLog') }}</p>
            <ff-button @click="next()">
                {{ $t('ui.next') }}
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
