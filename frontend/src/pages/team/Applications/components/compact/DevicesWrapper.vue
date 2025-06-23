<template>
    <section v-if="hasNoDevices" class="ff-no-data--boxed" data-el="application-devices-none">
        <label class="delimiter">
            <IconDeviceSolid class="ff-icon ff-icon-sm text-teal-700" />
            Remote Instances
        </label>
        <span v-if="!isSearching" class="message">
            This Application currently has no
            <router-link :to="{name: 'ApplicationDevices', params: {team_slug: team.slug, id: application.id}}" class="ff-link">attached Remote Instances</router-link>.
        </span>
        <span v-else class="message">
            No device matches your criteria.
        </span>
    </section>
    <section v-else class="ff-applications-list-instances--compact" data-el="application-devices">
        <label class="delimiter">
            <IconDeviceSolid class="ff-icon ff-icon-sm text-teal-700" />
            Remote Instances
        </label>
        <div class="items-wrapper" :class="{one: singleDevice, two: twoDevices, three: threeDevices}">
            <div
                v-for="device in visibleDevices"
                :key="device.id"
                class="item-wrapper"
            >
                <DeviceTile :device="device" :application="application" @device-action="onDeviceAction" />
            </div>
            <HasMoreTile
                v-if="hasMoreDevices"
                link-to="ApplicationDevices"
                :remaining="remainingDevices"
                :application="application"
                :search-query="searchQuery"
            />
        </div>

        <TeamDeviceCreateDialog
            v-if="team && deviceEditModalOpened"
            ref="teamDeviceCreateDialog"
            :team="team"
            :teamDeviceCount="teamDeviceCount"
            @device-created="deviceCreated"
            @device-updated="deviceUpdated"
            @closed="deviceEditModalOpened = false"
        >
            <template #description>
                <p class="my-4">
                    Further info on Remote Instances can be found
                    <a href="https://flowfuse.com/docs/user/devices/" target="_blank">here</a>.
                </p>
            </template>
        </TeamDeviceCreateDialog>

        <DeviceCredentialsDialog ref="deviceCredentialsDialog" />
    </section>
</template>

<script>
import { mapState } from 'vuex'

import IconDeviceSolid from '../../../../../components/icons/DeviceSolid.js'
import deviceActionsMixin from '../../../../../mixins/DeviceActions.js'
import DeviceCredentialsDialog from '../../../Devices/dialogs/DeviceCredentialsDialog.vue'
import TeamDeviceCreateDialog from '../../../Devices/dialogs/TeamDeviceCreateDialog.vue'

import DeviceTile from './DeviceTile.vue'
import HasMoreTile from './HasMoreTile.vue'

export default {
    name: 'DevicesWrapper',
    components: { HasMoreTile, TeamDeviceCreateDialog, DeviceCredentialsDialog, IconDeviceSolid, DeviceTile },
    mixins: [deviceActionsMixin],
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        },
        searchQuery: {
            type: String,
            required: false,
            default: ''
        }
    },
    emits: ['delete-device'],
    data () {
        return {
            devices: this.application.devices,
            deviceEditModalOpened: false
        }
    },
    computed: {
        ...mapState('account', ['team']),
        hasMoreDevices () {
            return this.application.deviceCount > this.visibleDevices.length
        },
        hasNoDevices () {
            return this.devices.length === 0
        },
        remainingDevices () {
            if (this.hasNoDevices || this.hasMoreDevices) {
                return this.application.deviceCount - this.visibleDevices.length
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
        visibleDevices () {
            return this.devices.slice(0, 3)
        },
        isSearching () {
            return this.searchQuery.length > 0
        }
    },
    watch: {
        'application.devices' (devices) {
            this.devices = devices
        }
    },
    methods: {
        onDeviceAction ({ action, id }) {
            this.deviceEditModalOpened = true
            this.$nextTick(() => this.deviceAction(action, id))
        }
    }
}
</script>

<style scoped lang="scss">

</style>
