<template>
    <p class="mb-4 italic text-red-800">This is a history of all audit events on the project. This covers all audit
    event log entries from the Node-RED instance as well as any audit-events from
    the forge platform (start/stop/etc).</p>
</template>

<script>

export default {
    name: 'ProjectAuditLog',
    props:[ "project" ]
}
</script>
