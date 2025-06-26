<template>
    <div class="recently-modified">
        <p class="text-gray-400 text-sm">Recently Modified</p>
        <ul v-if="devices.length" class="flex flex-col gap-1">
            <li v-for="device in devices" :key="device.id" class="instance-wrapper flex flex-1">
                <DeviceTile
                    :device="device"
                    :minimal-view="true"
                    :application="null"
                    @device-action="onDeviceAction"
                />
            </li>
            <li v-if="hasMore" class="fde-wrapper flex flex-1">
                <team-link :to="{name: 'TeamDevices'}" class="instance-tile has-more hover:text-indigo-700">
                    <span>{{ instancesLeft }} More</span>
                    <span>
                        <ChevronRightIcon class="ff-icon ff-icon-sm" />
                    </span>
                </team-link>
            </li>
        </ul>

        <div v-else class="no-devices flex flex-col flex-1 justify-center text-gray-500 italic">
            <p class="text-center self-center">
                No remote Node-RED Instances found.
                <span class="text-indigo-500 cursor-pointer" @click.stop.prevent="openCreateDialog">Add a Remote Instance</span>
                to get started.
            </p>
        </div>

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
import { ChevronRightIcon } from '@heroicons/vue/outline'
import { mapGetters } from 'vuex'

import teamAPI from '../../../../api/team.js'

import TeamLink from '../../../../components/router-links/TeamLink.vue'

import DeviceActions from '../../../../mixins/DeviceActions.js'
import DeviceTile from '../../Applications/components/compact/DeviceTile.vue'
import DeviceCredentialsDialog from '../../Devices/dialogs/DeviceCredentialsDialog.vue'
import TeamDeviceCreateDialog from '../../Devices/dialogs/TeamDeviceCreateDialog.vue'

export default {
    name: 'RecentlyModified',
    components: {
        ChevronRightIcon,
        TeamLink,
        TeamDeviceCreateDialog,
        DeviceCredentialsDialog,
        DeviceTile
    },
    mixins: [DeviceActions],
    props: {
        totalDevices: {
            type: Number,
            required: true
        }
    },
    data () {
        return {
            devices: [],
            deviceEditModalOpened: false,
            hasMore: false
        }
    },
    computed: {
        ...mapGetters('account', ['team']),
        instancesLeft () {
            return this.totalDevices - this.devices.length
        }
    },
    mounted () {
        this.getTeamDevices()
            .catch(e => e)
    },
    methods: {
        onDeviceAction ({ action, id }) {
            this.deviceEditModalOpened = true
            this.$nextTick(() => this.deviceAction(action, id))
        },
        getTeamDevices () {
            let limit

            if (this.totalDevices <= 4) {
                limit = 3
                this.hasMore = this.totalDevices === 4
            } else {
                limit = 3
                this.hasMore = true
            }
            return teamAPI.getTeamDevices(this.team.id, null, limit, null, { sort: 'state-priority' })
                .then((res) => {
                    this.devices = res.devices
                })
        },
        openCreateDialog () {
            this.deviceEditModalOpened = true
            this.$nextTick(() => this.$refs.teamDeviceCreateDialog.show(null, this.instance, this.application))
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

            .name {
                &:hover {
                    color: $ff-indigo-700;
                }
            }
        }

        .actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
    }

    .no-devices {
        min-height: 130px;
    }
}
</style>
