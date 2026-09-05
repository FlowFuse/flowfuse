<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="pageTitle">
                <template #context>
                    {{ $t('ui.applicationsAreUsedToManageAndGroupTogetherYourN') }}
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
                            {{ $t('ui.back') }}
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
            :show-instance-follow-up="!isFreeTeamType"
            :last-step-label="$t('ui.createApplication')"
            @form-success="onApplicationCreated"
            @previous-step-state-changed="form.previousButtonState = $event"
            @next-step-state-changed="form.nextButtonState = $event"
            @next-step-label-changed="form.nextStepLabel = $event"
        />
    </ff-page>
</template>

<script>
import { mapState } from 'pinia'

import MultiStepApplicationsInstanceForm
    from '../../components/multi-step-forms/instance/MultiStepApplicationsInstanceForm.vue'

import { useContextStore } from '@/stores/context.js'

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
        ...mapState(useContextStore, ['isFreeTeamType'])
    },
    methods: {
        onApplicationCreated (payload) {
            this.$router.push({ name: 'application', params: { id: payload.application.id } })
        }
    }
}
</script>
