<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Instances">
                <template #context>
                    Let's get your new Node-RED instance setup in no time.
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

        <MultiStepDuplicateInstanceForm
            ref="multiStepForm"
            last-step-label="Create Instance"
            @instance-created="onInstanceCreated"
            @previous-step-state-changed="form.previousButtonState = $event"
            @next-step-state-changed="form.nextButtonState = $event"
            @next-step-label-changed="form.nextStepLabel = $event"
        />
    </ff-page>
</template>

<script>
import MultiStepDuplicateInstanceForm from '../../components/multi-step-forms/instance/MultiStepDuplicateInstanceForm.vue'

export default {
    name: 'DuplicateInstance',
    components: { MultiStepDuplicateInstanceForm },
    data () {
        return {
            form: {
                nextButtonState: false,
                previousButtonState: false,
                nextStepLabel: 'Next'
            }
        }
    },
    methods: {
        onInstanceCreated (instance) {
            this.$router.push({
                name: 'instance-overview',
                params: { id: instance.id }
            })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
