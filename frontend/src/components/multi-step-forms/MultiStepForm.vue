<template>
    <div class="ff-multi-step-form" data-form="multi-step-form">
        <transition name="fade" mode="out-in">
            <div v-if="loadingOverlay" class="loading-overlay">
                <ff-loading :message="loadingOverlayText" />
            </div>
        </transition>

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
                    @step-updated="$emit('step-updated', $event, currentStepKey)"
                />
            </transition>
        </section>

        <section v-if="showFooter" class="footer my-10">
            <slot name="footer">
                <section class="flex gap-3">
                    <ff-button class="flex-1" kind="secondary" :disabled="!canGoToPreviousStep" @click="previousStep">Back</ff-button>
                    <ff-button class="flex-1" :disabled="disableNextStep" @click="nextStep">{{ nextStepLabel }}</ff-button>
                </section>
            </slot>
        </section>
    </div>
</template>

<script>
import FfLoading from '../Loading.vue'

import StepSlider from './StepSlider.vue'

export default {
    name: 'MultiStepForm',
    components: { FfLoading, StepSlider },
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
        },
        loadingOverlay: {
            type: Boolean,
            required: false,
            default: false
        },
        loadingOverlayText: {
            type: String,
            required: false,
            default: 'Loading...'
        },
        showFooter: {
            type: Boolean,
            required: false,
            default: true
        }
    },
    emits: ['step-updated', 'submit', 'previous-step-state-changed', 'next-step-state-changed', 'next-step-label-changed'],
    data () {
        return {
            currentStepKey: this.startingStep,
            payload: {}
        }
    },
    computed: {
        currentStep () {
            return this.filteredSteps[this.currentStepKey] ?? null
        },
        canGoToPreviousStep () {
            return this.currentStepKey > this.startingStep
        },
        filteredSteps () {
            return this.steps.filter(step => !step.hidden)
        },
        isLastStep () {
            return this.currentStepKey === this.filteredSteps.length - 1
        },
        nextStepLabel () {
            if (this.isLastStep) {
                return this.lastStepLabel
            }

            return 'Next'
        },
        sliderTitles () {
            return this.filteredSteps.map(step => ({
                title: step.sliderTitle ?? 'Stage',
                disabled: step.disabled,
                hidden: step.hidden
            }))
        }
    },
    watch: {
        canGoToPreviousStep: {
            immediate: true,
            handler (value) {
                this.$emit('previous-step-state-changed', value)
            }
        },
        disableNextStep: {
            immediate: true,
            handler (value) {
                this.$emit('next-step-state-changed', value)
            }
        },
        nextStepLabel: {
            immediate: true,
            handler  (value) {
                this.$emit('next-step-label-changed', value)
            }
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
.ff-multi-step-form {
    position: relative;

    .loading-overlay {
        position: absolute;
        top: 0;
        left:0;
        width: 100%;
        height: 100%;
        background: rgba(255,255,255, .6);
        z-index: 100;
    }
}
</style>
