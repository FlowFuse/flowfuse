<template>
    <div class="ff-audit-entry ml-8 flex py-3 border-b text-base">
        <!-- Time -->
        <div class="w-20 text-gray-500">{{ entry.time }}</div>
        <!-- Icon -->
        <div class="w-12 flex justify-center">
            <AuditEntryIcon :event="entry.event"></AuditEntryIcon>
        </div>
        <!-- Event -->
        <div class="flex-grow flex flex-col">
            <AuditEntryVerbose :entry="entry"></AuditEntryVerbose>
        </div>
        <!-- User/Trigger -->
        <div v-if="entry.trigger.name !== 'unknown'" class="ff-audit-entry-trigger">
            <div>{{ entry.trigger.name }}</div>
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
