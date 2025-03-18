<template>
    <div class="ff-multi-step-form">
        <section class="header">
            <step-slider
                :entries="sliderTitles"
                :current-entry="currentStepKey"
                :disableNextStep="disableNextStep"
                @step-selected="selectStep"
            />
        </section>
        <section class="content">
            <transition name="fade" mode="out-in">
                <component
                    :is="currentStep.component"
                    v-if="currentStep"
                    v-bind="currentStep.bindings"
                    v-model="payload"
                    @step-updated="$emit('step-updated', $event)"
                />
            </transition>
        </section>
        <section class="footer my-10">
            <section class="flex gap-3">
                <ff-button class="flex-1" kind="secondary" :disabled="!canGoToPreviousStep" @click="previousStep">Back</ff-button>
                <ff-button class="flex-1" :disabled="disableNextStep" @click="nextStep">{{ nextStepLabel }}</ff-button>
            </section>
        </section>
    </div>
</template>

<script>
import StepSlider from './StepSlider.vue'

export default {
    name: 'MultiStepForm',
    components: { StepSlider },
    props: {
        steps: {
            type: Array,
            required: true,
            default: () => []
        },
        startingStep: {
            type: Number,
            required: false,
            default: 0
        },
        disableNextStep: {
            type: Boolean,
            required: false,
            default: false
        },
        lastStepLabel: {
            type: String,
            required: false,
            default: 'Finish'
        }
    },
    emits: ['step-updated', 'submit'],
    data () {
        return {
            currentStepKey: this.startingStep,
            payload: {}
        }
    },
    computed: {
        currentStep () {
            return this.steps[this.currentStepKey] ?? null
        },
        canGoToPreviousStep () {
            return this.currentStepKey > this.startingStep
        },
        isLastStep () {
            return this.currentStepKey === this.steps.length - 1
        },
        nextStepLabel () {
            if (this.isLastStep) {
                return this.lastStepLabel
            }

            return 'Next'
        },
        sliderTitles () {
            return this.steps.map(step => ({
                title: step.sliderTitle ?? 'Stage',
                disabled: step.disabled
            }))
        }
    },
    methods: {
        selectStep (key) {
            this.currentStepKey = key
        },
        nextStep () {
            if (!this.isLastStep) {
                this.currentStepKey++
            } else {
                this.$emit('submit')
            }
        },
        previousStep () {
            if (this.canGoToPreviousStep) {
                this.currentStepKey--
            }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
