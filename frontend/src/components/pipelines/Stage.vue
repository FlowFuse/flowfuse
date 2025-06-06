<template>
    <div v-if="stage" class="ff-pipeline-stage" data-el="ff-pipeline-stage" :class="{'ff-pipeline-stage--error': inDeveloperMode && stageIndex > 0}">
        <div class="ff-pipeline-stage-banner">
            <div class="ff-pipeline-stage-banner-name">
                <label>{{ stage.name }}</label>
                <span v-if="error" class="ff-pipelines-stage-banner-error" data-el="stage-banner-error">
                    <ExclamationIcon class="ff-icon-sm" />
                    {{ error }}
                </span>
            </div>
            <div class="ff-pipeline-actions">
                <span
                    v-if="hasPermission('pipeline:edit')"
                    v-ff-tooltip:right="'Edit Pipeline Stage'"
                    data-action="stage-edit"
                    @click="edit"
                >
                    <PencilAltIcon
                        v-if="editEnabled && application?.id && !deploying"
                        class="ff-icon ff-clickable"
                    />
                </span>
                <span
                    v-if="hasPermission('pipeline:delete')"
                    v-ff-tooltip:right="'Delete Pipeline Stage'"
                    data-action="stage-delete"
                    @click="deleteStage"
                >
                    <TrashIcon
                        v-if="editEnabled && application?.id && !deploying"
                        class="ff-icon ff-clickable"
                    />
                </span>
                <span
                    v-if="hasPermission('pipeline:edit')"
                    v-ff-tooltip:right="'Run Pipeline Stage'"
                    data-action="stage-run"
                    :class="{'ff-disabled': !playEnabled || !pipeline?.id || deploying }"
                    @click="runStage"
                >
                    <PlayIcon
                        class="ff-icon ff-clickable"
                    />
                </span>
                <SpinnerIcon v-if="deploying" class="ff-icon" />
            </div>
        </div>
        <div v-if="stage.instance || stage.device || stage.deviceGroup || stage.gitRepo" class="py-3">
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
                        <span v-if="inDeveloperMode" v-ff-tooltip="'Cannot push to a Device in Developer Mode'">
                            <IconDeviceSolid class="ff-icon ff-icon-lg text-teal-700" />
                            <i class="bg-red-600 w-3 h-3 rounded-full absolute block -top-1 -right-1 border-2 border-gray-50" />
                        </span>
                        <IconDeviceSolid v-else class="ff-icon ff-icon-lg text-teal-700" />
                        <div>
                            <label class="flex items-center gap-2">Device:</label>
                            <span>
                                {{ stage.device.name }}
                            </span>
                        </div>
                    </router-link>
                </div>
                <div v-if="stage.stageType == StageType.DEVICEGROUP" class="ff-pipeline-stage-type">
                    <router-link class="flex gap-2 items-center" :to="{name: 'ApplicationDeviceGroupDevices', params: { applicationId: application.id, deviceGroupId: stage.deviceGroup.id }}">
                        <IconDeviceGroupSolid class="ff-icon ff-icon-lg text-teal-700" />
                        <div>
                            <label class="flex items-center gap-2">Device Group:</label>
                            <span>
                                {{ stage.deviceGroup.name }}
                            </span>
                        </div>
                    </router-link>
                </div>
                <div v-if="stage.stageType == StageType.GITREPO" class="ff-pipeline-stage-type">
                    <a class="flex gap-2 items-center" target="_blank" :href="`${stage.gitRepo.url}/tree/${stage.gitRepo.branch || 'main'}`">
                        <IconGit class="ff-icon ff-icon-lg" style="color: #e46133" />
                        <div>
                            <label class="flex items-center gap-2">GitHub Repository:</label>
                            <span>{{ stage.gitRepo?.url.replace("https://github.com/","") }}</span>
                        </div>
                    </a>
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
            <div v-if="stage.stageType !== StageType.DEVICEGROUP && stage.stageType !== StageType.GITREPO" class="ff-pipeline-stage-row">
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
            <div v-if="stage.stageType === StageType.DEVICEGROUP" class="ff-pipeline-stage-row">
                <label>Devices:</label>
                <StatusBadge :text="stage.deviceGroup?.deviceCount" status="info" />
            </div>
            <div v-if="stage.stageType === StageType.DEVICEGROUP" class="ff-pipeline-stage-row">
                <label>Deployed:</label>
                <div v-ff-tooltip="stage.state?.hasTargetSnapshot && (stage.state?.activeMatchCount === stage.deviceGroup?.deviceCount) ? 'All devices have the latest pipeline snapshot deployed' : 'Some devices do not have the latest pipeline snapshot deployed'">
                    <StatusBadge
                        :text="stage.state?.activeMatchCount"
                        :status="stage.state?.hasTargetSnapshot && (stage.state?.activeMatchCount === stage.deviceGroup?.deviceCount) ? 'success' : 'warning'"
                    />
                </div>
            </div>

            <template v-if="stage.stageType == StageType.GITREPO">
                <div class="ff-pipeline-stage-row">
                    <label>Branch:</label>
                    <div>
                        <template v-if="!stage.gitRepo?.pullBranch || stage.gitRepo?.pullBranch === stage.gitRepo?.branch">
                            <div>{{ stage.gitRepo?.branch || 'main' }}</div>
                        </template>
                        <template v-else>
                            <div>{{ stage.gitRepo?.branch || 'main' }} (push)</div>
                            <div>{{ stage.gitRepo?.pullBranch || 'main' }} (pull)</div>
                        </template>
                    </div>
                </div>
                <div v-if="!isFirstStage" class="ff-pipeline-stage-row">
                    <label>Last Pushed:</label>
                    <span v-ff-tooltip="stage.state?.lastPushAt || stage.gitRepo?.lastPushAt ||'Never'">{{ (stage.state?.lastPushAt || stage.gitRepo?.lastPushAt) ? daysSince((stage.state?.lastPushAt || stage.gitRepo?.lastPushAt)) : 'Never' }}</span>
                </div>
                <div class="ff-pipeline-stage-row">
                    <label>Last Pulled:</label>
                    <span v-ff-tooltip="stage.state?.lastPullAt || stage.gitRepo?.lastPullAt ||'Never'">{{ (stage.state?.lastPullAt || stage.gitRepo?.lastPullAt) ? daysSince((stage.state?.lastPullAt || stage.gitRepo?.lastPullAt)) : 'Never' }}</span>
                </div>
                <div v-if="stage.state?.status" class="ff-pipeline-stage-row">
                    <label>Status:</label>
                    <StatusBadge :status="stage.state?.status" />
                </div>
                <div v-if="stage.state?.statusMessage" class="ff-pipeline-stage-row">
                    <label>&nbsp;</label>
                    <span>{{ stage.state?.statusMessage }}</span>
                </div>
            </template>

            <div v-if="playEnabled && stage.stageType !== StageType.GITREPO" class="ff-pipeline-stage-row">
                <label>Deploy Action:</label>
                <span>
                    <template v-if="stage.stageType === StageType.DEVICEGROUP">
                        Use group snapshot
                    </template>
                    <template v-else-if="stage.action === StageAction.CREATE_SNAPSHOT">
                        Create new snapshot
                    </template>
                    <template v-else-if="stage.action === StageAction.USE_ACTIVE_SNAPSHOT">
                        Use active snapshot
                    </template>
                    <template v-else-if="stage.action== StageAction.USE_LATEST_SNAPSHOT">
                        Use latest {{ stage.stageType === StageType.INSTANCE ? 'instance' : 'device' }} snapshot
                    </template>
                    <template v-else-if="stage.action== StageAction.PROMPT">
                        Prompt to select snapshot
                    </template>
                </span>
            </div>
            <div v-if="stage.instance?.protected?.enabled" class="ff-pipeline-stage-row" data-el="protected-marker">
                <label>Instance Protected:</label>
                <div v-ff-tooltip:right="'Only Team Owner can deploy to this Instance'">
                    <LockClosedIcon class="ff-icon" />
                </div>
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
import { ExclamationIcon, LockClosedIcon, PencilAltIcon, PlayIcon, PlusCircleIcon, TrashIcon } from '@heroicons/vue/outline'

import PipelineAPI, { StageAction, StageType } from '../../api/pipeline.js'

import StatusBadge from '../../components/StatusBadge.vue'
import usePermissions from '../../composables/Permissions.js'
import InstanceStatusBadge from '../../pages/instance/components/InstanceStatusBadge.vue'

import Alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'

import daysSince from '../../utils/daysSince.js'
import pipelineValidation from '../../utils/pipelineValidation.js'

import IconDeviceGroupSolid from '../icons/DeviceGroupSolid.js'
import IconDeviceSolid from '../icons/DeviceSolid.js'
import IconGit from '../icons/Git.js'
import IconNodeRedSolid from '../icons/NodeRedSolid.js'

import SpinnerIcon from '../icons/Spinner.js'

import DeployStageDialog from './DeployStageDialog.vue'

export default {
    name: 'PipelineStage',
    components: {
        DeployStageDialog,
        IconDeviceGroupSolid,
        IconDeviceSolid,
        IconGit,
        IconNodeRedSolid,
        InstanceStatusBadge,
        LockClosedIcon,
        PencilAltIcon,
        PlayIcon,
        PlusCircleIcon,
        SpinnerIcon,
        StatusBadge,
        TrashIcon,
        ExclamationIcon
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
    emits: ['stage-deleted', 'stage-deploy-starting', 'stage-deploy-started', 'stage-deploy-failed'],
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
    },
    computed: {
        isFirstStage () {
            return this.stageIndex === 0
        },
        stageIndex () {
            return this.pipeline.stages.indexOf(this.stage)
        },
        deploying () {
            return this.stage.isDeploying
        },
        inDeveloperMode () {
            return this.stage.device?.mode === 'developer'
        },
        error () {
            if (this.inDeveloperMode) {
                return 'Device in Dev Mode'
            }
            return ''
        }
    },
    created () {
        // Expose enums to template
        this.StageType = StageType
        this.StageAction = StageAction
    },
    methods: {
        daysSince,
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

            if (this.pipeline.stages.length > 0 && this.stageIndex > 0) {
                route.query = {
                    sourceStage: this.pipeline.stages[this.stageIndex].id
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
                this.$emit('stage-deploy-failed')
                if (error.response?.data?.error) {
                    return Alerts.emit(error.response.data.error, 'warning')
                }

                return Alerts.emit('Deployment of stage has failed for an unknown reason.', 'warning')
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

            if (target.deviceGroup?.id) {
                messageParts.push("The devices in the Device Group have been requested to update, but the time to deploy is dependent on each device's own status.")
            }

            Alerts.emit(
                messageParts.join(' '),
                'confirmation',
                5000
            )
        },

        deleteStage () {
            try {
                // client-side validation of pipeline stages before hitting the API
                const orderedStages = [...this.pipeline.stages]
                // Update the previous stage to point to the next stage when this model is deleted
                // e.g. A -> B -> C to A -> C when B is deleted
                const previousStage = orderedStages.find(s => s.NextStageId === this.stage.id)
                // remap nextid to the next stage id
                if (previousStage) {
                    previousStage.NextStageId = this.stage.NextStageId ?? null
                }
                const orderedStagesProposed = orderedStages.filter(s => s.id !== this.stage.id)
                pipelineValidation.validateStages(orderedStagesProposed)
            } catch (error) {
                Alerts.emit(error.message, 'warning')
                return
            }

            const msg = {
                header: 'Delete Pipeline Stage',
                kind: 'danger',
                confirmLabel: 'Delete',
                text: `Are you sure you want to delete the pipeline stage "${this.stage.name}"?`
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
