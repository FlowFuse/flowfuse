<template>
    <div class="ff-pipeline">
        <div class="ff-pipeline-banner">
            <label>
                {{ pipeline.name }}
            </label>
            <div class="">
                <CogIcon class="ff-icon" />
            </div>
        </div>
        <div v-if="pipeline.stages.length" class="ff-pipeline-stages">
            <PipelineStage v-for="stage in pipeline.stages" :key="stage.id" />
        </div>
        <div v-else class="ff-pipeline-stages">
            <PipelineStageGhost @click="addStage" />
        </div>
    </div>
</template>

<script>

import { CogIcon } from '@heroicons/vue/outline'

import PipelineStageGhost from './StageGhost.vue'

export default {
    name: 'PipelineRow',
    components: {
        CogIcon,
        PipelineStageGhost
    },
    props: {
        pipeline: {
            required: true,
            type: Object
        }
    },
    data () {
        return { }
    },
    computed: { },
    mounted () { },
    methods: {
        addStage: function () {

        }
    }
}
</script>
