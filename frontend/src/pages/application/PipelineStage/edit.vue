<template>
    <main>
        <ff-loading
            v-if="!stage?.id"
        />
        <PipelineStageForm
            v-else
            :applicationDevices="applicationDevices"
            :instances="instances"
            :deviceGroups="deviceGroups"
            :pipeline="pipeline"
            :stage="stage"
            :sourceStage="$route.query.sourceStage"
            @submit="update"
        />
    </main>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'

import ApplicationAPI from '../../../api/application.js'
import PipelinesAPI from '../../../api/pipeline.js'

import Alerts from '../../../services/alerts.js'

import PipelineStageForm from './form.vue'

export default {
    name: 'EditPipelineStage',
    components: {
        PipelineStageForm
    },
    props: {
        application: {
            type: Object,
            required: true
        },
        applicationDevices: {
            type: Array,
            required: true
        },
        instances: {
            type: Array,
            required: true
        },
        deviceGroups: {
            type: Array,
            required: true
        },
        pipeline: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            mounted: false,
            stage: null
        }
    },
    async mounted () {
        this.mounted = true
        this.loadStage()

        this.$watch(
            () => this.$route.params.stageId,
            async () => {
                if (!this.$route.params.stageId) {
                    return
                }

                await this.loadStage()
            }
        )
    },
    methods: {
        async update (input) {
            const options = {
                name: input.name,
                instanceId: input.instanceId,
                deviceId: input.deviceId,
                deployToDevices: input.deployToDevices,
                action: input.action
            }

            // Set the device group, new, existing or null
            if (input.deviceGroupId === 'new') {
                try {
                    const result = await ApplicationAPI.createDeviceGroup(this.application.id, input.newDeviceGroup.name, input.newDeviceGroup.description)
                    options.deviceGroupId = result.id
                } catch (err) {
                    console.error(err)
                    Alerts.emit('Failed to create Device Group, stage was not updated. Check the console for more details', 'error', 7500)
                    return
                }
            } else {
                options.deviceGroupId = input.deviceGroupId
            }
            if (input.gitTokenId) {
                // Git repo - clean up unused settings
                options.gitTokenId = input.gitTokenId
                options.url = input.url
                options.branch = input.branch
                if (input.credentialSecret) {
                    // Only pass back a non-blank value. This avoids overwriting
                    // the existing value
                    options.credentialSecret = input.credentialSecret
                }
            }
            await PipelinesAPI.updatePipelineStage(this.pipeline.id, this.stage.id, options)
            Alerts.emit('Pipeline stage successfully updated.', 'confirmation')

            this.$router.push({
                name: 'ApplicationPipelines',
                params: {
                    id: this.application.id
                }
            })
        },
        async loadStage () {
            if (!this.pipeline.id) {
                return
            }
            this.stage = await PipelinesAPI.getPipelineStage(this.pipeline.id, this.$route.params.stageId)
        }
    }
}
</script>
