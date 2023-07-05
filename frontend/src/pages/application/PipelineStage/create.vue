<template>
    <main>
        <PipelineStageForm
            :instances="instances"
            :pipeline="pipeline"
            :stage="{}"
            @submit="create"
        />
    </main>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'

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
        instances: {
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
                deployToDevices: input.deployToDevices
            }
            if (this.$route.query.sourceStage) {
                options.source = this.$route.query.sourceStage
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
