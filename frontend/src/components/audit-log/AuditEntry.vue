<template>
    <div class="ff-audit-entry py-1 lg:py-3 border-b text-base">
        <!-- Time -->
        <div class="ff-audit-entry-time">{{ entry.time }}</div>

        <!-- Icon -->
        <div class="ff-audit-entry-info flex items-center gap-4 lg:ml-3">
            <div class="ff-audit-entry-icon text-center">
                <AuditEntryIcon v-if="entry.body?.error" event="error" />
                <AuditEntryIcon v-else :event="entry.event" />
            </div>
            <!-- Event -->
            <div class="ff-audit-entry-description">
                <AuditEntryVerbose :entry="entry" />
            </div>
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
