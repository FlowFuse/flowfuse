<template>
    <ff-page>
        <template #header>
            <ff-page-header>
                <template #breadcrumbs>
                    <ff-nav-breadcrumb v-if="team" class="whitespace-nowrap" :to="{name: 'Instances', params: {team_slug: team.slug}}">
                        Instances
                    </ff-nav-breadcrumb>
                    <ff-nav-breadcrumb class="whitespace-nowrap" :to="{name: 'instance-settings', params: {team_slug: team.slug, id: instance.id}}">
                        {{ instance.name }}
                    </ff-nav-breadcrumb>
                    <ff-nav-breadcrumb class="whitespace-nowrap">
                        Duplicate
                    </ff-nav-breadcrumb>
                </template>
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
            v-if="instance"
            ref="multiStepForm"
            last-step-label="Create Instance"
            :instance="instance"
            @instance-created="onInstanceCreated"
            @previous-step-state-changed="form.previousButtonState = $event"
            @next-step-state-changed="form.nextButtonState = $event"
            @next-step-label-changed="form.nextStepLabel = $event"
        />
    </ff-page>
</template>

<script>
import { mapState } from 'vuex'

import instanceApi from '../../api/instances.js'
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
            },
            instance: null
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    mounted () {
        this.getInstance()
    },
    methods: {
        onInstanceCreated (instance) {
            this.$router.push({
                name: 'instance-overview',
                params: { id: instance.id }
            })
        },
        async getInstance () {
            this.instance = await instanceApi.getInstance(this.$route.params.id)
        }
    }
}
</script>

<style scoped lang="scss">

</style>
