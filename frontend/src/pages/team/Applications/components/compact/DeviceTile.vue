<template>
    <div class="device-tile" data-el="device-tile">
        <div class="status">
            <StatusBadge :status="device.status" />
        </div>
        <div class="details">
            <div class="detail-wrapper">
                <span class="cursor-pointer name" @click="openDevice(device)">{{ device.name }}</span>
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
            <ff-kebab-menu>
                <ff-list-item
                    label="Edit Details"
                    @click.stop="$emit('device-action',{action: 'edit', id: device.id})"
                />
                <ff-list-item
                    v-if="device.ownerType === 'application' && (displayingTeam || displayingApplication)"
                    label="Remove from Application"
                    data-action="device-remove-from-application"
                    @click.stop="$emit('device-action',{action: 'removeFromApplication', id: device.id})"
                />
                <ff-list-item
                    v-else-if="device.ownerType === 'instance' && (displayingTeam || displayingInstance)"
                    label="Remove from Instance"
                    data-action="device-remove-from-instance"
                    @click.stop="$emit('device-action',{action: 'removeFromProject', id: device.id})"
                />
                <ff-list-item
                    kind="danger"
                    label="Regenerate Configuration"
                    @click.stop="$emit('device-action',{action: 'updateCredentials', id: device.id})"
                />
                <ff-list-item
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
import StatusBadge from '../../../../../components/StatusBadge.vue'
import AuditMixin from '../../../../../mixins/Audit.js'
import deviceActionsMixin from '../../../../../mixins/DeviceActions.js'
import permissionsMixin from '../../../../../mixins/Permissions.js'
import FfKebabMenu from '../../../../../ui-components/components/KebabMenu.vue'
import DaysSince from '../../../../application/Snapshots/components/cells/DaysSince.vue'

export default {
    name: 'DeviceTile',
    components: {
        StatusBadge,
        FfKebabMenu,
        DaysSince
    },
    mixins: [AuditMixin, permissionsMixin, deviceActionsMixin],
    props: {
        device: {
            type: Object,
            required: true
        },
        application: { // required for deviceActionsMixin fetchData
            required: true,
            type: Object
        }
    },
    emits: ['device-action'],
    methods: {
        openDevice (device) {
            this.$router.push({
                name: 'Device',
                params: {
                    id: device.id
                }
            })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
