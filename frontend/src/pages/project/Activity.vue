<template>
    <AuditLogShared ref="AuditLog" :team="team" :logEntries="logEntries" logType="project" @load-entries="loadEntries">
        <template #title>
            <SectionTopMenu hero="Application Audit Log" info="Recorded events that have taken place in within this application." />
        </template>
    </AuditLogShared>
</template>

<script>
import { mapState } from 'vuex'

import SectionTopMenu from '../../components/SectionTopMenu.vue'

import ProjectAPI from '@/api/project'

import AuditLogShared from '@/pages/instance/AuditLogShared'

export default {
    name: 'ProjectAuditLog',
    components: {
        SectionTopMenu,
        AuditLogShared
    },
    inheritAttrs: false,
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            logEntries: []
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    watch: {
        project () {
            this.$refs.AuditLog?.loadEntries()
        }
    },
    methods: {
        loadEntries: async function (params = new URLSearchParams(), cursor = undefined) {
            console.log(this.project)
            const projectId = this.project.id
            if (projectId) {
                this.logEntries = (await ProjectAPI.getProjectAuditLog(projectId, params, cursor, 200)).log
            }
        }
    }
}
</script>
