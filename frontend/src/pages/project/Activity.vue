<template>
    <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" logType="project" @load-entries="loadEntries">
        <template #title>
            <SectionTopMenu hero="Audit Log" info="Recorded events that have taken place in within this application." />
        </template>
        <template #extraFilters>
            <FormHeading class="mt-4">Application Instance:</FormHeading>
            <div data-el="filter-event-types">
                <ff-dropdown v-model="auditFilters.instance" class="w-full">
                    <ff-dropdown-option label="Show All" :value="undefined" />
                    <ff-dropdown-option
                        v-for="instance in auditFilters.instances" :key="instance.id"
                        :label="instance.name" :value="instance.id"
                    />
                </ff-dropdown>
            </div>
        </template>
    </AuditLogBrowser>
</template>

<script>
import { mapState } from 'vuex'

import FormHeading from '../../components/FormHeading'
import SectionTopMenu from '../../components/SectionTopMenu'
import AuditLogBrowser from '../../components/audit-log/AuditLogBrowser'

import ProjectAPI from '@/api/project'
import TeamAPI from '@/api/team'

export default {
    name: 'ProjectAuditLog',
    components: {
        SectionTopMenu,
        AuditLogBrowser,
        FormHeading
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
            logEntries: [],
            users: [],
            auditFilters: {
                instance: null,
                instances: []
            }
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    watch: {
        project () {
            this.$refs.AuditLog?.loadEntries()
            this.loadInstances()
        },
        team: 'loadUsers'
    },
    created () {
        this.loadUsers()
        this.loadInstances()
    },
    methods: {
        async loadUsers () {
            this.users = (await TeamAPI.getTeamMembers(this.team.id)).members
        },
        async loadEntries (params = new URLSearchParams(), cursor = undefined) {
            const projectId = this.project.id
            if (projectId) {
                // TODO Currently this filter effectively does nothing as each application contains only one instance
                if (this.auditFilters.instance) {
                    params.append('instance', this.auditFilters.instance)
                }

                this.logEntries = (await ProjectAPI.getProjectAuditLog(projectId, params, cursor, 200)).log
            }
        },
        async loadInstances () {
            const projectId = this.project.id
            if (projectId) {
                this.auditFilters.instances = await ProjectAPI.getProjectInstances(projectId)
            }
        }
    }
}
</script>
