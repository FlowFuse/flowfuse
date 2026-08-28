<template>
    <ff-loading
        v-if="loading.create"
        :message="$t('ui.creatingPipelineStage')"
    />
    <ff-loading
        v-else-if="loading.update"
        :message="$t('ui.updatingPipelineStage')"
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
            <template v-if="isEdit">{{ $t('ui.updateExistingPipelineStageFromP0', { p0: pipeline?.name }) }}</template>
            <template v-else>{{ $t('ui.createANewPipelineStageForP0', { p0: pipeline?.name }) }}</template>
        </div>

        <div>
            <label class="w-full block text-sm font-medium text-gray-700 mb-2">{{ $t('ui.stageType') }}</label>
            <ff-tile-selection v-model="input.stageType" data-form="stage-type">
                <ff-tile-selection-option
                    :label="$t('ui.hostedInstance')"
                    :value="StageType.INSTANCE"
                    description=""
                    color="#8F0000"
                    :disabled="!allowInstanceSelection"
                    :disabledTooltip="$t('ui.cannotAddHostedInstanceAfterADeviceGroup')"
                >
                    <template #icon><IconNodeRedSolid /></template>
                </ff-tile-selection-option>
                <ff-tile-selection-option
                    :label="$t('ui.remoteInstance')"
                    :value="StageType.DEVICE"
                    description=""
                    color="var(--ff-palette-teal-700)"
                    :disabled="!allowInstanceSelection"
                    :disabledTooltip="$t('ui.cannotAddRemoteInstanceAfterADeviceGroup')"
                >
                    <template #icon><IconDeviceSolid /></template>
                </ff-tile-selection-option>
                <ff-tile-selection-option
                    v-if="deviceGroupsEnabled"
                    :label="$t('ui.deviceGroup2')"
                    :value="StageType.DEVICEGROUP"
                    description=""
                    color="var(--ff-palette-teal-700)"
                    :disabled="isFirstStage || !allowDeviceGroupSelection"
                    :disabledTooltip="$t('ui.deviceGroupsCannotBeTheFirstStageOrProceedNonDev')"
                >
                    <template #icon><IconDeviceGroupSolid /></template>
                </ff-tile-selection-option>
                <ff-tile-selection-option
                    v-if="gitReposEnabled"
                    :label="$t('ui.gitRepository2')"
                    :value="StageType.GITREPO"
                    description=""
                    color="#e46133"
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
            :placeholder="$t('ui.eGDevelopmentStagingProduction')"
        >
            <template #default>
                {{ $t('ui.stageName') }}
            </template>
        </FormRow>

        <!-- Instance/Device -->
        <div class="flex space-x-4">
            <form-row v-if="input.stageType === StageType.INSTANCE" container-class="w-full" data-form="stage-instance">
                <template #default>
                    {{ $t('ui.chooseHostedInstance') }}
                </template>
                <template #input>
                    <ff-combobox
                        v-model="input.instanceId"
                        class="w-full grow max-w-sm ff-combobox"
                        :options="instanceOptions"
                        :disabled="instanceDropdownDisabled"
                        :placeholder="$t('ui.chooseInstance')"
                    />
                </template>
            </form-row>

            <form-row
                v-else-if="input.stageType === StageType.DEVICE"
                container-class="w-full"
                data-form="stage-device"
            >
                <template #default>
                    {{ $t('ui.chooseRemoteInstance') }}
                </template>
                <template #input>
                    <ff-combobox
                        v-model="input.deviceId"
                        class="w-full grow max-w-sm ff-combobox"
                        :options="deviceOptions"
                        :disabled="deviceDropdownDisabled"
                        :placeholder="$t('ui.chooseRemoteInstance')"
                    />
                </template>
            </form-row>

            <!-- Device Group -->
            <FormRow
                v-else-if="input.stageType === StageType.DEVICEGROUP"
                v-model="input.deviceGroupId"
                :options="deviceGroupOptions"
                data-form="stage-device-group"
                :placeholder="deviceGroupDropdownPlaceholder"
                :disabled="deviceGroupDropdownDisabled"
                class="grow"
            >
                <template #default>
                    {{ $t('ui.chooseDeviceGroup') }}
                </template>
            </FormRow>
            <div v-else-if="input.stageType === StageType.GITREPO" class="w-full space-y-4">
                <FormRow
                    v-model="input.gitTokenId"
                    :options="gitTokens"
                    data-form="stage-repo-tokens"
                    class="grow"
                >
                    <template #default>
                        {{ $t('ui.chooseGitToken') }}
                    </template>
                    <template #description>
                        {{ $t('ui.thisTokenIsUsedToAuthenticateWithYourGitProvider') }} <strong>Team Settings -> {{ $t('ui.integrations') }}</strong>.
                    </template>
                </FormRow>
                <FormRow
                    v-model="input.url"
                    :error="errors.url"
                    type="text"
                    data-form="stage-repo-url"
                    :placeholder="gitPlaceholder"
                >
                    <template #default>
                        {{ $t('ui.repositoryUrl') }}
                    </template>
                    <template #description>
                        {{ $t('ui.supportsGithubAzureDevopsAndAnyHttpsGitServerGit') }}
                    </template>
                </FormRow>
                <FormRow
                    v-model="input.pushPath"
                    :error="errors.pushPath"
                    type="text"
                    data-form="stage-repo-pushPath"
                    :placeholder="isFirstStage ? 'e.g. snapshot.json' : 'Generate filename from source stage'"
                >
                    <template #default>
                        {{ $t('ui.snapshotFilename') }}
                    </template>
                    <template #description>
                        {{ $t('ui.theFilenameToUseForTheSnapshot') }} <span v-if="!isFirstStage">{{ $t('ui.ifLeftBlankTheNameWillBeGeneratedFromTheSourceSt') }}</span>
                    </template>
                </FormRow>
                <FormRow
                    v-model="input.branch"
                    type="text"
                    data-form="stage-repo-branch"
                    :placeholder="$t('ui.defaultMain')"
                >
                    <template #default>
                        {{ $t('ui.pushBranch') }}
                    </template>
                    <template #description>
                        {{ $t('ui.theBranchToPushSnapshotsToTheBranchMustAlreadyEx') }}
                    </template>
                </FormRow>
                <FormRow
                    v-model="input.pullBranch"
                    type="text"
                    data-form="stage-repo-pull-branch"
                    :placeholder="'default: ' + (input.branch || 'main')"
                >
                    <template #default>
                        {{ $t('ui.pullBranch') }}
                    </template>
                    <template #description>
                        {{ $t('ui.theBranchToPullSnapshotsFromIfNotSetItWillUseThe') }}
                    </template>
                </FormRow>
                <FormRow
                    v-model="input.credentialSecret"
                    type="password"
                    data-form="stage-repo-password"
                >
                    <template #default>
                        {{ $t('ui.flowCredentialsKey') }}
                    </template>
                    <template #description>
                        {{ $t('ui.thisIsASecretTokenUsedToEncryptFlowCredentialsWh') }}
                    </template>
                </FormRow>
            </div>
            <div v-else class="text-sm text-gray-500">{{ $t('ui.pleaseSelectAStageType') }}</div>

            <div
                v-if="input.deviceGroupId === 'new'"
                class="max-w-sm grow space-y-2"
            >
                <FormRow
                    v-model="newDeviceGroupInput.name"
                    type="text"
                    data-form="stage-device-group-name"
                    :placeholder="$t('ui.eGDevelopmentStagingProduction')"
                    :required="input.deviceGroupId === 'new'"
                >
                    {{ $t('ui.groupName') }}
                </FormRow>
                <FormRow
                    v-model="newDeviceGroupInput.description"
                    type="text"
                    data-form="stage-device-group-description"
                >
                    {{ $t('ui.groupDescription') }}
                </FormRow>
            </div>
        </div>

        <!-- Action -->
        <FormRow
            v-if="input.stageType !== StageType.DEVICEGROUP && input.stageType !== StageType.GITREPO"
            v-model="input.action"
            :options="actionOptions"
            data-form="stage-action"
            :placeholder="$t('ui.selectAction')"
        >
            <template #default>
                {{ $t('ui.selectAction') }}
                <InformationCircleIcon class="ff-icon ff-icon-sm text-gray-800 cursor-pointer hover:text-blue-700" @click="$refs['help-dialog'].show()" />
            </template>
            <template #description>
                {{ $t('ui.whenThisStageIsPushedToTheNextWhichActionWillBeP') }}
            </template>
        </FormRow>

        <ff-dialog v-if="input.stageType !== StageType.DEVICEGROUP" ref="help-dialog" class="ff-dialog-box--info" :header="$t('ui.snapshotActions')">
            <template #default>
                <div class="flex gap-8">
                    <slot name="pictogram"><img src="../../../images/pictograms/snapshot_red.png"></slot>
                    <div v-if="input.stageType === StageType.INSTANCE">
                        <p>
                            {{ $t('ui.whenAnInstancePipelineStageTypeIsTriggeredAnInst') }}
                        </p>
                        <p>
                            <b>{{ $t('ui.createNewSnapshot2') }}</b> {{ $t('ui.createsANewSnapshotUsingTheCurrentFlowsAndSettin') }}
                        </p>
                        <p>
                            <b>{{ $t('ui.useLatestInstanceSnapshot') }}</b> {{ $t('ui.usesTheMostRecentExistingSnapshotOfTheInstanceTh') }}
                        </p>
                        <p>
                            <b>{{ $t('ui.promptToSelectSnapshot') }}</b> {{ $t('ui.willAskAtDeployTimeWhichSnapshotFromTheSourceSta') }}
                        </p>
                    </div>
                    <div v-else-if="input.stageType === StageType.DEVICE">
                        <p>
                            {{ $t('ui.whenADevicePipelineStageTypeIsTriggeredAnDeviceS') }}
                        </p>
                        <p>
                            <b>{{ $t('ui.useActiveSnapshot2') }}</b> {{ $t('ui.willUseTheSnapshotCurrentlyActiveOnTheDeviceTheD') }}
                        </p>
                        <p>
                            <b>{{ $t('ui.useLatestDeviceSnapshot') }}</b> {{ $t('ui.usesTheMostRecentSnapshotCreatedFromTheDeviceThe') }}
                        </p>
                        <p>
                            <b>{{ $t('ui.promptToSelectSnapshot') }}</b> {{ $t('ui.willAskAtDeployTimeWhichSnapshotFromTheSourceSta') }}
                        </p>
                    </div>
                </div>
            </template>
            <template #actions>
                <ff-button @click="$refs['help-dialog'].close()">{{ $t('ui.close') }}</ff-button>
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
            {{ $t('ui.deployToDevices') }}
            <template v-if="!sourceStage">- Not available for first stage in pipeline</template>
            <template v-else-if="!input.instanceId">
                {{ $t('ui.onlyAvailableWhenAnInstanceIsSelected') }}
            </template>
            <template #description>
                {{ $t('ui.whenThisStageIsDeployedToChangesWillAlsoBeBeDepl') }}
            </template>
        </FormRow>

        <div class="flex flex-wrap gap-1 items-center">
            <ff-button
                class="ff-btn--secondary"
                @click="$router.back()"
            >
                {{ $t('ui.cancel') }}
            </ff-button>

            <ff-button
                :disabled="!submitEnabled"
                data-action="add-stage"
                type="submit"
            >
                <span v-if="isEdit">
                    {{ $t('ui.updateStage') }}
                </span>
                <span v-else>
                    {{ $t('ui.addStage') }}
                </span>
            </ff-button>
        </div>
    </form>
</template>

<script>
import { InformationCircleIcon } from '@heroicons/vue/24/outline'

import { mapState } from 'pinia'

import { StageAction, StageType } from '../../../api/pipeline.js'
import teamApi from '../../../api/team.js'

import FormRow from '../../../components/FormRow.vue'

import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import IconDeviceGroupSolid from '../../../components/icons/DeviceGroupSolid.js'
import IconDeviceSolid from '../../../components/icons/DeviceSolid.js'
import IconGit from '../../../components/icons/Git.js'
import IconNodeRedSolid from '../../../components/icons/NodeRedSolid.js'

import { t } from '../../../i18n.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

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
                pullBranch: stage.gitRepo?.pullBranch,
                pushPath: stage.gitRepo?.pushPath,
                pullPath: stage.gitRepo?.pullPath,
                credentialSecret: stage.gitRepo?.credentialSecret ? '__PLACEHOLDER__' : ''
            },
            original: {
                stageType: stage.stageType || StageType.INSTANCE,
                deviceId: stage.devices?.[0].id,
                instanceId: stage.instances?.[0].id,
                deviceGroupId: stage.deviceGroups?.[0].id
            },
            newDeviceGroupInput: {
                name: '',
                description: ''
            },
            errors: {
                url: '',
                pushPath: ''
            },
            gitTokens: []
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['features', 'featuresCheck']),
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
                    this.input.pullBranch !== this.stage.gitRepo?.pullBranch ||
                    this.input.pushPath !== this.stage.gitRepo?.pushPath ||
                    this.input.gitTokenId !== this.stage.gitRepo?.gitTokenId ||
                    (this.input.credentialSecret !== '' && this.input.credentialSecret !== '__PLACEHOLDER__')
                ))
            )
        },
        submitEnabled () {
            return this.formDirty &&
                (this.input.instanceId || this.input.deviceId || this.input.deviceGroupId || this.input.gitTokenId) &&
                this.input.name &&
                ((this.input.stageType === StageType.DEVICEGROUP || this.input.stageType === StageType.GITREPO) ? true : this.input.action) &&
                (this.input.stageType === StageType.GITREPO
                    ? (
                        this.input.url &&
                        this.errors.url === '' &&
                        this.input.credentialSecret &&
                        (!this.isFirstStage || this.input.pushPath)
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
                return !instanceIdsInUse.has(instance.id) || (this.isEdit && instance.id === this.original.instanceId)
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

            // exclude this stage's deviceId from the list of devices in use
            if (this.original.stageType === StageType.DEVICE && this.original.deviceId) {
                deviceIdsInUse.delete(this.original.deviceId)
            }

            // return only devices that are not in use by any stage, or the original deviceId if editing
            return this.applicationDevices.filter((device) => {
                return !deviceIdsInUse.has(device.id) || (this.isEdit && device.id === this.original.deviceId)
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
            return this.featuresCheck?.isDeviceGroupsFeatureEnabled
        },
        devicesGroupsNotInUse () {
            const deviceGroupIdsInUse = this.pipeline.stages.reduce((acc, stage) => {
                stage.deviceGroups.forEach((deviceGroup) => {
                    acc.add(deviceGroup.id)
                })

                return acc
            }, new Set())

            return this.deviceGroups.filter((deviceGroup) => {
                return !deviceGroupIdsInUse.has(deviceGroup.id) || (this.isEdit && deviceGroup.id === this.original.deviceGroupId)
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
            return this.featuresCheck?.isGitIntegrationFeatureEnabled
        },
        actionOptions () {
            const type = this.input.stageType === StageType.DEVICE ? 'device' : 'instance'

            const options = [
                { value: StageAction.USE_LATEST_SNAPSHOT, label: `Use latest ${type} snapshot` },
                { value: StageAction.PROMPT, label: `Prompt to select ${type} snapshot` }
            ]

            if (this.input.stageType === StageType.INSTANCE) {
                options.unshift({ value: StageAction.CREATE_SNAPSHOT, label: t('ui.createNewInstanceSnapshot') })
            } else if (this.input.stageType === StageType.DEVICE) {
                options.unshift({ value: StageAction.USE_ACTIVE_SNAPSHOT, label: t('ui.useActiveSnapshot') })
            }
            if (!this.isFirstStage && this.isLastStage) {
                options.unshift({ value: StageAction.NONE, label: t('ui.doNothing') })
            }

            return options
        },
        repoStageHasCredentialSecret () {
            return this.stage.gitRepo?.credentialSecret
        },
        selectedGitTokenType () {
            const tok = this.gitTokens.find(t => t.value === this.input.gitTokenId)
            return tok?.type
        },
        gitPlaceholder () {
            if (this.selectedGitTokenType === 'azure') {
                return 'e.g. https://dev.azure.com/[org]/[project]/_git/[repo]'
            } else if (this.selectedGitTokenType === 'generic') {
                return 'e.g. https://git.example.com/org/repo.git'
            }
            return 'e.g. https://github.com/[org]/[repo]'
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
        'input.url' () {
            this.validateGitUrl()
        },
        'input.gitTokenId' () {
            this.validateGitUrl()
        },
        'input.pushPath' (newPushPath, oldPushPath) {
            if (newPushPath === '' && this.isFirstStage) {
                this.errors.pushPath = t('ui.pleaseEnterAValidFilename')
            } else {
                this.errors.pushPath = ''
            }
        }
    },
    created () {
        this.StageType = StageType
    },
    async mounted () {
        // set the stagetype to device group if the last stage is a device group itself (only permit device groups after a device group)
        if (!this.allowInstanceSelection && (this.input.stageType === StageType.INSTANCE || this.input.stageType === StageType.DEVICE)) {
            this.input.stageType = StageType.DEVICEGROUP
        }
        if (this.gitReposEnabled) {
            const tokens = await teamApi.getGitTokens(this.team.id)
            this.gitTokens = tokens.tokens.map((token) => {
                return {
                    label: token.name,
                    value: token.id,
                    type: token.type
                }
            })
        }
        this.original.stageType = this.input.stageType
        this.original.deviceId = this.input.deviceId
        this.original.instanceId = this.input.instanceId
        this.original.deviceGroupId = this.input.deviceGroupId
    },
    methods: {
        validateGitUrl () {
            const url = this.input.url
            const type = this.selectedGitTokenType
            if (url === '') {
                this.errors.url = ''
            } else if (type === 'github' || type === 'azure') {
                this.errors.url = (/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(url) || /^https:\/\/dev\.azure\.com\/[^/]+\/[^/]\/_git\/[^/]+$/.test(url))
                    ? ''
                    : 'Please enter a valid GitHub or Azure DevOps repository URL'
            } else {
                this.errors.url = /^https:\/\//i.test(url) ? '' : 'Please enter a valid HTTPS repository URL'
            }
        },
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
                if (this.repoStageHasCredentialSecret && (!this.input.credentialSecret || this.input.credentialSecret === '__PLACEHOLDER__')) {
                    // Don't send back a blank/placeholder value to avoid overwriting the existing value
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
