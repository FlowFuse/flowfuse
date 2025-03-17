<template>
    <MultiStepForm :steps="formSteps" :starting-step="1" @step-updated="updateForm" />
</template>

<script>
import MultiStepForm from '../MultiStepForm.vue'

import BlueprintStep from './steps/BlueprintStep.vue'
import InstanceStep from './steps/InstanceStep.vue'

const INSTANCE_SLUG = 'instance'
const BLUEPRINT_SLUG = 'instance'

export default {
    name: 'MultiStepInstanceForm',
    components: { MultiStepForm },
    data () {
        return {
            form: {
                [INSTANCE_SLUG]: { },
                [BLUEPRINT_SLUG]: { }
            }
        }
    },
    computed: {
        formSteps () {
            return [
                {
                    sliderTitle: 'Application',
                    disabled: true
                },
                {
                    sliderTitle: 'Instance',
                    bindings: {
                        slug: INSTANCE_SLUG,
                        state: this.form[INSTANCE_SLUG].input
                    },
                    component: InstanceStep
                },
                {
                    sliderTitle: 'Blueprint',
                    bindings: {
                        slug: BLUEPRINT_SLUG
                    },
                    component: BlueprintStep
                }
            ]
        }
    },
    methods: {
        updateForm (payload) {
            this.form = { ...this.form, ...payload }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
