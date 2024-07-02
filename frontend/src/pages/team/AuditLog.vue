<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Audit Log">
                <template #context>
                    Detailed recording of all activity at the team-level.
                </template>
            </ff-page-header>
        </template>
        <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" logType="team" @load-entries="loadEntries">
            <template #title>
                <SectionTopMenu hero="Audit Log" info="Recorded events that have taken place in this Team." />
            </template>
        </AuditLogBrowser>
    </ff-page>
</template>

<script>
import TeamAPI from '../../api/team.js'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import AuditLogBrowser from '../../components/audit-log/AuditLogBrowser.vue'

import permissionsMixin from '../../mixins/Permissions.js'

export default {
    name: 'TeamAuditLog',
    components: {
        SectionTopMenu,
        AuditLogBrowser
    },
    mixins: [permissionsMixin],
    data () {
        return {
            logEntries: [],
            users: []
        }
    },
    watch: {
        team: 'triggerLoad',
        teamMembership: 'triggerLoad'
    },
    created () {
        this.loadUsers()
    },
    methods: {
        async loadUsers () {
            this.users = (await TeamAPI.getTeamMembers(this.team.id)).members
        },
        async loadEntries (params = new URLSearchParams(), cursor = undefined) {
            if (!this.hasPermission('team:audit-log')) {
                return this.$router.push({ path: `/team/${this.team.slug}/overview` })
            }

            const teamId = this.team.id
            if (teamId) {
                this.logEntries = (await TeamAPI.getTeamAuditLog(teamId, params, cursor, 200)).log
            }
        },
        triggerLoad () {
            this.$refs.AuditLog?.loadEntries()
            this.loadUsers()
        }
    }
}
</script>
