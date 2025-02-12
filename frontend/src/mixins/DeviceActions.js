import { mapState } from 'vuex'

import ApplicationApi from '../api/application.js'

import deviceApi from '../api/devices.js'
import instanceApi from '../api/instances.js'
import teamApi from '../api/team.js'
import Alerts from '../services/alerts.js'
import Dialog from '../services/dialog.js'

export default {
    computed: {
        ...mapState('account', ['team']),
        displayingTeam () {
            return this.team !== null && !this.displayingInstance && !this.displayingApplication
        },
        displayingApplication () {
            const hasPropOrDataAttr = Object.hasOwnProperty.call(this.$props, 'application') ||
                Object.hasOwnProperty.call(this.$data, 'application')

            return hasPropOrDataAttr && this.application !== null && !this.displayingInstance
        },
        displayingInstance () {
            const hasPropOrDataAttr = Object.hasOwnProperty.call(this.$props, 'instance') ||
                Object.hasOwnProperty.call(this.$data, 'instance')
            return hasPropOrDataAttr && this.instance !== null
        },
        teamDeviceCount () {
            return this.team.deviceCount + this.deviceCountDeltaSincePageLoad
        }
    },
    data () {
        return {
            allDeviceStatuses: new Map(), // every device known
            deviceCountDeltaSincePageLoad: 0,
            // Server side
            filter: null,
            nextCursor: null
        }
    },
    emits: ['delete-device'],
    methods: {
        deviceAction (action, deviceId, d) {
            let device = d
            if (!device) {
                if (!device && this.devices instanceof Map) {
                    // working with DevicesBrowser component
                    device = this.devices.get(deviceId)
                } else {
                    // working with compact application views
                    device = this.devices.find(e => e.id === deviceId)
                }
            }
            if (action === 'edit') {
                this.showEditDeviceDialog(device)
            } else if (action === 'delete') {
                Dialog.show({
                    header: 'Delete Device',
                    kind: 'danger',
                    text: 'Are you sure you want to delete this device? Once deleted, there is no going back.',
                    confirmLabel: 'Delete'
                }, async () => {
                    try {
                        await deviceApi.deleteDevice(device.id)
                        Alerts.emit('Successfully deleted the device', 'confirmation')
                        this.deleteLocalCopyOfDevice(device)
                        this.$emit('delete-device')
                    } catch (err) {
                        Alerts.emit('Failed to delete device: ' + err.toString(), 'warning', 7500)
                    }
                })
            } else if (action === 'updateCredentials') {
                this.$refs.deviceCredentialsDialog.show(device)
            } else if (action === 'removeFromProject') {
                Dialog.show({
                    header: 'Remove Device from Instance',
                    kind: 'danger',
                    text: 'Are you sure you want to remove this device from the instance? This will stop the flows running on the device.',
                    confirmLabel: 'Remove'
                }, async () => {
                    await deviceApi.updateDevice(device.id, { instance: null })

                    if (this.displayingInstance) {
                        this.deleteLocalCopyOfDevice(device)
                    } else {
                        this.updateLocalCopyOfDevice({ ...device, instance: undefined, application: undefined, ownerType: '' })
                    }

                    Alerts.emit('Successfully removed the device from the instance.', 'confirmation')
                })
            } else if (action === 'removeFromApplication') {
                Dialog.show({
                    header: 'Remove Device from Application',
                    kind: 'danger',
                    text: 'Are you sure you want to remove this device from the application? This will stop the flows running on the device.',
                    confirmLabel: 'Remove'
                }, async () => {
                    await deviceApi.updateDevice(device.id, { application: null })

                    if (this.displayingApplication) {
                        this.deleteLocalCopyOfDevice(device)
                    } else {
                        this.updateLocalCopyOfDevice({ ...device, instance: undefined, application: undefined, ownerType: '' })
                    }

                    Alerts.emit('Successfully removed the device from the application.', 'confirmation')
                })
            } else if (action === 'assignToProject') {
                this.$refs.deviceAssignInstanceDialog.show(device)
            } else if (action === 'assignToApplication') {
                this.$refs.deviceAssignApplicationDialog.show(device, false)
            }
        },

        showEditDeviceDialog (device) {
            this.$refs.teamDeviceCreateDialog.show(device)
        },

        updateLocalCopyOfDevice (device) {
            if (this.displayingInstance) {
                // determine if the device is still owned by the instance, if not, remove it instead
                if (!device.instance || device.instance.id !== this.instance.id) {
                    this.deleteLocalCopyOfDevice(device)
                    return
                }
            } else if (this.displayingApplication) {
                // determine if the device is still owned by the application, if not, remove it instead
                if (device.instance || !device.application || device.application.id !== this.application.id) {
                    this.deleteLocalCopyOfDevice(device)
                    return
                }
            }

            if (!this.allDeviceStatuses.get(device.id)) {
                this.deviceCountDeltaSincePageLoad++
            }

            // Only grab status props to avoid polluting allDeviceStatuses with extra info
            const currentDeviceStatus = this.allDeviceStatuses.get(device.id)
            if (currentDeviceStatus) {
                const updatedDeviceStatusPropsOnly = Object.keys(currentDeviceStatus).reduce((acc, key) => {
                    acc[key] = device[key]
                    return acc
                }, { ...currentDeviceStatus })
                this.allDeviceStatuses.set(device.id, updatedDeviceStatusPropsOnly)
            } else {
                this.allDeviceStatuses.set(device.id, device)
            }
            if (this.devices instanceof Map) {
                // working with DevicesBrowser component
                const localDevice = this.devices.get(device.id) || {} // if not found, we are adding a new device
                Object.assign(localDevice, device, currentDeviceStatus)
                this.devices.set(device.id, localDevice)
            } else {
                // working with compact application views
                const localDevice = this.devices.find(e => e.id === device.id)
                if (!localDevice) {
                    // not found - i.e. adding new device
                    // in theory, this should never happen as devices cannot (currently) be added from application view
                    // but we need to _do something_ in the case of a device not found in the list
                    this.devices.push(Object.assign({}, device, currentDeviceStatus))
                } else {
                    // found - i.e. update existing device
                    Object.assign(localDevice, device, currentDeviceStatus)
                }
            }
        },

        deviceCreated (device) {
            if (device) {
                setTimeout(() => {
                    this.$refs.deviceCredentialsDialog.show(device)
                }, 500)

                this.updateLocalCopyOfDevice(device)
            }
        },

        deviceUpdated (device) {
            this.updateLocalCopyOfDevice(device)
        },

        deleteLocalCopyOfDevice (device) {
            if (this.allDeviceStatuses.get(device.id)) {
                this.deviceCountDeltaSincePageLoad--
            }
            this.allDeviceStatuses.delete(device.id)
            if (this.devices instanceof Map) {
                // working with DevicesBrowser component
                this.devices.delete(device.id)
            } else {
                // working with compact application views
                this.devices = this.devices.filter(e => e.id !== device.id)
            }

            if ( // updates the application device count if present
                Object.hasOwnProperty.call(this, 'application') &&
                this.application !== null &&
                Object.hasOwnProperty.call(this.application, 'deviceCount') &&
                !isNaN(this.application.deviceCount) &&
                this.application.deviceCount >= 1
            ) {
                this.application.deviceCount--
            }
        },

        // Actual fetching methods
        async fetchData (nextCursor = null, limit = null, extraParams = { statusOnly: false }) {
            const query = null // handled via extraParams
            if (this.displayingInstance) {
                return await instanceApi.getInstanceDevices(this.instance.id, nextCursor, limit, query, extraParams)
            }

            if (this.displayingApplication) {
                return await ApplicationApi.getApplicationDevices(this.application.id, nextCursor, limit, query, extraParams)
            }

            if (this.displayingTeam) {
                return await teamApi.getTeamDevices(this.team.id, nextCursor, limit, query, extraParams)
            }

            console.warn('Trying to fetch data without a loaded model.')

            return null
        },

        async fetchAllDeviceStatuses (reset = false) {
            const data = await this.fetchData(null, null, { statusOnly: true })

            if (reset) {
                this.allDeviceStatuses = new Map()
            }

            if (data.meta?.next_cursor || data.devices.length < data.count) {
                console.warn('Device Status API should not be paginating')
            }

            data.devices.forEach(device => {
                this.allDeviceStatuses.set(device.id, device)
            })

            this.loadingStatuses = false
        }
    }
}
