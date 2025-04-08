<template>
    <ff-loading
        v-if="loading.create"
        message="Creating Pipeline Stage..."
    />
    <ff-loading
        v-else-if="loading.update"
        message="Updating Pipeline Stage..."
    />
    <form
        class="space-y-6"
        @submit.prevent="submit"
    >
        <SectionTopMenu
            :hero="isEdit ? 'Edit Pipeline Stage' : 'Add Pipeline Stage'"
        />

        <!-- Form Description -->
        <div class="mb-8 text-sm text-gray-500">
            <template v-if="isEdit">
                Update existing pipeline stage from {{ pipeline?.name }}.
            </template>
            <template v-else>
                Create a new pipeline stage for {{ pipeline?.name }}.
            </template>
        </div>

        <div>
            <label class="w-full block text-sm font-medium text-gray-700 mb-2">Stage Type</label>
            <ff-tile-selection v-model="input.stageType" data-form="stage-type">
                <ff-tile-selection-option
                    label="Hosted Instance"
                    :value="StageType.INSTANCE"
                    description=""
                    color="#8F0000"
                    :disabled="!allowInstanceSelection"
                    disabledTooltip="Cannot add Hosted Instance after a device group"
                >
                    <template #icon><IconNodeRedSolid /></template>
                </ff-tile-selection-option>
                <ff-tile-selection-option
                    label="Remote Instance"
                    :value="StageType.DEVICE"
                    description=""
                    color="#31959A"
                    :disabled="!allowInstanceSelection"
                    disabledTooltip="Cannot add Remote Instance after a device group"
                >
                    <template #icon><IconDeviceSolid /></template>
                </ff-tile-selection-option>
                <ff-tile-selection-option
                    v-if="deviceGroupsEnabled"
                    label="Device Group"
                    :value="StageType.DEVICEGROUP"
                    description=""
                    color="#31959A"
                    :disabled="isFirstStage || !allowDeviceGroupSelection"
                    disabledTooltip="Device Groups cannot be the first stage or proceed non Device Group stages"
                >
                    <template #icon><IconDeviceGroupSolid /></template>
                </ff-tile-selection-option>
                <ff-tile-selection-option
                    v-if="gitReposEnabled"
                    label="Git Repository"
                    :value="StageType.GITREPO"
                    description=""
                    color="#e46133"
                    :disabled="isFirstStage"
                    disabledTooltip="Git Repository stages can only follow an Instance stage"
                >
                    <template #icon><IconGit /></template>
                </ff-tile-selection-option>
            </ff-tile-selection>
        </div>

        <!-- Stage Name -->
        <FormRow
            v-model="input.name"
            type="text"
            data-form="stage-name"
            placeholder="e.g. Development, Staging, Production"
        >
            <template #default>
                Stage Name
            </template>
        </FormRow>

        <!-- Instance/Device -->
        <div class="flex space-x-4">
            <FormRow
                v-if="input.stageType === StageType.INSTANCE"
                v-model="input.instanceId"
                :options="instanceOptions"
                data-form="stage-instance"
                :placeholder="instanceDropdownPlaceholder"
                :disabled="instanceDropdownDisabled"
                class="flex-grow"
            >
                <template #default>
                    Choose Hosted Instance
                </template>
            </FormRow>

            <FormRow
                v-else-if="input.stageType === StageType.DEVICE"
                v-model="input.deviceId"
                :options="deviceOptions"
                data-form="stage-device"
                :placeholder="deviceDropdownPlaceholder"
                :disabled="deviceDropdownDisabled"
                class="flex-grow"
            >
                <template #default>
                    Choose Remote Instance
                </template>
            </FormRow>

            <!-- Device Group -->
            <FormRow
                v-else-if="input.stageType === StageType.DEVICEGROUP"
                v-model="input.deviceGroupId"
                :options="deviceGroupOptions"
                data-form="stage-device-group"
                :placeholder="deviceGroupDropdownPlaceholder"
                :disabled="deviceGroupDropdownDisabled"
                class="flex-grow"
            >
                <template #default>
                    Choose Device Group
                </template>
            </FormRow>
            <div v-else-if="input.stageType === StageType.GITREPO" class="w-full space-y-4">
                <FormRow
                    v-model="input.gitTokenId"
                    :options="gitTokens"
                    data-form="stage-repo-tokens"
                    class="flex-grow"
                >
                    <template #default>
                        Choose Git Token
                    </template>
                </FormRow>
                <FormRow
                    v-model="input.url"
                    :error="errors.url"
                    type="text"
                    data-form="stage-repo-url"
                    placeholder="e.g. https://github.com/[org]/[repo]"
                >
                    <template #default>
                        Repository URL
                    </template>
                    <template #description>
                        Only GitHub hosted repositories are currently supported.
                    </template>
                </FormRow>
                <FormRow
                    v-model="input.branch"
                    type="text"
                    data-form="stage-repo-branch"
                    placeholder="e.g. main"
                >
                    <template #default>
                        Repository Branch
                    </template>
                    <template #description>
                        The branch must already exist on the repository.
                    </template>
                </FormRow>
                <FormRow
                    v-model="input.credentialSecret"
                    type="password"
                    data-form="stage-repo-password"
                >
                    <template #default>
                        Flow Credentials Key
                    </template>
                    <template #description>
                        This is a secret token used to encrypt flow credentials when pushed to the repository. You will need to provide
                        this key when importing the snapshot into another instance.
                    </template>
                </FormRow>
            </div>
            <div v-else class="text-sm text-gray-500">Please select a stage type</div>

            <div
                v-if="input.deviceGroupId === 'new'"
                class="max-w-sm flex-grow space-y-2"
            >
                <FormRow
                    v-model="newDeviceGroupInput.name"
                    type="text"
                    data-form="stage-device-group-name"
                    placeholder="e.g. Development, Staging, Production"
                    :required="input.deviceGroupId === 'new'"
                >
                    Group Name
                </FormRow>
                <FormRow
                    v-model="newDeviceGroupInput.description"
                    type="text"
                    data-form="stage-device-group-description"
                >
                    Group Description
                </FormRow>
            </div>
        </div>

        <!-- Action -->
        <FormRow
            v-if="input.stageType !== StageType.DEVICEGROUP && input.stageType !== StageType.GITREPO"
            v-model="input.action"
            :options="actionOptions"
            data-form="stage-action"
            placeholder="Select Action"
        >
            <template #default>
                Select Action
                <InformationCircleIcon class="ff-icon ff-icon-sm text-gray-800 cursor-pointer hover:text-blue-700" @click="$refs['help-dialog'].show()" />
            </template>
            <template #description>
                When this stage is pushed to the next, which action will be performed?
            </template>
        </FormRow>

        <ff-dialog v-if="input.stageType !== StageType.DEVICEGROUP" ref="help-dialog" class="ff-dialog-box--info" header="Snapshot Actions">
            <template #default>
                <div class="flex gap-8">
                    <slot name="pictogram"><img src="../../../images/pictograms/snapshot_red.png"></slot>
                    <div v-if="input.stageType === StageType.INSTANCE">
                        <p>
                            When an instance Pipeline stage type is triggered an Instance Snapshot is deployed to the next stage. You can configure how this stage picks what snapshot to deploy.
                        </p>
                        <p>
                            <b>Create New Snapshot:</b> Creates a new snapshot using the current flows and settings.
                        </p>
                        <p>
                            <b>Use Latest Instance Snapshot:</b> Uses the most recent existing snapshot of the instance. The deploy will fail if no snapshot exists.
                        </p>
                        <p>
                            <b>Prompt to Select Snapshot:</b> Will ask at deploy time, which snapshot from the source stage should be copied to the next stage.
                        </p>
                    </div>
                    <div v-else-if="input.stageType === StageType.DEVICE">
                        <p>
                            When a device Pipeline stage type is triggered an Device Snapshot is deployed to the next stage. You can configure how this stage picks what snapshot to deploy.
                        </p>
                        <p>
                            <b>Use Active Snapshot:</b> Will use the snapshot currently active on the device. The deploy will fail if there is no active snapshot.
                        </p>
                        <p>
                            <b>Use Latest Device Snapshot:</b> Uses the most recent snapshot created from the device. The deploy will fail if no snapshot exists.
                        </p>
                        <p>
                            <b>Prompt to Select Snapshot:</b> Will ask at deploy time, which snapshot from the source stage should be copied to the next stage.
                        </p>
                    </div>
                </div>
            </template>
            <template #actions>
                <ff-button @click="$refs['help-dialog'].close()">Close</ff-button>
            </template>
        </ff-dialog>

        <!-- Deploy to Devices -->
        <FormRow
            v-if="input.stageType === StageType.INSTANCE"
            v-model="input.deployToDevices"
            type="checkbox"
            data-form="stage-deploy-to-devices"
            :disabled="!input.instanceId || !sourceStage"
            class="max-w-md"
        >
            Deploy to Devices
            <template v-if="!sourceStage">- Not available for first stage in pipeline</template>
            <template v-else-if="!input.instanceId">
                - Only available when an instance is selected
            </template>
            <template #description>
                When this stage is deployed to changes will also be be deployed to all devices connected to this stages instance.
            </template>
        </FormRow>

        <div class="flex flex-wrap gap-1 items-center">
            <ff-button
                class="ff-btn--secondary"
                @click="$router.back()"
            >
                Cancel
            </ff-button>

            <ff-button
                :disabled="!submitEnabled"
                data-action="add-stage"
                type="submit"
            >
                <span v-if="isEdit">
                    Update Stage
                </span>
                <span v-else>
                    Add Stage
                </span>
            </ff-button>
        </div>
    </form>
</template>

<script>
import { InformationCircleIcon } from '@heroicons/vue/outline'

import { mapState } from 'vuex'

import { StageAction, StageType } from '../../../api/pipeline.js'
import teamApi from '../../../api/team.js'

import FormRow from '../../../components/FormRow.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import IconDeviceGroupSolid from '../../../components/icons/DeviceGroupSolid.js'
import IconDeviceSolid from '../../../components/icons/DeviceSolid.js'
import IconGit from '../../../components/icons/Git.js'
import IconNodeRedSolid from '../../../components/icons/NodeRedSolid.js'

export default {
    name: 'PipelineForm',
    components: {
        InformationCircleIcon,
        SectionTopMenu,
        FormRow,
        IconDeviceGroupSolid,
        IconDeviceSolid,
        IconGit,
        IconNodeRedSolid
    },
    props: {
        applicationDevices: {
            type: Array,
            required: true
        },
        instances: {
            type: Array,
            required: true
        },
        deviceGroups: {
            type: Array,
            required: true
        },
        pipeline: {
            type: Object,
            required: true
        },
        stage: {
            type: Object,
            default () {
                return {}
            }
        },
        sourceStage: {
            type: String,
            default: null
        }
    },
    emits: ['submit'],
    data () {
        const stage = this.stage

        return {
            loading: {
                create: false,
                update: false
            },
            input: {
                name: stage?.name,
                instanceId: stage.instances?.[0].id, // API supports multiple instances per stage but UI only exposes one
                deviceId: stage.devices?.[0].id, // API supports multiple devices per stage but UI only exposes one
                deviceGroupId: stage.deviceGroups?.[0].id, // API supports multiple devices per stage but UI only exposes one
                action: stage?.action || 'none',
                deployToDevices: stage.deployToDevices || false,
                stageType: stage.stageType || StageType.INSTANCE,
                gitTokenId: stage.gitRepo?.gitTokenId,
                url: stage.gitRepo?.url,
                branch: stage.gitRepo?.branch,
                credentialSecret: ''
            },
            newDeviceGroupInput: {
                name: '',
                description: ''
            },
            errors: {
                url: ''
            },
            gitTokens: []
        }
    },
    computed: {
        ...mapState('account', ['team', 'features']),
        isEdit () {
            return !!this.stage.id
        },
        isFirstStage () {
            if (this.isEdit) {
                // if the editing stage is the first stage, then it is the first stage
                return this.pipeline.stages[0].id === this.stage.id
            } else {
                // if there are no stages, then this is (will be) the first stage
                if (this.pipeline.stages.length === 0) {
                    return true
                }
                // if there are stages, then this cannot be the first stage
                return false
            }
        },
        isLastStage () {
            return !this.isEdit || this.pipeline.stages[this.pipeline.stages.length - 1].id === this.stage.id
        },
        allowInstanceSelection () {
            if (this.isFirstStage) {
                return true
            }
            // if any prior stage is a device group, then we cannot add a hosted/remote instance
            const priorStages = []
            for (let stageIndex = 0; stageIndex < this.pipeline.stages.length; stageIndex++) {
                const stage = this.pipeline.stages[stageIndex]
                if (stage.id === this.stage.id) {
                    break
                }
                priorStages.push(stage)
            }
            return priorStages.length === 0 || !priorStages.some((stage) => stage.stageType === StageType.DEVICEGROUP)
        },
        allowDeviceGroupSelection () {
            if (this.isFirstStage) {
                return false
            }
            if (this.isLastStage) {
                return true
            }
            // if any later stage is NOT a device group, then we cannot set this as a device group
            const laterStages = []
            for (let stageIndex = this.pipeline.stages.length - 1; stageIndex >= 0; stageIndex--) {
                const stage = this.pipeline.stages[stageIndex]
                if (stage.id === this.stage.id) {
                    break
                }
                laterStages.push(stage)
            }
            return laterStages.length === 0 || laterStages.every((stage) => stage.stageType === StageType.DEVICEGROUP)
        },
        formDirty () {
            return (
                this.input.name !== this.stage.name ||
                this.input.instanceId !== this.stage.instances?.[0].id ||
                this.input.deviceId !== this.stage.devices?.[0].id ||
                this.input.deviceGroupId !== this.stage.deviceGroups?.[0].id ||
                (this.input.stageType !== StageType.DEVICEGROUP && this.input.action !== this.stage.action) ||
                (this.input.stageType !== StageType.DEVICEGROUP && this.input.deployToDevices !== this.stage.deployToDevices) ||
                (this.input.stageType === StageType.GITREPO && (
                    this.input.url !== this.stage.gitRepo?.url ||
                    this.input.branch !== this.stage.gitRepo?.branch ||
                    this.input.gitTokenId !== this.stage.gitRepo?.gitTokenId ||
                    this.input.credentialSecret !== ''
                ))
            )
        },
        submitEnabled () {
            return this.formDirty &&
                (this.input.instanceId || this.input.deviceId || this.input.deviceGroupId || this.input.gitTokenId) &&
                this.input.name &&
                (this.input.stageType === StageType.DEVICEGROUP ? true : this.input.action) &&
                (this.input.stageType === StageType.GITREPO
                    ? (
                        this.input.url &&
                        this.errors.url === '' &&
                        this.input.branch &&
                        (this.repoStageHasCredentialSecret || this.input.credentialSecret)
                    )
                    : true
                ) &&
                (this.input.deviceGroupId === 'new' ? this.newDeviceGroupInput.name !== '' : true)
        },
        instancesNotInUse () {
            const instanceIdsInUse = this.pipeline.stages.reduce((acc, stage) => {
                stage.instances.forEach((instance) => {
                    acc.add(instance.id)
                })

                return acc
            }, new Set())

            return this.instances.filter((instance) => {
                return !instanceIdsInUse.has(instance.id) || instance.id === this.input.instanceId
            })
        },
        instanceOptions () {
            return this.instancesNotInUse.map((instance) => {
                return {
                    label: instance.name,
                    value: instance.id
                }
            })
        },
        instanceDropdownDisabled () {
            return this.instancesNotInUse.length === 0
        },
        instanceDropdownPlaceholder () {
            if (this.instancesNotInUse.length === 0) {
                return 'No instances available'
            }

            return 'Choose Instance'
        },

        devicesNotInUse () {
            const deviceIdsInUse = this.pipeline.stages.reduce((acc, stage) => {
                stage.devices.forEach((device) => {
                    acc.add(device.id)
                })

                return acc
            }, new Set())

            return this.applicationDevices.filter((device) => {
                return !deviceIdsInUse.has(device.id) || device.id === this.input.deviceId
            })
        },
        deviceOptions () {
            return this.devicesNotInUse.map((device) => {
                return {
                    label: device.name,
                    value: device.id
                }
            })
        },
        deviceDropdownDisabled () {
            return this.devicesNotInUse.length === 0
        },
        deviceDropdownPlaceholder () {
            if (this.devicesNotInUse.length === 0) {
                return 'No Remote Instances available in Application'
            }

            return 'Choose Remote Instance'
        },
        deviceGroupsEnabled () {
            return this.features?.deviceGroups && this.team?.type.properties.features?.deviceGroups
        },
        devicesGroupsNotInUse () {
            const deviceGroupIdsInUse = this.pipeline.stages.reduce((acc, stage) => {
                stage.deviceGroups.forEach((deviceGroup) => {
                    acc.add(deviceGroup.id)
                })

                return acc
            }, new Set())

            return this.deviceGroups.filter((deviceGroup) => {
                return !deviceGroupIdsInUse.has(deviceGroup.id) || deviceGroup.id === this.input.deviceGroupId
            })
        },
        deviceGroupOptions () {
            return [
                ...this.devicesGroupsNotInUse?.map((device) => {
                    return {
                        label: device.name,
                        value: device.id
                    }
                }) || [],
                { label: 'Create New Application Level Group…', value: 'new' }
            ]
        },
        deviceGroupDropdownDisabled () {
            return this.deviceGroupOptions.length === 0
        },
        deviceGroupDropdownPlaceholder () {
            if (this.deviceGroupOptions.length === 0) {
                return 'No Application Level Device Groups available'
            }

            return 'Choose Application Level Device Group'
        },
        gitReposEnabled () {
            return this.features?.gitIntegration && this.team?.type.properties.features?.gitIntegration
        },
        actionOptions () {
            const type = this.input.stageType === StageType.DEVICE ? 'device' : 'instance'

            const options = [
                { value: StageAction.USE_LATEST_SNAPSHOT, label: `Use latest ${type} snapshot` },
                { value: StageAction.PROMPT, label: `Prompt to select ${type} snapshot` }
            ]

            if (this.input.stageType === StageType.INSTANCE) {
                options.unshift({ value: StageAction.CREATE_SNAPSHOT, label: 'Create new instance snapshot' })
            } else if (this.input.stageType === StageType.DEVICE) {
                options.unshift({ value: StageAction.USE_ACTIVE_SNAPSHOT, label: 'Use active snapshot' })
            }
            if (!this.isFirstStage && this.isLastStage) {
                options.unshift({ value: StageAction.NONE, label: 'Do nothing' })
            }

            return options
        },
        repoStageHasCredentialSecret () {
            return this.stage.gitRepo?.credentialSecret
        }
    },
    watch: {
        'input.stageType' (newStageType, oldStageType) {
            // Check if selected action is still available
            if (this.actionOptions.some((option) => option.value === this.input.action)) {
                return
            }

            // If not, reset to the stages original action (if available)
            this.input.action = this.stage?.action && this.actionOptions.some((option) => option.value === this.stage.action) ? this.stage.action : null
        },
        'input.url' (newUrl, oldUrl) {
            if (newUrl === '') {
                this.errors.url = ''
            } else if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(newUrl)) {
                this.errors.url = 'Please enter a valid GitHub repository URL'
            } else {
                this.errors.url = ''
            }
        }
    },
    created () {
        this.StageType = StageType
    },
    async mounted () {
        // set the stagetype to device group if the last stage is a device group itself (only permit device groups after a device group)
        if (!this.allowInstanceSelection) {
            this.input.stageType = StageType.DEVICEGROUP
        }
        const tokens = await teamApi.getGitTokens(this.team.id)
        this.gitTokens = tokens.tokens.map((token) => {
            return {
                label: token.name,
                value: token.id
            }
        })
    },
    methods: {
        async submit () {
            this.loading.creating = !this.isEdit
            this.loading.updating = this.isEdit

            // Always clear any leftover newDeviceGroup input
            delete this.input.newDeviceGroup

            // TODO: refactor this sanitization of this.input
            if (this.input.stageType === StageType.INSTANCE) {
                this.input.deviceId = null
                this.input.deviceGroupId = null
                this.input.gitTokenId = null
            } else if (this.input.stageType === StageType.DEVICE) {
                this.input.deviceGroupId = null
                this.input.instanceId = null
                this.input.gitTokenId = null
            } else if (this.input.stageType === StageType.DEVICEGROUP) {
                this.input.instanceId = null
                this.input.deviceId = null
                this.input.gitTokenId = null

                this.input.action = StageAction.PROMPT // default to PROMPT (not used for device groups)

                // If creating a new group, copy over the props
                if (this.input.deviceGroupId === 'new') {
                    this.input.newDeviceGroup = {
                        name: this.newDeviceGroupInput.name,
                        description: this.newDeviceGroupInput.description
                    }
                }
            } else if (this.input.stageType === StageType.GITREPO) {
                this.input.instanceId = null
                this.input.deviceId = null
                this.input.deviceGroupId = null
                this.input.action = StageAction.NONE // default to NONE (not used for git repos)
                if (this.repoStageHasCredentialSecret && !this.input.credentialSecret) {
                    // Don't send back a blank value to avoid overwriting the existing value
                    delete this.input.credentialSecret
                }
            }

            // Ensure deploy to device is not set with "Device" type stage
            if (this.input.stageType === StageType.DEVICE) {
                this.input.deployToDevices = false
            }

            this.$emit('submit', this.input)
        }
    }
}
</script>
