<template>
    <div class="ff-pipeline" data-el="pipeline-row">
        <div class="ff-pipeline-banner">
            <ff-text-input v-if="editing.name" ref="pipelineName" v-model="input.pipelineName" />
            <div v-else class="flex items-center">
                <label>
                    {{ pipeline.name }}
                </label>
                <div v-ff-tooltip:right="'Edit Pipeline Name'">
                    <PencilAltIcon v-if="!editing.name" class="ml-4 ff-icon ff-clickable" @click="edit" />
                </div>
            </div>
            <div class="flex gap-2">
                <div v-if="!editing.name" v-ff-tooltip:left="'Delete Pipeline'" data-action="delete-pipeline">
                    <TrashIcon class="ff-icon ff-clickable" @click="deletePipeline" />
                </div>
                <template v-else>
                    <ff-button kind="secondary" @click="cancel">Cancel</ff-button>
                    <ff-button kind="primary" :disabled="!saveRowEnabled" @click="save">Save</ff-button>
                </template>
            </div>
        </div>
        <div v-if="pipeline.stages.length" class="ff-pipeline-stages">
            <template v-for="(stage, $index) in stagesWithStates" :key="stage.id">
                <PipelineStage
                    :application="application"
                    :pipeline="pipeline"
                    :stage="stage"
                    :playEnabled="$index < pipeline.stages.length - 1"
                    :editEnabled="true"
                    @stage-deploy-starting="stageDeployStarting(stage)"
                    @stage-deploy-started="stageDeployStarted(stage)"
                    @stage-deleted="stageDeleted($index)"
                />
                <Transition name="fade">
                    <ChevronRightIcon
                        v-if="$index <= pipeline.stages.length - 1"
                        class="ff-icon mt-4 flex-shrink-0"
                        :class="{
                            'animate-deploying': nextStageDeploying($index),
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
        instanceStatusMap: {
            required: true,
            type: Map
        }
    },
    emits: ['pipeline-deleted', 'stage-deleted', 'deploy-starting', 'deploy-started', 'stage-deploy-starting', 'stage-deploy-started'],
    data () {
        const pipeline = this.pipeline
        return {
            editing: {
                name: false
            },
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
        },
        stagesWithStates () {
            return this.pipeline.stages.map((stage) => {
                // For now, each stage contains only one instance, so read state from that instance
                const stageInstance = this.instanceStatusMap.get(stage.instance?.id)

                // Instance statuses might not have finished loading yet
                if (!stageInstance) {
                    return stage
                }

                // Relay stage instances state to the stage
                stage.state = stageInstance.state
                stage.flowLastUpdatedSince = stageInstance.flowLastUpdatedSince

                // If any instances inside the stage are deploying, this stage is deploying
                stage.isDeploying = !!stageInstance?.isDeploying

                return stage
            })
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
            this.editing.name = true
            this.$nextTick(() => {
                // focus the edit name field
                this.$refs.pipelineName.focus()
            })
        },
        cancel () {
            this.editing.name = false
            this.input.pipelineName = this.pipeline.name
        },
        async save () {
            this.scopedPipeline.name = this.input.pipelineName
            await ApplicationAPI.updatePipeline(this.$route.params.id, this.scopedPipeline)
            this.editing.name = false
            Alerts.emit('Pipeline successfully updated.', 'confirmation')
        },
        stageDeployStarting (stage) {
            const nextStage = this.pipeline.stages.find((s) => s.id === stage.NextStageId)
            this.$emit('stage-deploy-starting', stage, nextStage)
        },
        stageDeployStarted (stage) {
            this.$emit('stage-deploy-started', stage)
        },
        stageDeleted (stageIndex) {
            this.$emit('stage-deleted', stageIndex)
        },
        nextStageDeploying (index) {
            if (this.pipeline.stages[index + 1]) {
                return this.pipeline.stages[index + 1].isDeploying
            }

            return false
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
