<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Register a new Remote Instance">
                <template #context>
                    Let's get your new Node-RED remote instance setup in no time.
                </template>
                <template #tools>
                    <section v-if="!loading &&!device && !invalidSession" class="flex gap-3">
                        <ff-button
                            class="flex-1"
                            kind="secondary"
                            :disabled="!form.previousButtonState"
                            data-el="previous-step"
                            @click="$refs.multiStepForm.goToPreviousStep()"
                        >
                            Back
                        </ff-button>
                        <ff-button
                            class="flex-1 whitespace-nowrap"
                            :disabled="form.nextButtonState"
                            data-el="next-step"
                            @click="$refs.multiStepForm.goToNextStep()"
                        >
                            {{ form.nextStepLabel }}
                        </ff-button>
                    </section>
                </template>
            </ff-page-header>
        </template>

        <ff-loading v-if="loading" />
        <template v-else-if="invalidSession">
            <section class="flex flex-col gap-4 text-center">
                <h1 class="text-2xl font-semibold">Invalid registration session</h1>
                <p class="opacity-50">
                    The registration session you are trying to use is invalid or has expired. Please start the registration process again.
                </p>
            </section>
        </template>
        <MultiStepDeviceForm
            v-else-if="!device"
            ref="multiStepForm"
            :applications="applications"
            :has-team-step="true"
            :registrationSession="registrationSession"
            @form-success="onInstanceCreated"
            @previous-step-state-changed="form.previousButtonState = $event"
            @next-step-state-changed="form.nextButtonState = $event"
            @next-step-label-changed="form.nextStepLabel = $event"
        />
        <SuccessStep v-else :device="device" />
    </ff-page>
</template>

<script>
import { mapState } from 'pinia'

import devicesApi from '../../api/devices.js'
import teamApi from '../../api/team.js'
import MultiStepDeviceForm from '../../components/multi-step-forms/device/MultiStepDeviceForm.vue'

import SuccessStep from '../../components/multi-step-forms/device/steps/SuccessStep.vue'

// import LocalStorageService from '../../services/storage/local-storage.service.js'

// import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'CreateInstance',
    components: {
        MultiStepDeviceForm,
        SuccessStep
    },
    inheritAttrs: false,
    data () {
        return {
            applications: [],
            loading: true,
            mounted: false,
            device: null,
            invalidSession: false,
            testDevice: {
                id: 'O65j9bmX8e',
                name: 'My Remote Instance',
                credentials: {
                    otc: 'phantom-secret-potato'
                }
            },
            form: {
                nextButtonState: false,
                previousButtonState: false,
                nextStepLabel: 'Next'
            }
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        registrationSession () {
            // The path is /register/remote-instance/:sessionToken
            // We need to access :sessionToken from the route params and pass it to the MultiStepDeviceForm component
            return this.$route.params.sessionToken || null
        }
    },
    watch: {
        async team () {
            await this.getData()
        }
    },
    async created () {
        await this.checkSession()
        this.loading = false
        if (this.team) {
            await this.getData()
        }
    },
    async mounted () {
        this.mounted = true
    },
    methods: {
        async checkSession () {
            if (this.registrationSession) {
                try {
                    await devicesApi.checkRegistrationSession(this.registrationSession)
                    return
                } catch (error) {
                    // Fall through to set invalidSession to true
                }
            }
            this.invalidSession = true
        },

        async getData () {
            const data = await teamApi.getTeamApplications(this.team.id)
            this.applications = data.applications.map((a) => {
                return {
                    label: a.name,
                    description: a.description,
                    value: a.id,
                    id: a.id,
                    counters: {
                        instances: a.instances.length,
                        devices: a.devices.length
                    }
                }
            })
        },
        onInstanceCreated (payload) {
            this.device = payload.device
        }
    }
}
</script>
