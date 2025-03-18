<template>
    <MultiStepForm
        :steps="formSteps"
        :starting-step="1"
        :disable-next-step="shouldDisableNextStep"
        last-step-label="Create Instance"
        style="min-height: 85vh;"
        @submit="onSubmit"
        @step-updated="updateForm"
    />
</template>

<script>
import instanceApi from '../../../api/instances.js'
import MultiStepForm from '../MultiStepForm.vue'

import BlueprintStep from './steps/BlueprintStep.vue'
import InstanceStep from './steps/InstanceStep.vue'

const INSTANCE_SLUG = 'instance'
const BLUEPRINT_SLUG = 'blueprint'

export default {
    name: 'MultiStepInstanceForm',
    components: { MultiStepForm },
    props: {
        application: {
            type: Object,
            required: true
        }
    },
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
                        slug: BLUEPRINT_SLUG,
                        state: this.form[BLUEPRINT_SLUG]
                    },
                    component: BlueprintStep
                }
            ]
        },
        shouldDisableNextStep () {
            let flag = false
            Object.keys(this.form).forEach(key => {
                if (this.form[key].hasErrors) {
                    flag = true
                }
            })
            return flag
        }
    },
    methods: {
        updateForm (payload) {
            this.form = { ...this.form, ...payload }
        },
        async onSubmit () {
            return instanceApi.create({
                applicationId: this.application.id,
                name: this.form[INSTANCE_SLUG].input.name,
                projectType: this.form[INSTANCE_SLUG].input.instanceType,
                stack: this.form[INSTANCE_SLUG].input.nodeREDVersion,
                template: this.form[INSTANCE_SLUG].input.template,
                flowBlueprintId: this.form[BLUEPRINT_SLUG].blueprint?.id ?? ''
            })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
