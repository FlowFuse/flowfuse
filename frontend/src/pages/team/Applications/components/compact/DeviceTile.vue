<template>
    <div class="device-tile" data-el="device-tile">
        <div class="status">
            <StatusBadge v-if="!minimalView" :status="localDevice.status" :instanceId="device.id" instanceType="device" />
            <InstanceMinimalStatusBadge v-else :status="localDevice.status" />
        </div>
        <div class="details">
            <div class="detail-wrapper">
                <router-link :to="{ name: 'Device', params: { id: device.id } }" class="name" :title="device.name">
                    {{ device.name }}
                </router-link>
            </div>
            <div class="detail-wrapper">
                <span class="detail">
                    Last seen:
                    <DaysSince v-if="device.lastSeenAt" :date="device.lastSeenAt" />
                    <template v-else>never</template>
                </span>
            </div>
        </div>
        <div class="actions">
            <FinishSetupButton v-if="neverConnected && hasPermission('device:edit')" :device="device" :minimal-view="minimalView" />
            <ff-kebab-menu v-else-if="shouldDisplayKebabMenu">
                <ff-kebab-item
                    v-if="hasPermission('device:edit')"
                    label="Edit Details"
                    @click.stop="$emit('device-action',{action: 'edit', id: device.id})"
                />
                <ff-kebab-item
                    v-if="displayingApplication && hasPermission('device:edit')"
                    label="Remove from Application"
                    data-action="device-remove-from-application"
                    @click.stop="$emit('device-action',{action: 'removeFromApplication', id: device.id})"
                />
                <ff-kebab-item
                    v-if="hasPermission('device:edit')"
                    kind="danger"
                    label="Regenerate Configuration"
                    @click.stop="$emit('device-action',{action: 'updateCredentials', id: device.id})"
                />
                <ff-kebab-item
                    v-if="hasPermission('device:delete')"
                    kind="danger"
                    label="Delete Device"
                    @click.stop="$emit('device-action',{action: 'delete', id: device.id})"
                />
            </ff-kebab-menu>
        </div>
    </div>
</template>

<script>
import { mapState } from 'pinia'

import FinishSetupButton from '../../../../../components/FinishSetup.vue'
import StatusBadge from '../../../../../components/StatusBadge.vue'
import usePermissions from '../../../../../composables/Permissions.js'
import AuditMixin from '../../../../../mixins/Audit.js'
import deviceActionsMixin from '../../../../../mixins/DeviceActions.js'
import FfKebabMenu from '../../../../../ui-components/components/kebab-menu/KebabMenu.vue'
import { applyLiveState } from '../../../../../utils/applyLiveState.js'
import DaysSince from '../../../../application/Snapshots/components/cells/DaysSince.vue'
import InstanceMinimalStatusBadge from '../../../../instance/components/InstanceMinimalStatusBadge.vue'

import { useLiveStatusStore } from '@/stores/live-status'

export default {
    name: 'DeviceTile',
    components: {
        InstanceMinimalStatusBadge,
        StatusBadge,
        FfKebabMenu,
        DaysSince,
        FinishSetupButton
    },
    mixins: [AuditMixin, deviceActionsMixin],
    props: {
        device: {
            type: Object,
            required: true
        },
        application: { // required for deviceActionsMixin fetchData
            required: false,
            type: Object,
            default: null
        },
        minimalView: {
            type: Boolean,
            default: false
        }
    },
    emits: ['device-action'],
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
    },
    data () {
        return {
            localDevice: this.device
        }
    },
    computed: {
        ...mapState(useLiveStatusStore, { liveDeviceStatuses: 'deviceStatuses' }),
        neverConnected () {
            return !this.device.lastSeenAt
        }
    },
    watch: {
        device (newValue) {
            this.localDevice = newValue
            this.applyLiveStatus()
        },
        liveDeviceStatuses: { handler: 'applyLiveStatus', deep: true }
    },
    methods: {
        applyLiveStatus () {
            const state = this.liveDeviceStatuses[this.localDevice?.id]
            if (!state || this.localDevice?.status === state) return
            this.localDevice = applyLiveState(this.localDevice, state, { device: true })
        },
        shouldDisplayKebabMenu () {
            return this.hasPermission('device:edit') ||
            this.hasPermission('device:delete')
        }
    }
}
</script>

<style scoped lang="scss">

</style>
