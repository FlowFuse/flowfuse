<template>
    <main v-if="!deviceGroup?.id">
        <ff-loading message="Loading Device Group..." />
    </main>
    <div v-else class="w-full">
        <FormHeading class="mb-3">
            <div class="flex justify-between items-center">
                <div class="min-w-0 truncate mr-2">Device Group Membership</div>
                <div v-if="!editMode && !hasChanges" class="flex flex-wrap justify-end items-end gap-x-2 gap-y-2 mt-0 mb-1">
                    <ff-button kind="primary" size="small" class="w-24 whitespace-nowrap" @click="editMode = true">Edit</ff-button>
                </div>
                <div v-else class="flex flex-wrap justify-end items-end gap-x-2 gap-y-2 mt-0 mb-1">
                    <ff-button kind="secondary" size="small" class="w-24 whitespace-nowrap" @click="cancelChanges">Cancel</ff-button>
                    <ff-button kind="primary" size="small" :disabled="!hasChanges" class="w-24 whitespace-nowrap" @click="saveChanges">Save Changes</ff-button>
                </div>
            </div>
        </FormHeading>

        <div class="flex flex-col sm:flex-row">
            <div v-if="editMode" class="w-full sm:w-1/2 order-3 sm:order-1">
                <div class="flex justify-between items-center mb-1">
                    <h3 class="text-gray-800 block text-sm font-medium mb-1 min-w-0 truncate">Available devices</h3>
                    <ff-button size="small" class="w-28 whitespace-nowrap mb-1" :disabled="!selectedAvailableDevices.length" @click="addDevicesToGroup()">Add Devices</ff-button>
                </div>
                <ff-data-table
                    :columns="tableColsRW"
                    :show-search="true"
                    search-placeholder="Search..."
                    no-data-message="No Devices available"
                    @update:search="updateAvailableDeviceListDebounced"
                    @update:sort="updateAvailableDevicesSort"
                >
                    <template #rows>
                        <ff-data-table-row v-for="device in availableDevices" :key="device">
                            <ff-data-table-cell>
                                <ff-checkbox v-model="device.selected" class="inline" />
                            </ff-data-table-cell>
                            <ff-data-table-cell>{{ device.name }}</ff-data-table-cell>
                            <ff-data-table-cell>{{ device.type }}</ff-data-table-cell>
                        </ff-data-table-row>
                    </template>
                </ff-data-table>
            </div>
            <div v-if="editMode" class="w-1 border-l border-gray-300 pl-4 ml-4 hidden sm:block order-2" />
            <div v-if="editMode" class="w-full border-t border-gray-300 pb-4 mt-4 sm:hidden order-2" />
            <div :class="editMode ? 'w-full sm:w-1/2 order-1 sm:order-3' : 'w-full'">
                <div v-if="editMode" class="flex justify-between items-center mb-1">
                    <!-- <h2 class="text-xl font-bold min-w-0 truncate">{{ deviceGroup.name }}</h2> -->
                    <h3 class="text-gray-800 block text-sm font-medium mb-1 min-w-0 truncate">Group Members</h3>
                    <ff-button size="small" class="w-28 whitespace-nowrap mb-1" :disabled="!selectedMemberDevices.length" @click="removeDevicesFromGroup()">Remove Devices</ff-button>
                </div>

                <ff-data-table
                    :columns="editMode ? tableColsRW : tableColsRO"
                    :show-search="true"
                    search-placeholder="Search..."
                    :no-data-message="localMemberDevices?.length ? 'No Devices found, try another search term' : 'No Devices assigned to this group'"
                    data-el="device-group-members"
                    @update:search="updateMemberDevicesListDebounced"
                    @update:sort="updateMemberDevicesSort"
                >
                    <template #rows>
                        <ff-data-table-row v-for="device in memberDevices" :key="device">
                            <ff-data-table-cell v-if="editMode">
                                <ff-checkbox v-model="device.selected" class="inline" />
                            </ff-data-table-cell>
                            <ff-data-table-cell class="w-1/3">{{ device.name }}</ff-data-table-cell>
                            <ff-data-table-cell class="w-1/3">{{ device.name }}</ff-data-table-cell>
                            <ff-data-table-cell v-if="!editMode" class="w-1/3">
                                <ActiveSnapshotCell :activeSnapshot="getDeviceActiveSnapshot(device)" :targetSnapshot="targetSnapshot" />
                            </ff-data-table-cell>
                        </ff-data-table-row>
                    </template>
                </ff-data-table>
            </div>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import ApplicationApi from '../../../api/application.js'
import FormHeading from '../../../components/FormHeading.vue'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

import { debounce } from '../../../utils/eventHandling.js'

import ActiveSnapshotCell from '../components/cells/Snapshot.vue'

export default {
    name: 'DeviceGroupDevices',
    components: {
        ActiveSnapshotCell,
        FormHeading
    },
    inheritAttrs: false,
    props: {
        application: {
            type: Object,
            required: true
        },
        applicationDevices: {
            type: Array,
            required: true
        },
        deviceGroup: {
            type: Object,
            required: true
        }
    },
    emits: ['device-group-members-updated'],
    data: function () {
        return {
            localMemberDevices: [],
            localAvailableDevices: [],
            availableDevices: [],
            memberDevices: [],
            availableSearchTerm: '',
            membersSearchTerm: '',
            hasChanges: false,
            editMode: false,
            memberDevicesSort: {
                key: null,
                direction: 'desc'
            },
            availableDevicesSort: {
                key: null,
                direction: 'desc'
            },
            tableColsRO: [
                { label: 'Name', key: 'name', sortable: true, class: 'w-1/3' },
                { label: 'Type', key: 'type', sortable: true, class: 'w-1/3' },
                { label: 'Active Snapshot', key: 'type', sortable: true, class: 'w-1/3' }
            ],
            tableColsRW: [
                { label: '', key: 'selected', sortable: true },
                { label: 'Name', key: 'name', sortable: true, class: 'w-1/3' },
                { label: 'Type', key: 'type', sortable: true, class: 'w-2/3' }
            ]
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        selectedAvailableDevices () {
            return this.localAvailableDevices.filter((device) => device.selected)
        },
        selectedMemberDevices () {
            return this.localMemberDevices.filter((device) => device.selected)
        },
        targetSnapshot () {
            return this.deviceGroup?.targetSnapshot || null
        }
    },
    watch: {
        'application.id': 'loadDevices',
        'deviceGroup.id': 'loadDevices',
        applicationDevices: 'loadDevices'
    },
    mounted () {
        this.loadDevices()
    },
    methods: {
        async loadDevices () {
            this.initLocalData()
            // set this.availableDevices to a copy of the availableDevices array but with a selected property
            this.updateAvailableDeviceList()
            this.updateMemberDevicesList()
        },
        initLocalData () {
            this.localMemberDevices = (this.deviceGroup?.devices || []).map((device) => {
                return {
                    id: device.id,
                    name: device.name,
                    type: device.type,
                    selected: false
                }
            }) || []
            const ungrouped = this.applicationDevices.filter((device) => !device.deviceGroup)
            this.localAvailableDevices = ungrouped?.map((device) => {
                return {
                    id: device.id,
                    name: device.name,
                    type: device.type,
                    selected: false
                }
            }) || []
        },
        updateAvailableDeviceListDebounced: debounce(function (availableSearchTerm) {
            this.updateAvailableDeviceList(availableSearchTerm)
        }, 350),
        updateAvailableDeviceList (availableSearchTerm) {
            if (arguments.length) {
                this.availableSearchTerm = availableSearchTerm
            }
            let tempList
            // if no search term, simply set the available devices to the filtered list
            if (!this.availableSearchTerm) {
                tempList = this.localAvailableDevices
            } else {
                // there is a search term, filter the available devices
                const term = this.availableSearchTerm.toLowerCase()
                tempList = this.localAvailableDevices.filter((device) => {
                    return device.name.toLowerCase().includes(term) || device.type?.toLowerCase().includes(term)
                })
            }
            this.availableDevices = this.sortList(tempList, this.availableDevicesSort)
            // compare this.deviceGroup.devices -to- this.memberDevices
            // if they are different, set this.hasChanges to true
            const originalMembers = this.deviceGroup?.devices || []
            if (originalMembers.length !== this.localMemberDevices.length) {
                this.hasChanges = true
                return
            }
            const localMembersIds = this.localMemberDevices.map((device) => device.id)
            const originalMembersIds = originalMembers.map((device) => device.id)
            this.hasChanges = !localMembersIds.every((id) => originalMembersIds.includes(id))
        },
        updateMemberDevicesListDebounced: debounce(function (membersSearchTerm) {
            this.updateMemberDevicesList(membersSearchTerm)
        }, 350),
        updateMemberDevicesList (membersSearchTerm) {
            if (arguments.length) {
                this.membersSearchTerm = membersSearchTerm || ''
            }
            let tempList
            // if no search term, simply set the member devices to the filtered list
            if (!this.membersSearchTerm) {
                tempList = this.localMemberDevices
            } else {
                // there is a search term, filter the member devices
                const term = this.membersSearchTerm.toLowerCase()
                tempList = this.localMemberDevices.filter((device) => {
                    return device.name.toLowerCase().includes(term) || device.type?.toLowerCase().includes(term)
                })
            }
            this.memberDevices = this.sortList(tempList, this.memberDevicesSort)
        },
        async loadMoreDevices () {
            // await this.fetchDevices()
        },
        addDevicesToGroup () {
            // get the selected devices from the available devices list
            const selectedDevices = this.localAvailableDevices.filter((device) => device.selected)
            this.localMemberDevices.push(...selectedDevices)
            this.localAvailableDevices = this.localAvailableDevices.filter((device) => !device.selected)
            this.updateAvailableDeviceList()
            this.updateMemberDevicesList()
        },
        removeDevicesFromGroup () {
            // get the selected devices from the member devices list
            const selectedDevices = this.localMemberDevices.filter((device) => device.selected)
            const selectedDeviceIds = selectedDevices.map((device) => device.id)
            this.localMemberDevices = this.localMemberDevices.filter((device) => !device.selected)
            this.localAvailableDevices.push(...selectedDevices)
            this.updateAvailableDeviceList()
            this.updateMemberDevicesList()
            // now select the devices in the available devices list that were just removed from the member devices list
            this.availableDevices.forEach((device) => {
                if (selectedDeviceIds.includes(device.id)) {
                    device.selected = true
                }
            })
        },
        updateAvailableDevicesSort (key, direction) {
            this.availableDevicesSort.key = key
            this.availableDevicesSort.direction = direction
            this.updateAvailableDeviceList()
        },
        updateMemberDevicesSort (key, direction) {
            this.memberDevicesSort.key = key
            this.memberDevicesSort.direction = direction
            this.updateMemberDevicesList()
        },
        sortList (list, sorting) {
            if (!sorting.key) {
                return list
            }

            const key = sorting.key
            const direction = sorting.direction === 'asc' ? 1 : -1

            return list.sort((a, b) => {
                const aVal = a[key] || ''
                const bVal = b[key] || ''

                if (aVal < bVal) {
                    return -1 * direction
                } else if (aVal > bVal) {
                    return 1 * direction
                } else {
                    return 0
                }
            })
        },
        cancelChanges () {
            this.initLocalData()
            this.updateAvailableDeviceList()
            this.updateMemberDevicesList()
            this.editMode = false
        },
        saveChanges () {
            const deviceIds = this.localMemberDevices.map((device) => device.id)
            const devicesRemoved = this.deviceGroup.devices.filter((device) => this.localAvailableDevices.map((d) => d.id).includes(device.id))
            const devicesAdded = this.localMemberDevices.filter((device) => !this.deviceGroup.devices.map((d) => d.id).includes(device.id))
            const removedCount = devicesRemoved.length
            const addedCount = devicesAdded.length
            const warning = []
            if (addedCount > 0) {
                warning.push('1 or more devices will be added to this group. These device(s) will be updated to deploy the active pipeline snapshot.')
                warning.push('')
            }
            if (removedCount > 0) {
                warning.push('1 or more devices will be removed from this group. These device(s) will be cleared of any active pipeline snapshot.')
                warning.push('')
            }
            if (addedCount <= 0 && removedCount <= 0) {
                return // nothing to do, shouldn't be able to get here as the save button should be disabled. but just in case...
            }
            warning.push('Do you want to continue?')

            const warningMessage = `<p>${warning.join('<br>')}</p>`
            Dialog.show({
                header: 'Update device group members',
                kind: 'danger',
                html: warningMessage,
                confirmLabel: 'Confirm',
                cancelLabel: 'No'
            }, async () => {
                ApplicationApi.updateDeviceGroupMembership(this.application.id, this.deviceGroup.id, { set: deviceIds })
                    .then(() => {
                        Alerts.emit('Device Group updated.', 'confirmation')
                        this.hasChanges = false
                        this.$emit('device-group-members-updated')
                        this.editMode = false
                    })
                    .catch((err) => {
                        Alerts.emit('Failed to update Device Group: ' + err.toString(), 'warning')
                        console.error(err)
                    })
            })
        },
        getDeviceActiveSnapshot (device) {
            if (!device?.id) {
                return null
            }
            const appDevice = this.applicationDevices?.find((d) => d.id === device.id)
            return appDevice?.activeSnapshot || null
        }
    }
}
</script>

<style scoped>
/* ensure checkboxes in the tables have appearance: auto */
/* input[type=checkbox].editable {
    -webkit-appearance: auto !important;
    -moz-appearance: auto !important;
    appearance: auto !important;
} */

table tbody .ff-checkbox, .ff-radio-btn {
    display: inline;
}
</style>
