<template>
    <div class="ff-pipeline">
        <div class="ff-pipeline-banner">
            <label>
                {{ pipeline.name }}
            </label>
            <div v-if="pipeline.stages.length" class="flex gap-2">
                <CogIcon v-if="!editing" class="ff-icon ff-clickable" @click="edit" />
                <template v-else>
                    <ff-button kind="secondary" @click="cancel">Save</ff-button>
                </template>
            </div>
        </div>
        <div v-if="pipeline.stages.length" class="ff-pipeline-stages">
            <template v-for="(stage, $index) in pipeline.stages" :key="stage.id">
                <PipelineStage :pipeline-id="pipeline.id" :stage="stage" :play-enabled="$index < pipeline.stages.length - 1" @stage-started="stageStarted($index)" @stage-complete="stageComplete($index)" />
                <Transition name="fade">
                    <ChevronRightIcon
                        v-if="($index < pipeline.stages.length - 1) || ($index === pipeline.stages.length -1 && editing)"
                        class="ff-icon mt-4 flex-shrink-0" :class="{'animate-deploying': deploying === $index}"
                    />
                </Transition>
            </template>
            <Transition name="fade">
                <PipelineStage v-if="editing" @click="addStage" />
            </Transition>
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
    emits: [
        'deploy-complete'
    ],
    data () {
        return {
            editing: false,
            deploying: null
        }
    },
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
        },
        edit () {
            this.editing = true
        },
        cancel () {
            this.editing = false
        },
        stageStarted (stageIndex) {
            this.deploying = stageIndex
        },
        stageComplete (stageIndex) {
            this.deploying = null
            this.$emit('deploy-complete')
        }
    }
}
</script>
