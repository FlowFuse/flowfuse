<template>
    <div v-if="stage" class="ff-pipeline-stage" data-el="ff-pipeline-stage">
        <div class="ff-pipeline-stage-banner">
            <label>{{ stage.name }}</label>
            <div class="ff-pipeline-actions">
                <span
                    data-action="stage-edit"
                    @click="edit"
                >
                    <PencilAltIcon
                        v-if="editEnabled && application?.id && !deploying"
                        class="ff-icon ff-clickable"
                    />
                </span>
                <span
                    data-action="stage-delete"
                    @click="deleteStage"
                >
                    <TrashIcon
                        v-if="editEnabled && application?.id && !deploying"
                        class="ff-icon ff-clickable"
                    />
                </span>
                <span
                    data-action="stage-run"
                    @click="runStage"
                >
                    <PlayIcon
                        v-if="playEnabled && pipeline?.id && !deploying"
                        class="ff-icon ff-clickable"
                    />
                </span>
                <SpinnerIcon v-if="deploying" class="ff-icon" />
            </div>
        </div>
        <div v-if="stage.instance || stage.device" class="py-3">
            <div>
                <div v-if="stage.stageType == StageType.INSTANCE" class="ff-pipeline-stage-type">
                    <router-link class="flex gap-2 items-center" :to="{name: 'Instance', params: { id: stage.instance.id }}">
                        <IconNodeRedSolid class="ff-icon ff-icon-lg text-red-800" />
                        <div>
                            <label class="flex items-center gap-2">Instance:</label>
                            <span>
                                {{ stage.instance.name }}
                            </span>
                        </div>
                    </router-link>
                </div>
                <div v-if="stage.stageType == StageType.DEVICE" class="ff-pipeline-stage-type">
                    <router-link class="flex gap-2 items-center" :to="{name: 'Device', params: { id: stage.device.id }}">
                        <IconDeviceSolid class="ff-icon ff-icon-lg text-teal-700" />
                        <div>
                            <label class="flex items-center gap-2">Device:</label>
                            <span>
                                {{ stage.device.name }}
                            </span>
                        </div>
                    </router-link>
                </div>
            </div>
            <div v-if="stage.stageType == StageType.INSTANCE" class="ff-pipeline-stage-row">
                <label>Last Deployed:</label>
                <span>{{ stage.flowLastUpdatedSince ? stage.flowLastUpdatedSince : 'Unknown' }}</span>
            </div>
            <div v-else-if="stage.stageType == StageType.DEVICE" class="ff-pipeline-stage-row">
                <label>Last Seen:</label>
                <span>{{ stage.lastSeenSince ? stage.lastSeenSince : 'Unknown' }}</span>
            </div>
            <div class="ff-pipeline-stage-row">
                <label v-if="stage.stageType == StageType.DEVICE">Last Known Status:</label>
                <label v-else>Status:</label>
                <InstanceStatusBadge :status="stage.state" />
            </div>
            <div v-if="stage.stageType == StageType.INSTANCE" class="ff-pipeline-stage-row">
                <label>URL:</label>
                <a
                    class="ff-link"
                    :href="stage.instance.url"
                    :target="stage.instance.name"
                >{{ stage.instance.url }}</a>
            </div>
            <div v-if="playEnabled" class="ff-pipeline-stage-row">
                <label>Deploy Action:</label>
                <span>
                    <template v-if="stage.action === 'create_snapshot'">
                        Create new snapshot
                    </template>
                    <template v-else-if="stage.action === 'use_latest_snapshot'">
                        Use latest {{ stage.stageType === StageType.INSTANCE ? 'instance' : 'device' }} snapshot
                    </template>
                    <template v-else-if="stage.action==='prompt'">
                        Prompt to select snapshot
                    </template>
                </span>
            </div>
        </div>
        <div v-else class="flex justify-center py-6">No Instance or Device Bound</div>
        <DeployStageDialog
            ref="deployStageDialog"
            :stage="stage"
            @deploy-stage="deployStage"
        />
    </div>
    <div v-else class="ff-pipeline-stage ff-pipeline-stage-ghost" data-action="add-stage">
        <PlusCircleIcon class="ff-icon ff-icon-xl" />
        <label>Add Stage</label>
    </div>
</template>

<script>
import { PencilAltIcon, PlayIcon, PlusCircleIcon, TrashIcon } from '@heroicons/vue/outline'

import PipelineAPI, { StageType } from '../../api/pipeline.js'

import InstanceStatusBadge from '../../pages/instance/components/InstanceStatusBadge.vue'

import Alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'
import IconDeviceSolid from '../icons/DeviceSolid.js'
import IconNodeRedSolid from '../icons/NodeRedSolid.js'

import SpinnerIcon from '../icons/Spinner.js'

import DeployStageDialog from './DeployStageDialog.vue'

export default {
    name: 'PipelineStage',
    components: {
        InstanceStatusBadge,
        DeployStageDialog,
        PencilAltIcon,
        PlayIcon,
        PlusCircleIcon,
        SpinnerIcon,
        TrashIcon,
        IconDeviceSolid,
        IconNodeRedSolid
    },
    props: {
        application: {
            default: null,
            type: Object
        },
        pipeline: {
            default: null,
            type: Object
        },
        stage: {
            default: null,
            type: Object
        },
        playEnabled: {
            default: false,
            type: Boolean
        },
        editEnabled: {
            default: false,
            type: Boolean
        }
    },
    emits: ['stage-deleted', 'stage-deploy-starting', 'stage-deploy-started'],
    computed: {
        deploying () {
            return this.stage.isDeploying
        }
    },
    created () {
        this.StageType = StageType
    },
    methods: {
        runStage: async function () {
            // get target stage
            const target = await PipelineAPI.getPipelineStage(
                this.pipeline.id,
                this.stage.NextStageId
            )
            if (!target) {
                Alerts.emit(
                    `Unable to find configured target for stage "${this.stage.name}".`,
                    'warning'
                )
            }

            this.$refs.deployStageDialog.show(target)
        },
        edit () {
            const route = {
                name: 'EditPipelineStage',
                params: {
                    // url params
                    id: this.application.id,
                    pipelineId: this.pipeline.id,
                    stageId: this.stage.id
                }
            }

            if (this.pipeline.stages.length > 0 && this.pipeline.stages.indexOf(this.stage) > 0) {
                route.query = {
                    sourceStage: this.pipeline.stages[this.pipeline.stages.indexOf(this.stage)].id
                }
            }

            this.$router.push(route)
        },

        async deployStage (target, sourceSnapshot) {
            this.$emit('stage-deploy-starting')

            try {
                // sourceSnapshot can be undefined if "create new snapshot" was chosen
                await PipelineAPI.deployPipelineStage(this.pipeline.id, this.stage.id, sourceSnapshot?.id)
            } catch (error) {
                Alerts.emit(error.message, 'warning')
                return
            }

            this.$emit('stage-deploy-started')

            const messageParts = ['Deployment']
            if (sourceSnapshot) {
                messageParts.push(`of snapshot "${sourceSnapshot.name}"`)
            }
            messageParts.push(`from "${this.stage.name}" to "${target.name}"`)
            if (target.deployToDevices) {
                messageParts.push(', and all its devices')
            }
            messageParts.push('has started.')

            if (target.device?.id) {
                messageParts.push('The connected device has been requested to update, but the time to deploy is dependent on its current status.')
            }

            Alerts.emit(
                messageParts.join(' '),
                'confirmation',
                5000
            )
        },

        deleteStage () {
            const msg = {
                header: 'Delete Pipeline Stage',
                kind: 'danger',
                confirmLabel: 'Delete',
                html: `<p>Are you sure you want to delete the pipeline stage "${this.stage.name}"?</p>`
            }
            Dialog.show(msg, async () => {
                await PipelineAPI.deletePipelineStage(
                    this.pipeline.id,
                    this.stage.id
                )

                Alerts.emit('Pipeline stage successfully deleted', 'confirmation')
                this.$emit('stage-deleted')
            })
        }
    }
}
</script>
