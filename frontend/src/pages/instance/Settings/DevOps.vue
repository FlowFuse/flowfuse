<template>
    <FormHeading>DevOps Pipeline</FormHeading>
    <FormRow>
        <template #description>
            <p class="mb-3">Here, you can configure the next stage in your DevOps Pipeline. You can deploy changes made to this instance, directly onto the next stage in your DevOps Pipeline.</p>
            <p class="">This feature is often used to create a Dev > Staging > Production pipeline, where each stage of your pipeline is a standalone FlowForge Instance.</p>
            <p class="">Changes are only pushed to the next stage upon manual actioning of the "Push" button below.</p>
        </template>
        <template #input>&nbsp;</template>
    </FormRow>

    <div class="max-w-sm space-y-4" data-el="target-project">
        <h2 data-el="form-row-title" class="text-gray-800 block text-base font-medium">
            Target Instance
        </h2>

        <p class="text-sm text-gray-500 mb-3">
            Select the Node-RED instance you want push to.
        </p>

        <SelectInstance v-model="input.target" :team="instance.team" />

        <div class="mt-6 flex gap-4">
            <ff-button :disabled="!input.target || deploying" data-action="push-stage" @click="deploy()">
                {{ deploying ? `Pushing to "${input.target.name}"...` : 'Push to Stage' }}
            </ff-button>
            <ff-button kind="secondary" :to="{name: 'Instance', params: { 'id': input.target?.id }}" :disabled="!input.target" data-action="view-target-project">
                View Target Instance
            </ff-button>
        </div>
    </div>
</template>

<script>

import InstanceApi from '../../../api/instances.js'

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import SelectInstance from '../../../components/SelectInstance.vue'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

export default {
    name: 'InstanceSettingsStages',
    components: {
        FormHeading,
        FormRow,
        SelectInstance
    },
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    data: function () {
        return {
            instances: [],
            deploying: false,
            input: {
                target: null
            }
        }
    },
    methods: {
        async deploy () {
            const target = this.input.target
            const msg = {
                header: `Push to "${target.name}"`,
                html: `<p>Are you sure you want to push to "${target.name}"?</p><p>This will copy over all flows, nodes and credentials from "${this.instance.name}".</p><p>It will also transfer the keys of any newly created Environment Variables that your target instance does not currently have.</p>`
            }

            Dialog.show(msg, async () => {
                this.deploying = true
                // settings for when we deploy to a new stage
                this.parts = {
                    flows: true,
                    credentials: true,
                    template: false,
                    nodes: true,
                    settings: false,
                    envVars: 'keys'
                }

                const source = {
                    id: this.instance.id,
                    options: { ...this.parts }
                }

                await InstanceApi.updateInstance(target.id, { sourceProject: source })

                this.deploying = false
                Alerts.emit(`Instance successfully pushed "${this.instance.name}" to "${target.name}".`, 'confirmation')
            })
        }
    }
}
</script>
