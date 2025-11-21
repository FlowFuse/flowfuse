<template>
    <form class="space-y-6" data-el="device-settings-general">
        <FormHeading>
            <template #default>
                General
            </template>
            <template #tools>
                <div v-if="hasPermission('device:edit', { application: device.application })" class="mb-2">
                    <ff-button
                        v-if="!editing.deviceName" size="small" kind="primary" @click="editDevice"
                        data-action="edit-device"
                    >
                        Edit Device
                    </ff-button>
                    <ff-button v-else kind="primary" size="small" @click="updateDevice">Save Changes</ff-button>
                </div>
            </template>
        </FormHeading>
        <FormRow v-model="input.deviceId" type="uneditable" id="deviceId" inputClass="font-mono">
            Remote Instance ID
        </FormRow>

        <FormRow v-model="input.deviceName" :type="editing.deviceName ? 'text' : 'uneditable'" ref="deviceName">
            Name
        </FormRow>
    </form>

    <!-- Node-RED Version -->
    <form v-if="canChangeNodeRedVersion" class="my-6 space-y-6" @submit.prevent.stop data-el="change-version">
        <FormHeading class="pb-2">
            Change Node-RED Version
            <span class="italic text-md px-2 text-gray-400">(Current: {{ displayNrVersion }})</span>
        </FormHeading>

        <div ref="updateStack" class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <p class="max-w-sm">
                    Changing the Remote Instance Node-RED Version requires the remote instance to be restarted.
                    The flows will not be running while this happens.
                </p>
            </div>
            <div class="min-w-fit shrink-0 flex-col gap-5">
                <ff-button
                    data-action="change-stack"
                    kind="secondary"
                    @click="showChangeNrDialog()"
                >
                    Change Node-RED Version
                </ff-button>
            </div>
        </div>
    </form>

    <form class="mt-12 space-y-6" data-el="assignment">
        <FormHeading>
            <template #default>
                Assignment
            </template>
            <template #tools>
                <div v-if="hasPermission('device:edit', { application: device.application })" class="mb-2">
                    <ff-button v-if="!notAssigned" size="small" kind="primary" data-action="unassign-device" @click="unassign">Unassign</ff-button>
                </div>
                <div v-if="hasPermission('device:edit', { application: device.application })" class="mb-2">
                    <ff-button v-if="notAssigned" size="small" kind="primary" data-action="assign-device" @click="assign">Assign</ff-button>
                </div>
            </template>
        </FormHeading>
        <template v-if="notAssigned">
            <p>To use Devices they must be assigned to an Application or Instance.</p>
            <ul class="list-disc ml-6 space-y-2 max-w-xl">
                <li><label class="font-medium mr-2">Application:</label>Flows on this Device can only be edited and deployed via the 'Remote Editor' feature, available in 'Developer Mode'. You can create Snapshots for version control of the flows on your Device</li>
                <li><label class="font-medium mr-2">Instance:</label>Auto-deploy flows from the bound Instance directly to this Device. You can still remotely edit and create Snapshots on the Device when the Device is in 'Developer Mode'.</li>
            </ul>
        </template>
        <template v-else-if="hasApplication">
            <section data-el="application-section" class="flex flex-col gap-4">
                <div>
                    <label class="font-medium mr-2">Application:</label>
                    <router-link :to="{name: 'ApplicationDevices', params: {team_slug: team.slug, id: device.application.id}}" class="ff-link">{{ device.application.name }}</router-link>
                </div>
                <div class="flex flex-col gap-2">
                    <h3>Features:</h3>
                    <ul class="list-disc ml-6 space-y-2 max-w-xl">
                        <li><label class="font-medium mr-2">Editing Remotely:</label>You can read our documentation <a class="ff-link" href="https://flowfuse.com/docs/device-agent/deploy/#editing-the-node-red-flows-on-a-device-that-is-assigned-to-an-application">here</a> on how to remotely edit the flows on your Device. Make sure you create a Snapshot of your changes when in Developer Mode if you wish to keep them, any changes made inside "Developer Mode" will be undone when leaving "Developer Mode".</li>
                    </ul>
                </div>
            </section>
            <section
                v-if="hasPermission('application:device-group:read', { application: device.application })"
                ref="device-group-section"
            >
                <div class="max-w-2xl">
                    <label class="font-medium mr-2">Group:</label>
                    <div v-if="device.deviceGroup" class="flex gap-5 items-center justify-between">
                        <router-link
                            :to="{ name: 'ApplicationDeviceGroupIndex',
                                   params: {
                                       deviceGroupId: device.deviceGroup.id,
                                       applicationId: device.application.id,
                                       team_slug: team.slug
                                   }}" class="ff-link"
                        >
                            {{ device.deviceGroup.name }}
                        </router-link>
                        <div class="flex gap-2">
                            <ff-button
                                v-if="hasPermission('application:device-group:update', { application: device.application })"
                                ref="groupAssignmentButton"
                                kind="secondary-danger" title="Remove Device from Group" @click="onGroupUnassign"
                            >
                                Remove from the group
                            </ff-button>
                            <ff-button
                                v-if="hasPermission('application:device-group:update', { application: device.application })"
                                ref="groupAssignmentButton"
                                kind="secondary" title="Remove Device from Group" @click="onGroupAssign"
                            >
                                Reassign
                            </ff-button>
                        </div>
                    </div>
                    <div v-else class="flex gap-5 items-center justify-between">
                        <span class="italic">None</span>
                        <ff-button
                            v-if="hasPermission('application:device-group:update', { application: device.application })"
                            ref="groupAssignmentButton"
                            kind="secondary" title="Add Device to a Group" @click="onGroupAssign"
                        >
                            Add the remote instance to a group
                        </ff-button>
                    </div>
                </div>
            </section>
        </template>
        <template v-else-if="hasInstance">
            <div>
                <label class="font-medium mr-2">Instance:</label>
                <router-link :to="{name: 'Instance', params: {id: device.instance.id}}" class="ff-link">{{ device.instance.name }}</router-link>
            </div>
            <h3>Features:</h3>
            <ul class="list-disc ml-6 space-y-2 max-w-xl">
                <li><label class="font-medium mr-2">Deploying Remotely:</label>You can read our documentation <a class="ff-link" target="_blank" rel="noreferrer" href="https://flowfuse.com/docs/device-agent/deploy/#deploying-a-node-red-instance-to-the-device">here</a> on how to remotely deploy flows to your Device.</li>
                <li><label class="font-medium mr-2">Editing Remotely:</label>You can read our documentation <a class="ff-link" target="_blank" rel="noreferrer" href="https://flowfuse.com/docs/device-agent/deploy/#editing-the-node-red-flows-on-a-device-that-is-assigned-to-an-instance">here</a> on how to remotely edit the flows on your Device. Make sure you create a Snapshot of your changes when in Developer Mode if you wish to keep them, any changes made inside "Developer Mode" will be undone when leaving "Developer Mode".</li>
            </ul>
        </template>
    </form>

    <!-- Node-RED Version Form -->
    <ff-dialog
        v-if="isChangeNrVersionModalOpen"
        ref="changeNrVersionDialog"
        header="Change Node-RED Version"
        data-el="change-nr-version-dialog"
        @confirm="changeNrVersion"
        @cancel="closeChangeNrDialog"
        :disablePrimary="isNrVersionModalButtonDisabled"
    >
        <template #default>
            <FormRow containerClass="max-w-md" wrapperClass="max-w-md">
                Node-RED Version
                <template #description>
                    Use this field to override the Node-RED version specified in the Remote Instance's active snapshot. Defaults to 'latest' if the snapshot does not specify a version.
                </template>
                <template #input>
                    <div class="flex flex-wrap">
                        <ff-combobox
                            v-model="input.nodeRedVersion"
                            :options="nodeRedVersionOptions"
                            :hasCustomValue="true"
                            custom-value-pre-label="Use"
                            placeholder="Select or type in a new Node-RED version"
                            data-form="nodered-select"
                            class="w-full"
                        />
                        <span
                            v-if="!hasValidCustomNodeRedVersion.status"
                            class="ff-error-inline text-red-500"
                            data-el="error-nr-version"
                        >
                            {{ hasValidCustomNodeRedVersion.message }}
                        </span>
                    </div>
                </template>
            </FormRow>
        </template>
    </ff-dialog>
</template>

<script>
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import ApplicationApi from '../../../api/application.js'

import deviceApi from '../../../api/devices.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import AddDeviceToGroupDialog from '../../../components/dialogs/_addDeviceToGroupDialog.vue'
import usePermissions from '../../../composables/Permissions.js'
import { scrollToAndJiggleHighlight } from '../../../composables/Ux.js'

import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

const semVer = require('semver')

export default {
    name: 'DeviceSettings',
    props: ['device'],
    emits: ['device-updated', 'assign-device'],
    components: {
        FormRow,
        FormHeading
    },
    data () {
        return {
            editing: {
                deviceName: false
            },
            isChangeNrVersionModalOpen: false,
            input: {
                deviceId: '',
                deviceName: '',
                nodeRedVersion: ''
            },
            original: {
                deviceName: '',
                nodeRedVersion: ''
            },
            availableNrVersions: [
                '3.1.0',
                '3.1.1',
                '3.1.2',
                '3.1.3',
                '3.1.4',
                '3.1.5',
                '3.1.6',
                '3.1.7',
                '3.1.8',
                '3.1.9',
                '3.1.10',
                '3.1.11',
                '3.1.12',
                '3.1.13',
                '3.1.14',
                '3.1.15',
                '4.0.0',
                '4.0.1',
                '4.0.2',
                '4.0.3',
                '4.0.4',
                '4.0.5',
                '4.0.6',
                '4.0.7',
                '4.0.8',
                '4.0.9',
                '4.1.0'

            ]
        }
    },
    setup () {
        const { hasPermission } = usePermissions()

        return {
            hasPermission,
            semVer
        }
    },
    watch: {
        device: {
            handler () {
                this.fetchData()
            },
            deep: true
        }
    },
    computed: {
        ...mapState('account', ['team']),
        canChangeNodeRedVersion () {
            return this.deviceOwnerType === 'application' && this.hasPermission('device:edit', { application: this.device.application })
        },
        deviceOwnerType () {
            return this.device?.ownerType || ''
        },
        displayNrVersion () {
            return this.original.nodeRedVersion.length
                ? this.original.nodeRedVersion
                : 'Inherited from Snapshot'
        },
        hasApplication () {
            return this.device?.ownerType === 'application' && this.device.application
        },
        hasInstance () {
            return this.device?.ownerType === 'instance' && this.device.instance
        },
        notAssigned () {
            return !this.hasApplication && !this.hasInstance
        },
        isNrVersionModalButtonDisabled () {
            return this.original.nodeRedVersion === this.input.nodeRedVersion || !this.hasValidCustomNodeRedVersion.status
        },
        nodeRedVersionOptions () {
            return [
                {
                    label: 'Use Next Snapshot Node-RED Version',
                    value: '<<use-snapshot-version>>'
                },
                {
                    label: 'Latest',
                    value: 'latest'
                },
                ...this.availableNrVersions.map(value => ({
                    label: value,
                    value
                })).sort((a, b) => {
                    return -1 * semVer.compare(a.value, b.value)
                })
            ]
        },
        hasValidCustomNodeRedVersion () {
            const nodeRedVersion = (this.input.nodeRedVersion || '')
            const validVersions = ['', 'latest', 'next', '<<use-snapshot-version>>', this.original.nodeRedVersion]

            if (validVersions.includes(nodeRedVersion) || this.semVer.valid(nodeRedVersion)) {
                return {
                    status: true,
                    message: ''
                }
            } else {
                return {
                    status: false,
                    message: 'Invalid version'
                }
            }
        }
    },
    mounted () {
        this.fetchData()
        this.highlightElements()
    },
    methods: {
        closeChangeNrDialog () {
            this.$refs.changeNrVersionDialog.close()
            this.$nextTick(() => {
                this.isChangeNrVersionModalOpen = false
                this.input.nodeRedVersion = this.original.nodeRedVersion
            })
        },
        editDevice () {
            this.original.deviceName = this.input.deviceName
            this.editing.deviceName = true
        },
        async updateDevice () {
            await deviceApi.updateDevice(this.device.id, { name: this.input.deviceName })
            this.editing.deviceName = false
            this.$emit('device-updated')
        },
        cancelEditName () {
            this.editing.deviceName = false
            this.input.deviceName = this.original.deviceName
        },
        async fetchData () {
            if (this.device) {
                this.input.deviceId = this.device.id
                this.input.deviceName = this.device.name

                const settings = await deviceApi.getSettings(this.device.id)
                if (settings.editor?.nodeRedVersion) {
                    this.input.nodeRedVersion = settings.editor.nodeRedVersion
                    this.original.nodeRedVersion = settings.editor.nodeRedVersion
                }
            }
        },
        unassign () {
            const device = this.device
            if (this.hasInstance) {
                Dialog.show({
                    header: 'Remove Device from Instance',
                    kind: 'danger',
                    text: 'Are you sure you want to remove this device from the instance? This will stop the flows running on the device.',
                    confirmLabel: 'Remove'
                }, async () => {
                    await deviceApi.updateDevice(device.id, { instance: null })
                    this.$emit('device-updated')
                    Alerts.emit('Successfully removed the device from the instance.', 'confirmation')
                })
            } else if (this.hasApplication) {
                Dialog.show({
                    header: 'Remove Device from Application',
                    kind: 'danger',
                    text: 'Are you sure you want to remove this device from the application? This will stop the flows running on the device.',
                    confirmLabel: 'Remove'
                }, async () => {
                    await deviceApi.updateDevice(device.id, { application: null })
                    this.$emit('device-updated')
                    Alerts.emit('Successfully removed the device from the application.', 'confirmation')
                })
            }
        },
        assign () {
            this.$emit('assign-device')
        },
        showChangeNrDialog () {
            this.isChangeNrVersionModalOpen = true
            this.$nextTick(() => {
                this.$refs.changeNrVersionDialog.show()
            })
        },
        changeNrVersion () {
            const settings = {}
            let nodeRedVersion = (this.input.nodeRedVersion || '').trim() || undefined
            if (nodeRedVersion === '<<use-snapshot-version>>') {
                nodeRedVersion = ''
            }
            settings.editor = {
                nodeRedVersion
            }
            deviceApi.updateSettings(this.device.id, settings)

            this.$emit('device-updated')
            Alerts.emit('Device settings successfully updated.', 'confirmation', 6000)

            this.input.nodeRedVersion = nodeRedVersion
            this.original.nodeRedVersion = nodeRedVersion
        },
        onGroupUnassign () {
            Dialog.show({
                header: `Remove ${this.device.name} from ${this.device.deviceGroup.name}?`,
                kind: 'danger',
                html: `
                    <p>This Remote Instance will be cleared of any active pipeline snapshot.</p>
                    <p>Are you sure you want to continue?</p>
                `,
                confirmLabel: 'Confirm'
            }, async () => ApplicationApi.updateDeviceGroupMembership(
                this.device.application.id,
                this.device.deviceGroup.id,
                { remove: this.device.id })
                .then(() => this.$emit('device-updated'))
                .catch(e => e)
            )
        },
        onGroupAssign () {
            let selectedDeviceGroup
            Dialog.show({
                header: `Add ${this.device.name} to a group`,
                kind: 'primary',
                is: {
                    component: markRaw(AddDeviceToGroupDialog),
                    payload: {
                        device: this.device
                    },
                    on: {
                        selected (selection) {
                            selectedDeviceGroup = selection
                        }
                    }
                },
                confirmLabel: 'Confirm'
            }, async () => {
                const promise = this.device.deviceGroup
                    ? ApplicationApi.updateDeviceGroupMembership(
                        this.device.application.id,
                        this.device.deviceGroup.id,
                        {
                            remove: this.device.id
                        })
                    : new Promise(resolve => resolve())

                return promise
                    .then(() => ApplicationApi.updateDeviceGroupMembership(
                        this.device.application.id,
                        selectedDeviceGroup,
                        {
                            add: this.device.id
                        }))
                    .then(() => Alerts.emit('Successfully assigned device.', 'confirmation'))
                    .catch(e => {
                        Alerts.emit('Something went wrong.', 'error')
                        console.error(e)
                    })
                    .finally(() => this.$emit('device-updated'))
            })
        },
        highlightElements () {
            if (
                this.$route.query.highlight &&
                Object.keys(this.$refs).includes(this.$route.query.highlight) &&
                this.$route.query.highlight === 'device-group-section'
            ) {
                scrollToAndJiggleHighlight(
                    this.$refs['device-group-section'],
                    this.$refs.groupAssignmentButton.$el,
                    { count: 2 },
                    {
                        inline: 'nearest',
                        block: 'nearest'
                    }
                )
            }
            this.$router.replace({ query: null })
        }
    }
}
</script>
