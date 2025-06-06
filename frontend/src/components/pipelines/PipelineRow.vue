<template>
    <div class="ff-pipeline" data-el="pipeline-row">
        <div class="ff-pipeline-banner">
            <ff-text-input v-if="editing.name" ref="pipelineName" v-model="input.pipelineName" />
            <div v-else class="flex items-center">
                <label>
                    {{ pipeline.name }}
                </label>
                <div v-if="hasPermission('pipeline:edit')" v-ff-tooltip:right="'Edit Pipeline Name'">
                    <PencilAltIcon v-if="!editing.name" class="ml-4 ff-icon ff-clickable" @click="edit" />
                </div>
            </div>
            <div v-if="hasPermission('pipeline:delete')" class="flex gap-2">
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
                    :playEnabled="nextStageAvailable(stage, $index)"
                    :editEnabled="true"
                    @stage-deploy-starting="stageDeployStarting(stage)"
                    @stage-deploy-started="stageDeployStarted(stage)"
                    @stage-deploy-failed="stageDeployFailed(stage)"
                    @stage-deleted="stageDeleted($index)"
                />
                <Transition name="fade">
                    <ChevronRightIcon
                        v-if="$index <= pipeline.stages.length - 2 || ($index == pipeline.stages.length - 1 && addStageAvailable)"
                        class="ff-icon mt-4 flex-shrink-0"
                        :class="{
                            'animate-deploying': nextStageDeploying($index),
                            'ff-disabled': !nextStageAvailable(stage, $index)
                        }"
                    />
                </Transition>
            </template>
            <Transition name="fade">
                <PipelineStage v-if="addStageAvailable" @click="addStage" />
            </Transition>
        </div>
        <div v-else class="ff-pipeline-stages">
            <PipelineStage v-if="addStageAvailable" @click="addStage" />
            <p class="text-center text-gray-400 center w-full">No stages in sight just yet!</p>
        </div>
    </div>
</template>

<script>
import { ChevronRightIcon, PencilAltIcon, TrashIcon } from '@heroicons/vue/outline'

import { mapState } from 'vuex'

import ApplicationAPI from '../../api/application.js'
import { StageAction, StageType } from '../../api/pipeline.js'
import usePermissions from '../../composables/Permissions.js'

import Alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'
import { Roles } from '../../utils/roles.js'

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
        },
        deviceStatusMap: {
            required: true,
            type: Map
        },
        deviceGroupStatusMap: {
            required: true,
            type: Map
        },
        gitRepoStatusMap: {
            required: true,
            type: Map
        }
    },
    emits: ['pipeline-deleted', 'stage-deleted', 'deploy-starting', 'deploy-started', 'stage-deploy-starting', 'stage-deploy-started', 'stage-deploy-failed'],
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
    },
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
        ...mapState('account', ['team', 'teamMembership']),
        saveRowEnabled () {
            return this.scopedPipeline.name?.length > 0
        },
        addStageAvailable () {
            return this.hasPermission('pipeline:edit')
        },
        stagesWithStates () {
            return this.pipeline.stages.map((stage) => {
                // For now, each stage contains only one instance, one device, or a device group, so read state from that object
                // Falls back to the summary object on the stage if the status has not loaded yet
                const stageInstanceState = this.instanceStatusMap.get(stage.instance?.id) || stage.instance
                const stageDeviceState = this.deviceStatusMap.get(stage.device?.id) || stage.device

                const stageDeviceGroupMapId = `${stage.id}:${stage.deviceGroup?.id}`
                const stageDeviceGroupState = this.deviceGroupStatusMap.get(stageDeviceGroupMapId) || stage.deviceGroup

                const stageGitRepoState = this.gitRepoStatusMap.get(stage.id)

                if (stage.stageType === StageType.GITREPO) {
                    stage.state = {
                        isDeploying: stageGitRepoState?.isDeploying,
                        status: stageGitRepoState?.status ?? stage.gitRepo.status,
                        statusMessage: stageGitRepoState?.statusMessage ?? stage.gitRepo.statusMessage,
                        lastPushAt: stageGitRepoState?.lastPushAt ?? stage.gitRepo.lastPushAt
                    }
                } else if (stageDeviceGroupState) {
                    // Set the state state based on group, device, or instance
                    stage.state = {
                        isDeploying: stageDeviceGroupState.isDeploying,
                        targetMatchCount: stageDeviceGroupState.targetMatchCount,
                        activeMatchCount: stageDeviceGroupState.activeMatchCount,
                        developerModeCount: stageDeviceGroupState.developerModeCount,
                        runningCount: stageDeviceGroupState.runningCount,
                        hasTargetSnapshot: stageDeviceGroupState.hasTargetSnapshot
                    }
                } else {
                    stage.state = stageInstanceState?.state || stageDeviceState?.status
                }

                stage.flowLastUpdatedSince = stageInstanceState?.flowLastUpdatedSince
                stage.lastSeenSince = stageDeviceState?.lastSeenSince

                // If any device or instance inside the stage are deploying, this stage is deploying
                stage.isDeploying = stageDeviceState?.isDeploying || stageInstanceState?.isDeploying || stageDeviceGroupState?.isDeploying || stageGitRepoState?.isDeploying

                return stage
            })
        },
        lastStageIsDeviceGroup () {
            const lastStage = this.pipeline?.stages?.[this.pipeline.stages.length - 1]
            return lastStage?.stageType === StageType.DEVICEGROUP
        }
    },
    created () {
        this.StageType = StageType
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
            this.$emit('stage-deploy-starting', stage, nextStage, this.pipeline)
        },
        stageDeployStarted (stage) {
            const nextStage = this.pipeline.stages.find((s) => s.id === stage.NextStageId)
            this.$emit('stage-deploy-started', stage, nextStage, this.pipeline)
        },
        stageDeployFailed (stage) {
            const nextStage = this.pipeline.stages.find((s) => s.id === stage.NextStageId)
            this.$emit('stage-deploy-failed', stage, nextStage, this.pipeline)
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
        nextStageAvailable (stage, $index) {
            const endofPipeline = ($index >= this.pipeline.stages.length - 1)
            if (!endofPipeline && stage.stageType === StageType.GITREPO) {
                // A git repo stage can pull as long as it is not the last stage
                return true
            }
            if (stage.action !== StageAction.NONE && !endofPipeline) {
                // we are mid-pipeline
                const nextStage = this.pipeline.stages[$index + 1]
                if (nextStage.instance?.protected?.enabled && this.teamMembership.role !== Roles.Owner) {
                    return false
                }
                if (nextStage.device?.mode === 'developer') {
                    // cannot push to a device in Developer Mode
                    return false
                }
                return true
            } else {
                // 'none' action or end of pipeline - nothing to deploy to
                return false
            }
        },
        deletePipeline () {
            const msg = {
                header: 'Delete Pipeline',
                kind: 'danger',
                confirmLabel: 'Delete',
                text: `Are you sure you want to delete the pipeline "${this.pipeline.name}"?`
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
