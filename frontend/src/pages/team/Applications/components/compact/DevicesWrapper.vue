<template>
    <section v-if="hasNoDevices" class="ff-no-data--boxed">
        <label class="delimiter">
            <IconDeviceSolid class="ff-icon ff-icon-sm text-teal-700" />
            Devices
        </label>
        <span class="message">
            This Application currently has no
            <router-link :to="`/application/${application.id}/devices`" class="ff-link">attached devices</router-link>
            .
        </span>
    </section>
    <section v-else class="ff-applications-list-instances--compact" data-el="application-devices">
        <label class="delimiter">
            <IconDeviceSolid class="ff-icon ff-icon-sm text-teal-700" />
            Devices
        </label>
        <div class="items-wrapper" :class="{one: singleDevice, two: twoDevices, three: threeDevices}">
            <div
                v-for="device in Array.from(application.devices.values())"
                :key="device.id"
                class="item-wrapper"
                @click.stop="openDevice(device)"
            >
                <DeviceTile :device="device" :application="application" @device-action="onDeviceAction" />
            </div>
            <div v-if="hasMoreDevices" class="has-more item-wrapper">
                <router-link :to="{name: 'ApplicationDevices', params: {id: application.id}}">
                    <span>
                        {{ remainingDevices }}
                        More...
                    </span>
                    <ChevronRightIcon class="ff-icon" />
                </router-link>
            </div>
        </div>

        <TeamDeviceCreateDialog
            v-if="team"
            ref="teamDeviceCreateDialog"
            :team="team"
            :teamDeviceCount="teamDeviceCount"
            @device-created="deviceCreated"
            @device-updated="deviceUpdated"
        >
            <template #description>
                <p>
                    Here, you can add a new device to your
                    <template v-if="displayingTeam">team.</template>
                    <template v-if="displayingApplication">application.</template>
                    <template v-else-if="displayingInstance">application instance.</template>
                    This will generate a <b>device.yml</b> file that should be
                    placed on the target device.
                </p>
                <p class="my-4">
                    If you want your device to be automatically registered to an instance, in order to remotely deploy flows, you can use provisioning tokens
                    in your <router-link :to="{'name': 'TeamSettingsDevices', 'params': {team_slug: team.slug}}">Team Settings</router-link>
                </p>
                <p class="my-4">
                    Further info on Devices can be found
                    <a href="https://flowfuse.com/docs/user/devices/" target="_blank">here</a>.
                </p>
            </template>
        </TeamDeviceCreateDialog>

        <DeviceCredentialsDialog ref="deviceCredentialsDialog" />
    </section>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/solid'

import IconDeviceSolid from '../../../../../components/icons/DeviceSolid.js'
import deviceActionsMixin from '../../../../../mixins/DeviceActions.js'
import DeviceCredentialsDialog from '../../../Devices/dialogs/DeviceCredentialsDialog.vue'
import TeamDeviceCreateDialog from '../../../Devices/dialogs/TeamDeviceCreateDialog.vue'

import DeviceTile from './DeviceTile.vue'

export default {
    name: 'DevicesWrapper',
    components: { TeamDeviceCreateDialog, DeviceCredentialsDialog, ChevronRightIcon, IconDeviceSolid, DeviceTile },
    mixins: [deviceActionsMixin],
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        }
    },
    emits: ['delete-device'],
    computed: {
        hasMoreDevices () {
            return this.application.deviceCount > this.application.devices.size
        },
        hasNoDevices () {
            return this.application.devices.size === 0
        },
        remainingDevices () {
            if (this.hasNoDevices || this.hasMoreDevices) {
                return this.application.deviceCount - this.application.devices.size
            } else return 0
        },
        singleDevice () {
            return this.application.deviceCount === 1
        },
        twoDevices () {
            return this.application.deviceCount === 2
        },
        threeDevices () {
            return this.application.deviceCount === 3
        },
        devices () {
            return this.application.devices
        }
    },
    mounted () {
        this.fetchAllDeviceStatuses()
    },
    methods: {
        openDevice (device) {
            this.$router.push({
                name: 'Device',
                params: {
                    id: device.id
                }
            })
        },
        onDeviceAction ({ action, id }) {
            this.deviceAction(action, id)
        }
    }
}
</script>

<style scoped lang="scss">

</style>
