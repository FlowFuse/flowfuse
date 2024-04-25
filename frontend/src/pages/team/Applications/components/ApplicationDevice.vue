<template>
    <DeviceModeBadge :mode="device.mode" type="icon" class="flex justify-center mr-3" />
    <div class="ff-applications-list--instance">
        <label>{{ device.name }}</label>
        <span>{{ device.editor?.url }}</span>
    </div>
    <div><StatusBadge :status="device.status" /></div>
    <div class="text-sm">
        <span v-if="device.mostRecentAuditLogCreatedAt" class="flex flex-col">
            {{ labelForAuditLogEntry(device.mostRecentAuditLogEvent) }}
            <label class="text-xs text-gray-400"><DaysSince :date="device.mostRecentAuditLogCreatedAt" /></label>
        </span>
        <span v-else class="flex flex-col">
            Device last seen
            <label class="text-xs text-gray-400">
                <DaysSince v-if="device.lastSeenAt" :date="device.lastSeenAt" />
                <template v-else>never</template>
            </label>
        </span>
    </div>

    <div class="flex justify-end text-sm">
        <EditorLink
            :instance="device"
            :url="device.editor?.url"
            :editorDisabled="false"
            :disabled="!device.editor?.enabled || !device.editor?.connected || !device.editor?.local"
            disabledReason="Device must be running, in developer mode and have the editor enabled and connected"
        />
    </div>
</template>

<script>
import StatusBadge from '../../../../components/StatusBadge.vue'
import AuditEventsService from '../../../../services/audit-events.js'
import DaysSince from '../../../application/Snapshots/components/cells/DaysSince.vue'
import DeviceModeBadge from '../../../device/components/DeviceModeBadge.vue'
import EditorLink from '../../../instance/components/EditorLink.vue'

export default {
    name: 'ApplicationDevice',
    components: {
        DeviceModeBadge,
        EditorLink,
        DaysSince,
        StatusBadge
    },
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    setup () {
        return {
            AuditEvents: AuditEventsService.get()
        }
    },
    methods: {
        labelForAuditLogEntry (eventName) {
            if (!eventName) return 'Unknown Event'
            if (this.AuditEvents[eventName]) {
                return this.AuditEvents[eventName]
            }
            let labelText = eventName
            labelText = labelText.replace(/[-._:]/g, ' ')
            labelText = labelText.replace(/\b\w/g, l => l.toUpperCase())
            labelText = labelText.replace(/([a-z])([A-Z])/g, '$1 $2')
            return labelText
        }
    }
}
</script>

<style scoped lang="scss">

</style>
