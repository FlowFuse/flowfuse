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
            <template v-for="(stage, $index) in pipeline.stages" :key="stage.id">
                <PipelineStage :pipeline-id="pipeline.id" :stage="stage" :play-enabled="$index < pipeline.stages.length - 1" />
                <ChevronRightIcon class="ff-icon mt-4 flex-shrink-0" />
            </template>
            <PipelineStage @click="addStage" />
        </div>
        <div v-else class="ff-pipeline-stages">
            <PipelineStage @click="addStage" />
        </div>
    </div>
</template>

<script>

import { ChevronRightIcon, CogIcon } from '@heroicons/vue/outline'

import PipelineStage from './Stage.vue'

export default {
    name: 'PipelineRow',
    components: {
        ChevronRightIcon,
        CogIcon,
        PipelineStage
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
            const route = {
                name: 'CreatePipelineStage',
                params: {
                    applicationId: this.$route.params.id,
                    pipelineId: this.pipeline.id
                }
            }
            if (this.pipeline.stages.length > 0) {
                route.query = {
                    sourceStage: this.pipeline.stages[this.pipeline.stages.length - 1].id
                }
            }
            this.$router.push(route)
        }
    }
}
</script>
