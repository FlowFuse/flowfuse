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
            :hero="'Edit Pipeline Stage'"
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
            <label class="w-full block text-sm font-medium text-gray-700 mb-1">Stage Type</label>
            <ff-tile-selection v-model="input.stageType">
                <ff-tile-selection-option
                    label="Instance"
                    :value="StageType.INSTANCE"
                    description=""
                    color="#8F0000"
                >
                    <template #icon><IconNodeRedSolid /></template>
                </ff-tile-selection-option>
                <ff-tile-selection-option
                    label="Device"
                    :value="StageType.DEVICE"
                    description=""
                    color="#31959A"
                >
                    <template #icon><IconDeviceSolid /></template>
                </ff-tile-selection-option>
            </ff-tile-selection>
        </div>

        <!-- Stage Name -->
        <FormRow
            v-model="input.name"
            type="text"
            data-form="stage-name"
        >
            <template #default>
                Stage name
            </template>
        </FormRow>

        <!-- Instance/Device -->
        <div>
            <FormRow
                v-if="input.stageType === StageType.INSTANCE"
                v-model="input.instanceId"
                :options="instanceOptions"
                data-form="stage-instance"
                :placeholder="instanceDropdownPlaceholder"
                :disabled="instanceDropdownDisabled"
            >
                <template #default>
                    Choose Instance
                </template>
            </FormRow>

            <FormRow
                v-else-if="input.stageType === StageType.DEVICE"
                v-model="input.deviceId"
                :options="deviceOptions"
                data-form="stage-device"
                :placeholder="deviceDropdownPlaceholder"
                :disabled="deviceDropdownDisabled"
            >
                <template #default>
                    Choose Device
                </template>
            </FormRow>

            <div v-else class="text-sm text-gray-500">Please select a stage type</div>
        </div>

        <!-- Action -->
        <FormRow
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

        <ff-dialog ref="help-dialog" class="ff-dialog-box--info" header="Snapshot Actions">
            <template #default>
                <div class="flex gap-8">
                    <slot name="pictogram"><img src="../../../images/pictograms/snapshot_red.png"></slot>
                    <div>
                        <p>
                            When a Pipeline stage is triggered an Instance Snapshot is deployed to the next stage. You can configure how this stage picks what snapshot to deploy.
                        </p>
                        <p>
                            Create New Snapshot: Creates a new snapshot using the current flows and settings.
                        </p>
                        <p>
                            Use Latest Instance Snapshot: Uses the most recent existing snapshot of the instance. The deploy will fail if no snapshot exists.
                        </p>
                        <p>
                            Prompt to Select Snapshot: Will ask at deploy time, which snapshot from the source stage should be copied to the next stage.
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

import { StageType } from '../../../api/pipeline.js'

import FormRow from '../../../components/FormRow.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import IconDeviceSolid from '../../../components/icons/DeviceSolid.js'
import IconNodeRedSolid from '../../../components/icons/NodeRedSolid.js'

export default {
    name: 'PipelineForm',
    components: {
        InformationCircleIcon,
        SectionTopMenu,
        FormRow,
        IconDeviceSolid,
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
                action: stage?.action,
                deployToDevices: stage.deployToDevices || false,
                stageType: stage.stageType || StageType.INSTANCE
            }
        }
    },
    computed: {
        isEdit () {
            return !!this.stage.id
        },
        formDirty () {
            return (
                this.input.name !== this.stage.name ||
                this.input.instanceId !== this.stage.instances?.[0].id ||
                this.input.deviceId !== this.stage.devices?.[0].id ||
                this.input.action !== this.stage.action ||
                this.input.deployToDevices !== this.stage.deployToDevices
            )
        },
        submitEnabled () {
            return this.formDirty && (this.input.instanceId || this.input.deviceId) && this.input.name && this.input.action
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
                return 'No application level devices available'
            }

            return 'Choose Application Level Device'
        },

        actionOptions () {
            const options = [
                { value: 'use_latest_snapshot', label: 'Use latest instance snapshot' },
                { value: 'prompt', label: 'Prompt to select snapshot' }
            ]

            if (this.input.stageType == StageType.INSTANCE) {
                options.unshift({ value: 'create_snapshot', label: 'Create new snapshot' })
            }

            return options
        }
    },
    watch: {
        'input.stageType': function () {
            // ensure deploy to device is not set with "Device" type stage
            if (this.input.stageType === StageType.DEVICE) {
                this.input.deployToDevices = false
            }
        }
    },
    created () {
        this.StageType = StageType
    },
    methods: {
        async submit () {
            this.loading.creating = !this.isEdit
            this.loading.updating = this.isEdit

            if (this.input.stageType === StageType.INSTANCE) {
                this.input.deviceId = null
            } else if (this.input.stageType === StageType.DEVICE) {
                this.input.instanceId = null
            }

            this.$emit('submit', this.input)
        }
    }
}
</script>
