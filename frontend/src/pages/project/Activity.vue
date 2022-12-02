<template>
    <AuditLog :entity="project" :loadItems="loadItems" />
</template>

<script>
import projectApi from '@/api/project'
import AuditLog from '@/components/audit-log/AuditLog'

export default {
    name: 'ProjectAuditLog',
    props: ['project', 'is-visiting-admin'],
    emits: ['project-start', 'project-delete', 'project-suspend', 'project-restart', 'projectUpdated'],
    data () {
        return {
            loading: true
        }
    },
    methods: {
        loadItems: async function (projectId, cursor) {
            return projectApi.getProjectAuditLog(projectId, cursor)
        }
    },
    components: {
        AuditLog
    }
}
</script>
