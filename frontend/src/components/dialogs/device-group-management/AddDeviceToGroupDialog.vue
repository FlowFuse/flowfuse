<template>
    <section data-el="add-device-to-group-dialog" class="add-device-to-group-dialog">
        <transition name="fade" mode="out-in">
            <ff-loading v-if="loading" />

            <div v-else class="flex flex-col gap-8">
                <div class="flex flex-col gap-4">
                    <div class="title">
                        <h3 v-if="devices && (!devicesBelongToSameApplication || assigningInstanceOwnedDevices)">
                            Unable to assign the remote instance to group.
                        </h3>
                        <h3 v-else>
                            Select a group from {{ application ? application.name : device.application.name }}
                        </h3>
                    </div>

                    <ff-combobox
                        v-if="devicesBelongToSameApplication && !assigningInstanceOwnedDevices"
                        v-model="selectedDeviceGroup"
                        :options="deviceGroups" label-key="name" value-key="id"
                    >
                        <template #option="{ option, selected, active }">
                            <li :class="{selected, active}">
                                <div class="ff-option-content flex flex-col !gap-2 !items-start">
                                    <div class="title flex justify-between w-full items-center">
                                        <span class="truncate bold flex-1">{{ option.name }}</span>
                                        <span class="truncate text-gray-500 flex gap-1 items-center">
                                            <ChipIcon class="ff-icon ff-icon-sm" />
                                            {{ option.deviceCount }}
                                        </span>
                                    </div>
                                    <div
                                        v-if="option.description"
                                        class="description italic text-gray-400 clipped-overflow--two-lines"
                                    >
                                        <p :title="option.description">
                                            {{ option.description }}
                                        </p>
                                    </div>
                                    <div
                                        v-if="option.targetSnapshot"
                                        class="snapshot text-gray-600 clipped-overflow text-right w-full text-sm"
                                    >
                                        <p :title="option.targetSnapshot.name">
                                            {{ option.targetSnapshot.name }}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        </template>
                    </ff-combobox>
                </div>

                <deploy-notice
                    v-if="devicesBelongToSameApplication && !assigningInstanceOwnedDevices"
                    :target-snapshot="selectedDeviceGroupTargetSnapshot"
                    :default-text="assignmentNoticeText"
                />

                <notice-banner
                    v-if="devices && !devicesBelongToSameApplication"
                    text="Selected Remote Instances must belong to the same application in order to assign them to a group."
                />

                <notice-banner
                    v-if="assigningInstanceOwnedDevices"
                    text="One or more Remote Instances are owned by a Hosted Instance and cannot be assigned to a group."
                />

                <device-list
                    v-if="!assigningSingleDevice"
                    :devices="devices"
                    @selection-removed="$emit('selection-removed', $event)"
                />
            </div>
        </transition>
    </section>
</template>

<script>
import { ChipIcon } from '@heroicons/vue/outline'
import { mapActions, mapState } from 'vuex'

import ApplicationAPI from '../../../api/application.js'
import { pluralize } from '../../../composables/String.js'
import FfLoading from '../../Loading.vue'
import NoticeBanner from '../../notices/NoticeBanner.vue'
import DeployNotice from '../../notices/device-groups/DeployNotice.vue'

import DeviceList from './components/device-list.vue'

export default {
    name: 'AddDeviceToGroupDialog',
    components: {
        DeviceList,
        DeployNotice,
        NoticeBanner,
        FfLoading,
        ChipIcon
    },
    props: {
        device: {
            type: Object,
            required: false,
            default: null
        },
        devices: {
            type: Array,
            required: false,
            default: () => []
        }
    },
    emits: ['selected', 'selection-removed'],
    data () {
        return {
            loading: false,
            deviceGroups: [],
            selectedDeviceGroup: null
        }
    },
    computed: {
        ...mapState('ux/dialog', ['dialog']),
        application () {
            if (!this.devicesBelongToSameApplication) return null

            const applications = new Set()
            for (const device of this.devices) {
                applications.add(device.application)
            }

            return Array.from(applications).pop()
        },
        assigningSingleDevice () {
            return !!this.device
        },
        assignmentNoticeText () {
            if (this.devices.length > 2) {
                return 'These Remote Instances will be updated to deploy the selected groups active pipeline snapshot.'
            }

            return 'This Remote Instance will be updated to deploy the selected groups active pipeline snapshot'
        },
        selectedDeviceGroupTargetSnapshot () {
            if (!this.selectedDeviceGroup) return null

            const result = this.deviceGroups.find(group => group.id === this.selectedDeviceGroup)

            if (result) {
                return result.targetSnapshot ?? null
            }

            return null
        },
        assigningInstanceOwnedDevices () {
            if (this.assigningSingleDevice) return false

            return this.devices.some(d => d.ownerType === 'instance')
        },
        devicesBelongToSameApplication () {
            if (this.assigningSingleDevice) return true

            const applications = new Set()

            for (const device of this.devices) {
                applications.add(device.application?.id ?? '')
            }

            return applications.size === 1 && !applications.has('')
        },
        disabledPrimary () {
            return this.assigningInstanceOwnedDevices || !this.devicesBelongToSameApplication || !this.selectedDeviceGroup
        }
    },
    watch: {
        selectedDeviceGroup () {
            this.$emit('selected', this.selectedDeviceGroup)
            if (this.device) {
                this.setDisablePrimary((this.device.deviceGroup?.id ?? null) === this.selectedDeviceGroup)
            } else if (this.devices.length > 0) {
                this.setDisablePrimary(this.selectedDeviceGroup === null)
            }
        },
        application: {
            immediate: true,
            handler (application) {
                if (this.device) {
                    this.getDeviceGroups(this.device.application)
                } else if (application) {
                    this.getDeviceGroups(application)
                }
            }
        },
        disabledPrimary: {
            immediate: true,
            handler (isDisabled) {
                this.setDisablePrimary(isDisabled)
            }
        }
    },
    methods: {
        pluralize,
        ...mapActions('ux/dialog', ['setDisablePrimary']),
        async getDeviceGroups (application) {
            this.loading = true
            return ApplicationAPI.getDeviceGroups(application.id)
                .then((groups) => {
                    this.deviceGroups = groups.groups
                    if (this.device?.deviceGroup) {
                        this.selectedDeviceGroup = this.device.deviceGroup.id
                    }
                    if (this.device) {
                        this.setDisablePrimary((this.device?.deviceGroup?.id ?? null) === this.selectedDeviceGroup)
                    }
                })
                .catch((err) => {
                    console.error(err)
                })
                .finally(() => {
                    this.loading = false
                })
        }
    }
}
</script>
