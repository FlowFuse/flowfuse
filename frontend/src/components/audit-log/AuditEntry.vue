<template>
    <div class="ff-audit-entry py-3 border-b text-base">
        <!-- Time -->
        <div class="ff-audit-entry-time w-20 text-gray-500">{{ entry.time }}</div>
        <!-- Icon -->
        <div class="ff-audit-entry-icon w-12 flex justify-center">
            <AuditEntryIcon v-if="entry.body?.error" event="error"></AuditEntryIcon>
            <AuditEntryIcon v-else :event="entry.event"></AuditEntryIcon>
        </div>
        <!-- Event -->
        <div class="ff-audit-entry-description">
            <AuditEntryVerbose :entry="entry"></AuditEntryVerbose>
        </div>
        <!-- User/Trigger -->
        <div v-if="entry.trigger.name !== 'unknown'" class="ff-audit-entry-trigger">
            {{ entry.trigger.name }}
        </div>
    </div>
</template>

<script>

import AuditEntryIcon from './AuditEntryIcon.vue'
import AuditEntryVerbose from './AuditEntryVerbose.vue'

export default {
    name: 'AuditLogEntry',
    props: {
        entry: {
            required: true,
            type: Object
        }
    },
    components: {
        AuditEntryIcon,
        AuditEntryVerbose
    }
}
</script>
