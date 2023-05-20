<template>
    <div class="ff-pipeline">
        <div class="ff-pipeline-banner">
            <ff-text-input v-if="editing" v-model="scopedPipeline.name" />
            <label v-else>
                {{ pipeline.name }}
            </label>
            <div class="flex gap-2">
                <CogIcon v-if="!editing" class="ff-icon ff-clickable" @click="edit" />
                <template v-else>
                    <ff-button kind="danger" @click="deletePipeline">Delete</ff-button>
                    <ff-button kind="secondary" @click="save">Save</ff-button>
                </template>
            </div>
        </div>
        <div v-if="pipeline.stages.length" class="ff-pipeline-stages">
            <template v-for="(stage, $index) in pipeline.stages" :key="stage.id">
                <PipelineStage
                    :application="application"
                    :pipeline="pipeline"
                    :stage="stage"
                    :status="stageState(stage)"
                    :playEnabled="$index < pipeline.stages.length - 1"
                    :editEnabled="editing"
                    :deploying="nextStageStarting($index)"
                    @stage-started="stageStarted($index)"
                    @stage-complete="stageComplete($index)"
                />
                <Transition name="fade">
                    <ChevronRightIcon
                        v-if="
                            $index < pipeline.stages.length - 1 ||
                                ($index === pipeline.stages.length - 1 && editing)
                        "
                        class="ff-icon mt-4 flex-shrink-0"
                        :class="{
                            'animate-deploying':
                                deploying === $index || nextStageStarting($index),
                        }"
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

import ApplicationAPI from '../../api/application.js'
import Alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'

import PipelineStage from './Stage.vue'

export default {
    name: 'PipelineRow',
    components: {
        ChevronRightIcon,
        CogIcon,
        PipelineStage
    },
    props: {
        application: {
            required: true,
            type: Object
        },
        pipeline: {
            required: true,
            type: Object
        },
        statusMap: {
            required: true,
            type: Map
        }
    },
    emits: ['deploy-started', 'deploy-complete', 'pipeline-deleted'],
    data () {
        const pipeline = this.pipeline
        return {
            editing: false,
            deploying: null,
            scopedPipeline: pipeline
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
        async save () {
            await ApplicationAPI.updatePipeline(this.$route.params.id, this.pipeline)
            this.editing = false
            Alerts.emit('Pipeline successfully updated.', 'confirmation')
        },
        stageStarted (stageIndex) {
            this.deploying = stageIndex
            this.$emit('deploy-started')
        },
        stageComplete (stageIndex) {
            this.deploying = null
            this.$emit('deploy-complete')
        },
        /**
     *
     * @param {*} index - the index of a stage in the pipeline, returns tru if the _next_ stage is starting
     */
        nextStageStarting (index) {
            if (this.pipeline.stages[index + 1]) {
                return (
                    this.stageState(this.pipeline.stages[index + 1]) === 'importing' ||
          this.stageState(this.pipeline.stages[index + 1]) === 'starting'
                )
            } else {
                return false
            }
        },
        stageState (stage) {
            return this.statusMap.get(stage.instance.id)?.state
        },
        deletePipeline () {
            const msg = {
                header: 'Delete Pipeline',
                kind: 'danger',
                confirmLabel: 'Delete',
                html: `<p>Are you sure you want to delete the pipeline "${this.pipeline.name}"?</p>`
            }
            Dialog.show(msg, async () => {
                await ApplicationAPI.deletePipeline(
                    this.$route.params.id,
                    this.pipeline.id
                )

                this.deploying = false
                this.$emit('pipeline-deleted')
                Alerts.emit('Pipeline successfully deleted', 'confirmation')
            })
        }
    }
}
</script>
