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
                            Select a group from {{
                                application ? application.name : device.application.name
                            }}
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

                <ff-accordion label="Show selection" data-el="selection-accordion" class="max-h-[500px]" :overflows-content="true">
                    <template #meta>
                        <span class="italic text-gray-500">{{ devices.length }} Remote {{ pluralize('Instance', devices.length) }}</span>
                    </template>
                    <template #content>
                        <ff-data-table :key="dialog.is.payload.devices.length" :rows="dialog.is.payload.devices" :columns="columns" class="mt-3">
                            <template #row-actions="{row}">
                                <ff-button
                                    kind="tertiary"
                                    :disabled="dialog.is.payload.devices.length === 1"
                                    class="hover:text-indigo-900 hover:!bg-transparent"
                                    @click="onRemoveFromSelection(row)"
                                >
                                    Remove
                                </ff-button>
                            </template>
                        </ff-data-table>
                    </template>
                </ff-accordion>
            </div>
        </transition>
    </section>
</template>

<script>
import { ChipIcon } from '@heroicons/vue/outline'
import { mapActions, mapState } from 'vuex'

import ApplicationAPI from '../../api/application.js'
import { pluralize } from '../../composables/String.js'
import FfDataTable from '../../ui-components/components/data-table/DataTable.vue'
import Accordion from '../Accordion.vue'
import FfLoading from '../Loading.vue'
import NoticeBanner from '../notices/NoticeBanner.vue'
import DeployNotice from '../notices/device-groups/DeployNotice.vue'

export default {
    name: 'AddDeviceToGroupDialog',
    components: {
        FfDataTable,
        DeployNotice,
        NoticeBanner,
        FfLoading,
        ChipIcon,
        'ff-accordion': Accordion
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
            application: null,
            loading: true,
            deviceGroups: [],
            selectedDeviceGroup: null,
            devicesBelongToSameApplication: true,
            assigningInstanceOwnedDevices: false,
            columns: [
                { label: 'Name', key: 'name', class: ['flex-grow'] },
                { label: 'Application', key: 'application.name' },
                { label: 'Instance', key: 'instance.name' }
            ]
        }
    },
    computed: {
        ...mapState('ux/dialog', ['dialog']),
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
        }
    },
    mounted () {
        this.validateDeviceApplicationOwnership()
            .then(() => this.getDeviceGroups())
            .catch(e => e)
            .finally(() => {
                this.loading = false
            })
    },
    methods: {
        pluralize,
        ...mapActions('ux/dialog', ['setDisablePrimary']),
        async getDeviceGroups () {
            return ApplicationAPI.getDeviceGroups(this.devices.length ? this.application.id : this.device.application.id)
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
        },
        validateDeviceApplicationOwnership () {
            return new Promise((resolve, reject) => {
                if (this.devices.length > 0) {
                    const map = {}

                    for (const device of this.devices) {
                        if (device.ownerType === 'instance') {
                            this.assigningInstanceOwnedDevices = true
                            this.setDisablePrimary(true)
                            return reject(new Error('Unable to assign hosted instance owned devices to a group'))
                        }

                        map[device.application?.id ?? ''] = ''
                    }
                    const keys = Object.keys(map)

                    if (keys.some(key => key === '')) {
                        this.devicesBelongToSameApplication = false
                        this.setDisablePrimary(true)
                        return reject(new Error('Some Remote Instances do not belong to an application'))
                    }

                    this.devicesBelongToSameApplication = keys.filter(key => key)
                        .length === 1

                    if (this.devicesBelongToSameApplication) {
                        this.application = this.devices[0].application
                    } else {
                        this.setDisablePrimary(true)
                        reject(new Error('Remote Instances do not belong to the same application'))
                    }
                }

                this.setDisablePrimary(true)
                resolve()
            })
        },
        onRemoveFromSelection (row) {
            this.$emit('selection-removed', row)
        }
    }
}
</script>

<style lang="scss">
.add-device-to-group-dialog {
    .ff-accordion {
        margin-bottom: 0;

        button {
            border-top: none;
            border-left: none;
            border-right: none;
            background: transparent;
            transition: background-color ease-in-out .3s;
            padding-left: 0;
            padding-right: 0;

            label {
                font-weight: normal;
            }

            &:hover {
                background-color: $ff-grey-50;
            }
        }
    }
}
</style>
