<template>
    <div class="device-tile" data-el="device-tile">
        <div class="status">
            <StatusBadge :status="device.status" :instanceId="device.id" instanceType="device" />
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
            <FinishSetupButton v-if="neverConnected && hasPermission('device:edit')" :device="device" />
            <ff-kebab-menu v-else-if="shouldDisplayKebabMenu">
                <ff-list-item
                    v-if="hasPermission('device:edit')"
                    label="Edit Details"
                    @click.stop="$emit('device-action',{action: 'edit', id: device.id})"
                />
                <ff-list-item
                    v-if="(displayingTeam || displayingApplication) && hasPermission('device:edit')"
                    label="Remove from Application"
                    data-action="device-remove-from-application"
                    @click.stop="$emit('device-action',{action: 'removeFromApplication', id: device.id})"
                />
                <ff-list-item
                    v-if="hasPermission('device:edit')"
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
import FinishSetupButton from '../../../../../components/FinishSetup.vue'
import StatusBadge from '../../../../../components/StatusBadge.vue'
import usePermissions from '../../../../../composables/Permissions.js'
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
        DaysSince,
        FinishSetupButton
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
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
    },
    computed: {
        neverConnected () {
            return !this.device.lastSeenAt
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
