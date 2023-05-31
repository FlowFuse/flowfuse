<template>
    <div class="ff-pipeline">
        <div class="ff-pipeline-banner">
            <ff-text-input v-if="editingName" v-model="input.pipelineName" />
            <div v-else class="flex items-center">
                <label>
                    {{ pipeline.name }}
                </label>
                <div v-ff-tooltip:right="'Edit Pipeline Name'">
                    <PencilAltIcon v-if="!editingName" class="ml-4 ff-icon ff-clickable" @click="edit" />
                </div>
            </div>
            <div class="flex gap-2">
                <div v-if="!editingName" v-ff-tooltip:left="'Delete Pipeline'">
                    <TrashIcon class="ff-icon ff-clickable" @click="deletePipeline" />
                </div>
                <template v-else>
                    <ff-button kind="secondary" @click="cancel">Cancel</ff-button>
                    <ff-button kind="primary" :disabled="!saveRowEnabled" @click="save">Save</ff-button>
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
                    @stage-deleted="stageDeleted($index)"
                />
                <Transition name="fade">
                    <ChevronRightIcon
                        v-if="$index <= pipeline.stages.length - 1"
                        class="ff-icon mt-4 flex-shrink-0"
                        :class="{
                            'animate-deploying':
                                deploying === $index || nextStageStarting($index),
                        }"
                    />
                </Transition>
            </template>
            <Transition name="fade">
                <PipelineStage @click="addStage" />
            </Transition>
        </div>
        <div v-else class="ff-pipeline-stages">
            <PipelineStage @click="addStage" />
        </div>
    </div>
</template>

<script>
import { ChevronRightIcon, PencilAltIcon, TrashIcon } from '@heroicons/vue/outline'

import ApplicationAPI from '../../api/application.js'
import Alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'

import PipelineStage from './Stage.vue'

export default {
    name: 'PipelineRow',
    components: {
        ChevronRightIcon,
        PencilAltIcon,
        TrashIcon,
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
    emits: ['deploy-started', 'deploy-complete', 'pipeline-deleted', 'stage-deleted'],
    data () {
        const pipeline = this.pipeline
        return {
            editingName: false,
            input: {
                pipelineName: pipeline.name
            },
            deploying: null,
            scopedPipeline: pipeline
        }
    },
    computed: {
        saveRowEnabled () {
            return this.scopedPipeline.name?.length > 0
        }
    },
    methods: {
        addStage: function () {
            const route = {
                name: 'CreatePipelineStage',
                params: {
                    id: this.application.id,
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
            this.editingName = true
        },
        cancel () {
            this.editingName = false
            this.input.pipelineName = this.pipeline.name
        },
        async save () {
            this.scopedPipeline.name = this.input.pipelineName
            await ApplicationAPI.updatePipeline(this.$route.params.id, this.scopedPipeline)
            this.editingName = false
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
        stageDeleted (stageIndex) {
            this.$emit('stage-deleted', stageIndex)
        },
        /**
         *
         * @param {*} index - the index of a stage in the pipeline, returns tru if the _next_ stage is starting
         */
        nextStageStarting (index) {
            if (this.pipeline.stages[index + 1]) {
                const state = this.stageState(this.pipeline.stages[index + 1])
                return state === 'importing' || state === 'starting'
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
