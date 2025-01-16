<template>
    <main>
        <PipelineStageForm
            :applicationDevices="applicationDevices"
            :instances="instances"
            :deviceGroups="deviceGroups"
            :pipeline="pipeline"
            :stage="{}"
            :sourceStage="$route.query.sourceStage"
            @submit="create"
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
    name: 'CreatePipelineStage',
    components: {
        PipelineStageForm
    },
    inheritAttrs: false,
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
            default: () => []
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
            mounted: false
        }
    },
    async mounted () {
        this.mounted = true
    },
    methods: {
        async create (input) {
            const options = {
                name: input.name,
                instanceId: input.instanceId,
                deviceId: input.deviceId,
                deployToDevices: input.deployToDevices,
                action: input.action
            }
            if (this.$route.query.sourceStage) {
                options.source = this.$route.query.sourceStage
            }

            // Set the device group, new, existing or null
            if (input.deviceGroupId === 'new') {
                try {
                    const result = await ApplicationAPI.createDeviceGroup(this.application.id, input.newDeviceGroup.name, input.newDeviceGroup.description)
                    options.deviceGroupId = result.id
                } catch (err) {
                    console.error(err)
                    Alerts.emit('Failed to create Device Group, stage was not created. Check the console for more details', 'error', 7500)
                    return
                }
            } else {
                options.deviceGroupId = input.deviceGroupId
            }

            await PipelinesAPI.addPipelineStage(this.pipeline.id, options)
            Alerts.emit('Pipeline stage successfully added.', 'confirmation')

            this.$router.push({
                name: 'ApplicationPipelines',
                params: {
                    id: this.application.id
                }
            })
        }
    }
}
</script>
