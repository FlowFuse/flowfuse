<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="pageTitle">
                <template #context>
                    Applications are used to manage and group together your Node-RED instances.
                </template>
                <template #tools>
                    <section class="flex gap-3">
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

        <MultiStepApplicationsInstanceForm
            ref="multiStepForm" :applications="[]"
            :instance-follow-up="true"
            last-step-label="Create Application"
            @form-success-application="onApplicationCreated"
            @previous-step-state-changed="form.previousButtonState = $event"
            @next-step-state-changed="form.nextButtonState = $event"
            @next-step-label-changed="form.nextStepLabel = $event"
        />
    </ff-page>
</template>

<script>
import { mapState } from 'vuex'

import MultiStepApplicationsInstanceForm
    from '../../components/multi-step-forms/instance/MultiStepApplicationsInstanceForm.vue'

export default {
    name: 'CreateApplication',
    components: {
        MultiStepApplicationsInstanceForm
    },
    data () {
        return {
            errors: {
                name: ''
            },
            pageTitle: 'Create a new Application',
            form: {
                nextButtonState: false,
                previousButtonState: false,
                nextStepLabel: 'Next'
            }
        }
    },
    computed: {
        ...mapState('account', ['features', 'team'])
    },
    methods: {
        onApplicationCreated (application) {
            this.$router.push({ name: 'Application', params: { id: application.id } })
        }
    }
}
</script>
