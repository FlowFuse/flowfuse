<template>
    <AuditLog :entity="project" :loadItems="loadItems" />
</template>

<script>
import projectApi from '@/api/project'
import AuditLog from '@/components/AuditLog'

export default {
    name: 'ProjectAuditLog',
    props:[ "project" ],
    methods: {
        loadItems: async function(projectId,cursor) {
            return await projectApi.getProjectAuditLog(projectId,cursor);
        }
    },
    components: {
        AuditLog
    }
}
</script>
