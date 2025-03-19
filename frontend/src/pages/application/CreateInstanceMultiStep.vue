<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Add a new Instance">
                <template #helptext>
                    Help MEEEEE
                </template>
                <template #tools>
                    <section class="flex gap-3">
                        <ff-button class="flex-1" kind="secondary">Back</ff-button>
                        <ff-button class="flex-1">Next</ff-button>
                    </section>
                </template>
            </ff-page-header>
        </template>

        <ff-loading v-if="isLoading" />

        <ff-loading v-else-if="sourceInstanceId && !sourceInstance" message="Loading instance to Copy From..." />

        <MultiStepInstanceForm v-else :application="application" @instance-created="onInstanceCreated" />
    </ff-page>
</template>

<script>
import { mapState } from 'vuex'

import instanceApi from '../../api/instances.js'
import MultiStepInstanceForm from '../../components/multi-step-modals/instance-creation/MultiStepInstanceForm.vue'

import applicationMixin from '../../mixins/Application.js'

export default {
    name: 'ApplicationCreateInstance',
    components: {
        MultiStepInstanceForm
    },
    mixins: [applicationMixin],
    inheritAttrs: false,
    props: {
        sourceInstanceId: {
            default: null,
            type: String
        }
    },
    emits: ['application-updated'],
    data () {
        return {
            loading: false,
            sourceInstance: null,
            mounted: false,
            errors: {
                name: ''
            },
            instanceDetails: null
        }
    },
    computed: {
        ...mapState('account', ['features', 'team']),
        isLoading () {
            return this.loading || !this.team
        }
    },
    async created () {
        await this.updateApplication()

        if (this.sourceInstanceId) {
            instanceApi.getInstance(this.sourceInstanceId).then(instance => {
                this.sourceInstance = instance
            }).catch(err => {
                console.error('Failed to load source instance', err)
            })
        }
    },
    async mounted () {
        this.mounted = true
    },
    methods: {
        // async handleFormSubmit (formData, copyParts) {
        //     this.loading = true
        //
        //     // Drop applicationName from the payload
        //     const { applicationName, ...instanceFields } = formData
        //
        //     try {
        //         await this.createInstance(instanceFields, copyParts)
        //         await this.$store.dispatch('account/refreshTeam')
        //
        //         this.$emit('application-updated')
        //
        //         this.$router.push({ name: 'ApplicationInstances', params: { id: this.application.id } })
        //     } catch (err) {
        //         this.instanceDetails = instanceFields
        //         if (err.response?.status === 409) {
        //             if (err.response.data?.code === 'invalid_application_name') {
        //                 this.errors.applicationName = err.response.data.error
        //             } else {
        //                 this.errors.name = err.response.data.error
        //             }
        //         } else if (err.response?.status === 400) {
        //             Alerts.emit('Failed to create instance: ' + err.response.data.error, 'warning', 7500)
        //         } else {
        //             Alerts.emit('Failed to create instance')
        //             console.error(err)
        //         }
        //     }
        //
        //     this.loading = false
        // },
        // createInstance (instanceDetails, copyParts) {
        //     const createPayload = { ...instanceDetails, applicationId: this.application.id }
        //     if (this.sourceInstance?.id) {
        //         delete createPayload.flowBlueprintId
        //         createPayload.sourceProject = {
        //             id: this.sourceInstanceId,
        //             options: { ...copyParts }
        //         }
        //     }
        //     if (this.features.ha && createPayload.isHA) {
        //         createPayload.ha = { replicas: 2 }
        //     }
        //     delete createPayload.isHA
        //
        //     return instanceApi.create(createPayload)
        // },
        async onInstanceCreated () {
            await this.$store.dispatch('account/refreshTeam')

            this.$emit('application-updated')

            this.$router.push({ name: 'ApplicationInstances', params: { id: this.application.id } })
        }

    }

}
</script>
