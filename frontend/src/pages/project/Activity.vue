<template>
    <AuditLog :entries="entries" />
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
            loading: true,
            entries: null
        }
    },
    watch: {
        project: function () {
            this.loadLog()
        }
    },
    methods: {
        loadItems: async function (projectId, cursor) {
            return projectApi.getProjectAuditLog(projectId, cursor)
        },
        async loadLog () {
            const audit = await this.loadItems(this.project.id)
            this.entries = audit.log
        }
    },
    components: {
        AuditLog
    }
}
</script>
