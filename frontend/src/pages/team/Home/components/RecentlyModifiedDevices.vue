<template>
    <div class="recently-modified">
        <p class="text-gray-400 text-sm">Recently Modified</p>
        <ul class="flex flex-col gap-1">
            <li v-for="device in devices" :key="device.id" class="instance-wrapper flex flex-1">
                <DeviceTile
                    :device="device"
                    :minimal-view="true"
                    :application="null"
                    @device-action="onDeviceAction"
                />
            </li>
        </ul>

        <DeviceCredentialsDialog ref="deviceCredentialsDialog" />

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
    </div>
</template>

<script>
import { mapGetters } from 'vuex'

import TeamAPI from '../../../../api/team.js'

import DeviceActions from '../../../../mixins/DeviceActions.js'
import DeviceTile from '../../Applications/components/compact/DeviceTile.vue'
import DeviceCredentialsDialog from '../../Devices/dialogs/DeviceCredentialsDialog.vue'
import TeamDeviceCreateDialog from '../../Devices/dialogs/TeamDeviceCreateDialog.vue'

export default {
    name: 'RecentlyModified',
    components: { TeamDeviceCreateDialog, DeviceCredentialsDialog, DeviceTile },
    mixins: [DeviceActions],
    data () {
        return {
            devices: [],
            deviceEditModalOpened: false
        }
    },
    computed: {
        ...mapGetters('account', ['team'])
    },
    mounted () {
        this.getTeamDevices()
    },
    methods: {
        onDeviceAction ({ action, id }) {
            this.deviceEditModalOpened = true
            this.$nextTick(() => this.deviceAction(action, id))
        },
        getTeamDevices () {
            return TeamAPI.getTeamDevices(this.team.id, null, 3, null, { })
                .then((res) => {
                    this.devices = res.devices
                })
        }
    }
}
</script>

<style lang="scss">
.recently-modified {
    & > p {
        border-bottom: 1px solid $ff-grey-100;
        margin-bottom: 10px;
        line-height: 2rem;
    }
    .device-tile {
        border: 1px solid $ff-grey-100;
        padding: 2px 10px;
        border-radius: 5px;
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;

        .details {
            flex: 1;

            .detail-wrapper {
                &:last-of-type {
                    font-size: $ff-funit-sm;
                    color: $ff-grey-400;
                }
            }
        }

        .actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
    }
}
</style>
