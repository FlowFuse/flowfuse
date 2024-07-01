<template>
    <div class="device-tile">
        <div class="status">
            <StatusBadge :status="device.status" />
        </div>
        <div class="details">
            <span>{{ device.name }}</span>
            <span>
                Last seen:
                <DaysSince v-if="device.lastSeenAt" :date="device.lastSeenAt" />
                <template v-else>never</template>
            </span>
        </div>
        <div class="actions">
            <EditorLink
                :instance="device"
                :editorDisabled="false"
                :disabled="isEditorDisabled"
                disabledReason="Device must be running, in developer mode and have the editor enabled and connected"
            >
                <ff-button
                    v-ff-tooltip:left="isEditorDisabled ? 'Device must be running, in developer mode and have the editor enabled and connected' : undefined"
                    kind="secondary"
                    data-action="open-editor"
                    class="whitespace-nowrap"
                    :disabled="isEditorDisabled"
                >
                    <ProjectIcon class="ff-btn--icon ff-icon" />
                </ff-button>
            </EditorLink>
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
import ProjectIcon from '../../../../../components/icons/Projects.js'
import AuditMixin from '../../../../../mixins/Audit.js'
import deviceActionsMixin from '../../../../../mixins/DeviceActions.js'
import permissionsMixin from '../../../../../mixins/Permissions.js'
import FfKebabMenu from '../../../../../ui-components/components/KebabMenu.vue'
import DaysSince from '../../../../application/Snapshots/components/cells/DaysSince.vue'
import EditorLink from '../../../../instance/components/EditorLink.vue'

export default {
    name: 'DeviceTile',
    components: {
        ProjectIcon,
        EditorLink,
        StatusBadge,
        FfKebabMenu,
        DaysSince
    },
    mixins: [AuditMixin, permissionsMixin, deviceActionsMixin],
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    emits: ['device-action'],
    computed: {
        isEditorDisabled () {
            return !this.device.editor?.enabled || !this.device.editor?.connected || !this.device.editor?.local
        }
    }
}
</script>

<style scoped lang="scss">

</style>
